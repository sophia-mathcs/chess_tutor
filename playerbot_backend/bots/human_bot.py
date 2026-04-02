import random
from .base_bot import BaseBot

class HumanBot(BaseBot):

    def choose_move(self, board, whiteMs, blackMs):
        moves = list(board.legal_moves)
        return random.choice(moves)