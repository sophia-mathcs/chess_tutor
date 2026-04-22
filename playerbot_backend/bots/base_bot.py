class BaseBot:
    def __init__(self, elo: int):
        self.elo = elo

    @staticmethod
    def compute_think_time(board, whiteMs, blackMs):
        if board.turn:
            my_time = whiteMs or 0
        else:
            my_time = blackMs or 0
        return min(max((my_time / 1000.0) * 0.03, 0.05), 2.0)

    def choose_move(self, board, whiteMs, blackMs):
        raise NotImplementedError