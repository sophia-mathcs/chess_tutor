import math
import pickle
import time
from collections import defaultdict
from pathlib import Path

import chess
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm
try:
    from bots.base_bot import BaseBot
except ModuleNotFoundError:
    from base_bot import BaseBot

PIECE_ORDER = ["P", "N", "B", "R", "Q", "K", "p", "n", "b", "r", "q", "k"]
PIECE_TO_IDX = {p: i for i, p in enumerate(PIECE_ORDER)}

DEFAULT_CSV_PATH = Path(__file__).with_name("games.csv")
DEFAULT_CACHE_PATH = Path(__file__).with_name("retrieval_cache.pkl")

full_fen_index = defaultdict(list)
partial_key_index = defaultdict(list)
all_vectors = np.empty((0, 785), dtype=np.float32)
all_elos = np.empty((0,), dtype=np.int16)
all_records = []


def fen_to_partial_key(board: chess.Board):
    ep = board.ep_square
    ep_str = chess.square_name(ep) if ep is not None else "-"
    return (
        board.board_fen(),
        "w" if board.turn == chess.WHITE else "b",
        board.castling_xfen(),
        ep_str,
    )


def board_to_vector(board: chess.Board):
    vec = np.zeros(12 * 64 + 1 + 4 + 12, dtype=np.float32)
    for square, piece in board.piece_map().items():
        vec[PIECE_TO_IDX[piece.symbol()] * 64 + square] = 1.0

    offset = 12 * 64
    vec[offset] = 1.0 if board.turn == chess.WHITE else 0.0
    offset += 1

    vec[offset + 0] = 1.0 if board.has_kingside_castling_rights(chess.WHITE) else 0.0
    vec[offset + 1] = 1.0 if board.has_queenside_castling_rights(chess.WHITE) else 0.0
    vec[offset + 2] = 1.0 if board.has_kingside_castling_rights(chess.BLACK) else 0.0
    vec[offset + 3] = 1.0 if board.has_queenside_castling_rights(chess.BLACK) else 0.0
    offset += 4

    for i, sym in enumerate(PIECE_ORDER):
        piece_type = chess.Piece.from_symbol(sym).piece_type
        color = chess.WHITE if sym.isupper() else chess.BLACK
        vec[offset + i] = len(board.pieces(piece_type, color))
    return vec


def safe_exp_weight(delta, tau):
    return math.exp(-abs(delta) / tau)


def get_player_elo(board_turn, white_elo, black_elo):
    return int(white_elo) if board_turn == chess.WHITE else int(black_elo)


def get_player_is_winner(board_turn, winner):
    if winner not in ["white", "black"]:
        return 0
    if board_turn == chess.WHITE and winner == "white":
        return 1
    if board_turn == chess.BLACK and winner == "black":
        return 1
    return 0


def _row_to_records(row):
    moves = str(row.moves).split()
    if not moves:
        return []
    board = chess.Board()
    winner = str(row.winner).lower()
    rated = str(row.rated).strip().lower() in ("true", "1", "yes")
    white_elo = int(row.white_rating)
    black_elo = int(row.black_rating)
    out = []
    for san in moves:
        try:
            move = board.parse_san(san)
        except Exception:
            break
        out.append(
            {
                "full_fen": board.fen(),
                "partial_key": fen_to_partial_key(board),
                "board_vec": board_to_vector(board),
                "next_move_uci": move.uci(),
                "player_elo": get_player_elo(board.turn, white_elo, black_elo),
                "player_is_winner": get_player_is_winner(board.turn, winner),
                "rated": rated,
            }
        )
        board.push(move)
    return out


