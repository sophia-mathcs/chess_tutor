import chess
import chess.engine
import random

class PlayerBot:
    def __init__(self):
        self.elo = 800
        self.board = chess.Board()
        self.active = False

    def start(self, elo=800):
        """Start the bot with a given Elo (for future use)."""
        self.elo = elo
        self.board.reset()
        self.active = True

    def stop(self):
        """Stop the bot."""
        self.active = False

    def get_move(self, fen, white_time, black_time):
        """Return a random legal move for the current board."""
        if not self.active:
            return None

        self.board.set_fen(fen)
        moves = list(self.board.legal_moves)
        if not moves:
            return None
        move = random.choice(moves)
        return move.uci()