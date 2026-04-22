import chess
import chess.engine
import numpy as np
import random
import time
import warnings
import os
import shutil

from bots.base_bot import BaseBot
from maia2 import model, inference

from train_bot.load_policy import load_policy
from train_bot.feature_extractor import build_features

warnings.filterwarnings("ignore")

from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent   # chess_tutor/
engines_root = project_root.parent                              # Sta 561 Chess/


############################################
# Paths
############################################

MAIA_PATH = f"{engines_root}/engines/maia2"
POLICY_PATH = f"{project_root}/playerbot_backend/models/engine_policy_v1.npz"


def resolve_stockfish_path():
    env_path = os.environ.get("STOCKFISH_PATH")
    if env_path and Path(env_path).exists():
        return env_path

    candidates = [
        Path(f"{engines_root}/engines/stockfish/stockfish-windows-x86-64-avx2.exe"),
        Path(f"{engines_root}/engines/stockfish/stockfish"),
        Path(f"{engines_root}/engines/stockfish/stockfish-macos"),
        Path("/opt/homebrew/bin/stockfish"),
        Path("/usr/local/bin/stockfish"),
    ]

    which_path = shutil.which("stockfish")
    if which_path:
        candidates.insert(0, Path(which_path))

    for path in candidates:
        if path.exists():
            return str(path)

    raise FileNotFoundError(
        "Stockfish binary not found. Set STOCKFISH_PATH or install stockfish."
    )


STOCKFISH_PATH = resolve_stockfish_path()


############################################
# Utility
############################################

def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def maia_topk(elo):

    k = 12 - 10 * (elo / 3000)

    return max(2, int(round(k)))


def stockfish_topk(elo):

    if elo < 1600:
        return 3

    elif elo < 2200:
        return 2

    return 1


def evaluate_position(engine, board):

    info = engine.analyse(
        board,
        chess.engine.Limit(time=0.02),
        multipv=2
    )

    if not isinstance(info, list):
        info = [info]

    evals = []

    for entry in info:

        score = entry["score"].white().score(mate_score=10000)

        if score is None:
            score = 0

        evals.append(score)

    best = evals[0]

    second = evals[1] if len(evals) > 1 else best

    complexity = abs(best - second)

    return best, complexity


############################################
# Maia Engine
############################################

class MaiaEngine:

    shared_model = None
    shared_prepared = None

    def __init__(self, elo, device="cpu"):

        self.elo = clamp(elo, 0, 2000)

        if MaiaEngine.shared_model is None:

            print("Loading Maia-2 model...")

            MaiaEngine.shared_model = model.from_pretrained(
                type="rapid",
                device=device,
                save_root=MAIA_PATH
            )

            MaiaEngine.shared_prepared = inference.prepare()

            print("Maia-2 loaded.")

        self.model = MaiaEngine.shared_model
        self.prepared = MaiaEngine.shared_prepared

        self.elo_self = self.elo
        self.elo_oppo = self.elo

    def sample_move(self, board, topk, whiteMs=None, blackMs=None):
        think_time = BaseBot.compute_think_time(board, whiteMs, blackMs)
        time.sleep(think_time)

        fen = board.fen()

        move_probs, win_prob = inference.inference_each(
            self.model,
            self.prepared,
            fen,
            self.elo_self,
            self.elo_oppo
        )

        legal_moves = [m.uci() for m in board.legal_moves]

        legal_probs = {
            move: prob
            for move, prob in move_probs.items()
            if move in legal_moves
        }

        if not legal_probs:
            return random.choice(list(board.legal_moves))

        sorted_moves = sorted(
            legal_probs.items(),
            key=lambda x: x[1],
            reverse=True
        )

        sorted_moves = sorted_moves[:topk]

        moves = [m for m, _ in sorted_moves]
        probs = np.array([p for _, p in sorted_moves])

        probs = probs / probs.sum()

        chosen = np.random.choice(moves, p=probs)

        return chess.Move.from_uci(chosen)


############################################
# Stockfish Engine
############################################

class StockfishEngine:

    def __init__(self, elo):

        self.engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

        self.engine.configure({
            "Threads": 1,
            "Hash": 128,
            "UCI_LimitStrength": True,
            "UCI_Elo": np.clip(int(elo), 1320, 3500)
        })

        self.elo = elo

    def sample_move(self, board, topk, whiteMs, blackMs):
        think_time = BaseBot.compute_think_time(board, whiteMs, blackMs)

        analysis = self.engine.analyse(
            board,
            chess.engine.Limit(time=think_time),
            multipv=topk
        )

        if not isinstance(analysis, list):
            analysis = [analysis]

        moves = [entry["pv"][0] for entry in analysis]

        return random.choice(moves)


############################################
# HumanBot
############################################

class HumanBotTrainedPolicy(BaseBot):

    def __init__(self, elo):

        super().__init__(elo)

        self.elo = elo

        self.maia_blunder = MaiaEngine(elo - 300)
        self.maia_main = MaiaEngine(elo)

        self.stockfish = StockfishEngine(elo)

        self.policy = load_policy(POLICY_PATH)

    def choose_move(self, board, whiteMs, blackMs):

        eval_cp, complexity = evaluate_position(
            self.stockfish.engine,
            board
        )

        features = build_features(
            board,
            self.elo,
            eval_cp,
            complexity
        )

        engine_choice = self.policy.sample(features)

        if engine_choice == "blunder":

            return self.maia_blunder.sample_move(
                board,
                maia_topk(self.elo),
                whiteMs,
                blackMs
            )

        if engine_choice == "stockfish":

            return self.stockfish.sample_move(
                board,
                stockfish_topk(self.elo),
                whiteMs,
                blackMs
            )

        return self.maia_main.sample_move(
            board,
            maia_topk(self.elo),
            whiteMs,
            blackMs
        )