def build_cache_from_csv(csv_path=DEFAULT_CSV_PATH, cache_path=DEFAULT_CACHE_PATH):
    df = pd.read_csv(csv_path)
    records = []
    for row in tqdm(df.itertuples(index=False), total=len(df), desc="Expand games"):
        records.extend(_row_to_records(row))

    _full = defaultdict(list)
    _partial = defaultdict(list)
    vecs, elos, recs = [], [], []
    for rec in tqdm(records, desc="Build indices"):
        _full[rec["full_fen"]].append(rec)
        _partial[rec["partial_key"]].append(rec)
        vecs.append(rec["board_vec"])
        elos.append(rec["player_elo"])
        recs.append(rec)

    payload = {
        "full_fen_index": dict(_full),
        "partial_key_index": dict(_partial),
        "all_vectors": np.stack(vecs) if vecs else np.empty((0, 785), dtype=np.float32),
        "all_elos": np.array(elos, dtype=np.int16) if elos else np.empty((0,), dtype=np.int16),
        "all_records": recs,
    }
    with Path(cache_path).open("wb") as f:
        pickle.dump(payload, f, protocol=pickle.HIGHEST_PROTOCOL)


def load_or_build_cache(csv_path=DEFAULT_CSV_PATH, cache_path=DEFAULT_CACHE_PATH, rebuild=False):
    global full_fen_index, partial_key_index, all_vectors, all_elos, all_records
    cache_path = Path(cache_path)
    if rebuild or not cache_path.exists():
        build_cache_from_csv(csv_path=csv_path, cache_path=cache_path)
    with cache_path.open("rb") as f:
        payload = pickle.load(f)
    full_fen_index = defaultdict(list, payload["full_fen_index"])
    partial_key_index = defaultdict(list, payload["partial_key_index"])
    all_vectors = payload["all_vectors"]
    all_elos = payload["all_elos"]
    all_records = payload["all_records"]

def record_weight(rec, query_elo, board_sim=None,
                  elo_tau=150,
                  winner_bonus=1.15,
                  rated_bonus=1.05):
    """
    单条样本的权重
    """
    w_elo = safe_exp_weight(rec["player_elo"] - query_elo, elo_tau)

    w_sim = board_sim if board_sim is not None else 1.0
    w_win = winner_bonus if rec["player_is_winner"] == 1 else 1.0
    w_rated = rated_bonus if rec["rated"] else 1.0

    return w_elo * w_sim * w_win * w_rated


def aggregate_move_scores(board, candidate_records, query_elo, sims=None):
    """
    对候选样本做加权投票
    重要：过滤非法着法
    """
    legal_moves = list(board.legal_moves)
    legal_uci = set(m.uci() for m in legal_moves)

    move_scores = defaultdict(float)
    move_counts = defaultdict(int)
    move_examples = defaultdict(list)

    for i, rec in enumerate(candidate_records):
        uci = rec["next_move_uci"]

        # Level 3 相似局面里，某些 move 在 query board 上可能不合法，必须过滤
        if uci not in legal_uci:
            continue

        sim = None if sims is None else sims[i]
        w = record_weight(rec, query_elo, board_sim=sim)

        move_scores[uci] += w
        move_counts[uci] += 1
        move_examples[uci].append(rec)

    ranked = sorted(move_scores.items(), key=lambda x: x[1], reverse=True)

    results = []
    total_score = sum(score for _, score in ranked) + 1e-12

    for uci, score in ranked:
        move_obj = chess.Move.from_uci(uci)
        san = board.san(move_obj)
        prob = score / total_score
        results.append({
            "uci": uci,
            "san": san,
            "score": score,
            "prob": prob,
            "count": move_counts[uci],
            "examples": move_examples[uci][:3],
        })

    return results

def retrieve_similar_records(query_board, query_elo, top_n=300, elo_window=200):
    """
    Level 3:
    先按 elo 过滤，再按局面向量余弦相似度检索
    """
    query_vec = board_to_vector(query_board).reshape(1, -1)

    # 先按 elo 窗口筛一遍
    mask = np.abs(all_elos - query_elo) <= elo_window
    if mask.sum() < 30:
        mask = np.abs(all_elos - query_elo) <= max(elo_window, 400)

    candidate_indices = np.where(mask)[0]
    if candidate_indices.size == 0:
        return [], np.array([])
    candidate_vecs = all_vectors[candidate_indices]

    sims = cosine_similarity(query_vec, candidate_vecs)[0]

    order = np.argsort(-sims)[:top_n]
    chosen_indices = candidate_indices[order]
    chosen_sims = sims[order]

    chosen_records = [all_records[idx] for idx in chosen_indices]
    return chosen_records, chosen_sims

