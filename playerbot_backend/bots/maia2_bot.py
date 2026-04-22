import chess
import numpy as np
import time
from pathlib import Path
import warnings

from bots.base_bot import BaseBot
from maia2 import model, inference

import sys
print("SYS", sys.executable)

warnings.filterwarnings("ignore")

from pathlib import Path

root = Path(__file__).resolve().parent.parent.parent.parent

MAIA_PATH = f"{root}/engines/maia2"

class MaiaBot(BaseBot):
    def __init__(self, elo, save_root=MAIA_PATH, device="cpu"):
        """
        elo: elo of 2 players
        save_root: directory to store/load model weights
        """
        super().__init__(elo)
        self.elo_self = elo
        self.elo_oppo = elo

        # Load Maia-2 model
        print("Loading Maia-2...")
        self.model = model.from_pretrained(type="rapid", device=device, save_root=save_root)
        print("Maia-2 loaded.")

        # Prepare inference helper
        self.prepared = inference.prepare()
        print("Inference preped.")

    def choose_move(self, board, whiteMs=None, blackMs=None):
        """
        board: python-chess Board object
        white_ms/black_ms: optional, can be used to adapt Elo or thinking time
        Returns a python-chess Move
        """

        think_time = self.compute_think_time(board, whiteMs, blackMs)
        time.sleep(think_time)

        fen = board.fen()

        # Run inference
        move_probs, win_prob = inference.inference_each(
            self.model,
            self.prepared,
            fen,
            self.elo_self,
            self.elo_oppo
        )

        # Filter to legal moves
        legal_moves = [m.uci() for m in board.legal_moves]
        legal_probs = {move: prob for move, prob in move_probs.items() if move in legal_moves}

        if not legal_probs:
            # fallback random legal move
            return np.random.choice(list(board.legal_moves))

        # Normalize probabilities
        total = sum(legal_probs.values())
        for k in legal_probs:
            legal_probs[k] /= total

        moves = list(legal_probs.keys())
        probs = list(legal_probs.values())

        chosen_uci = np.random.choice(moves, p=probs)
        return chess.Move.from_uci(chosen_uci)