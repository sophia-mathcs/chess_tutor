import chess
import chess.engine
import numpy as np
import random
import math
import warnings

from bots.base_bot import BaseBot
from maia2 import model, inference

warnings.filterwarnings("ignore")


############################################
# Paths
############################################

MAIA_PATH = "../engines/maia2"
STOCKFISH_PATH = "../engines/stockfish/stockfish-macos-m1-apple-silicon"


############################################
# Utility functions
############################################

def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def blunder_prob(elo):
    return max(0.0, 0.4 / (1 + math.exp((elo - 2000) / 180)))


def stockfish_prob(elo):
    s = 400
    sig = 1 / (1 + math.exp(-(elo - 1800) / s))
    return 0.3 + 0.7 * sig


def maia_topk(elo):
    k = 12 - 10 * (elo / 3000)
    return max(2, int(round(k)))


def stockfish_topk(elo):
    if elo < 1600:
        return 3
    elif elo < 2200:
        return 2
    else:
        return 1


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

    def sample_move(self, board, topk):

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

        if board.turn == chess.WHITE:
            my_time = whiteMs
        else:
            my_time = blackMs

        my_time_sec = my_time / 1000.0

        think_time = min(max(my_time_sec * 0.03, 0.05), 2.0)

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

class HumanBot(BaseBot):

    def __init__(self, elo):

        super().__init__(elo)

        self.elo = elo

        self.maia_blunder = MaiaEngine(elo - 300)
        self.maia_main = MaiaEngine(elo)

        self.stockfish = StockfishEngine(elo)

    def choose_move(self, board, whiteMs, blackMs):

        r1 = random.random()

        if r1 < blunder_prob(self.elo):

            return self.maia_blunder.sample_move(
                board,
                maia_topk(self.elo)
            )

        r2 = random.random()

        if r2 < stockfish_prob(self.elo):

            return self.stockfish.sample_move(
                board,
                stockfish_topk(self.elo),
                whiteMs,
                blackMs
            )

        return self.maia_main.sample_move(
            board,
            maia_topk(self.elo)
        )