def recommend_move(
    query_fen,
    query_elo,
    min_exact_samples=5,
    min_partial_samples=5,
    top_k=5
):
    if all_vectors.shape[0] == 0:
        raise RuntimeError("Cache not loaded. Call load_or_build_cache() first.")
    board = chess.Board(query_fen)

    # --------------------------
    # Level 1: exact full FEN
    # --------------------------
    exact_candidates = full_fen_index.get(board.fen(), [])

    exact_candidates = [
        r for r in exact_candidates
        if abs(r["player_elo"] - query_elo) <= 100
    ]
    if len(exact_candidates) < min_exact_samples:
        exact_candidates = [
            r for r in full_fen_index.get(board.fen(), [])
            if abs(r["player_elo"] - query_elo) <= 200
        ]

    if len(exact_candidates) >= min_exact_samples:
        results = aggregate_move_scores(board, exact_candidates, query_elo)
        return {
            "level": "Level 1: exact FEN",
            "num_candidates": len(exact_candidates),
            "results": results[:top_k]
        }

    # --------------------------
    # Level 2: partial key
    # --------------------------
    partial_key = fen_to_partial_key(board)
    partial_candidates = partial_key_index.get(partial_key, [])

    partial_candidates = [
        r for r in partial_candidates
        if abs(r["player_elo"] - query_elo) <= 100
    ]
    if len(partial_candidates) < min_partial_samples:
        partial_candidates = [
            r for r in partial_key_index.get(partial_key, [])
            if abs(r["player_elo"] - query_elo) <= 200
        ]

    if len(partial_candidates) >= min_partial_samples:
        results = aggregate_move_scores(board, partial_candidates, query_elo)
        return {
            "level": "Level 2: same piece placement/rights",
            "num_candidates": len(partial_candidates),
            "results": results[:top_k]
        }

    # --------------------------
    # Level 3: similar positions
    # --------------------------
    sim_candidates, sims = retrieve_similar_records(board, query_elo, top_n=300, elo_window=200)
    results = aggregate_move_scores(board, sim_candidates, query_elo, sims=sims)

    return {
        "level": "Level 3: similar positions",
        "num_candidates": len(sim_candidates),
        "results": results[:top_k]
    }

def pretty_print_recommendation(rec_output):
    print("Matched Level:", rec_output["level"])
    print("Candidate Samples:", rec_output["num_candidates"])
    print("=" * 60)

    for i, item in enumerate(rec_output["results"], 1):
        print(f"Top {i}: {item['san']}  | UCI={item['uci']}")
        print(f"       score={item['score']:.4f}, prob={item['prob']:.4%}, count={item['count']}")
        print("-" * 60)


class RetrievalBot(BaseBot):
    def __init__(self, elo):
        super().__init__(elo)
        self.elo = int(elo)
        self.last_top_choices = []
        load_or_build_cache()

    def choose_move(self, board, whiteMs=None, blackMs=None):
        think_time = self.compute_think_time(board, whiteMs, blackMs)
        time.sleep(think_time)

        output = recommend_move(board.fen(), self.elo, top_k=5)
        results = output.get("results", [])
        self.last_top_choices = [
            {
                "uci": item.get("uci"),
                "san": item.get("san"),
                "prob": float(item.get("prob", 0.0)),
            }
            for item in results[:3]
        ]

        if not results:
            legal = list(board.legal_moves)
            if not legal:
                raise RuntimeError("No legal moves available for retrieval bot.")
            # Deterministic fallback when retrieval has no candidates.
            return legal[0]

        # Always follow Top-1 move from retrieval ranking.
        return chess.Move.from_uci(results[0]["uci"])

    def get_last_top_choices(self):
        return self.last_top_choices