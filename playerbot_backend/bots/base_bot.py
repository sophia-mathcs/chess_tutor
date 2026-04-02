class BaseBot:
    def __init__(self, elo: int):
        self.elo = elo

    def choose_move(self, board, whiteMs, blackMs):
        raise NotImplementedError