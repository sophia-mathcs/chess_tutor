import chess
import chess.engine

from bots.base_bot import BaseBot

ENGINE_PATH = "../engines/stockfish/stockfish-macos-m1-apple-silicon"

class StockfishBot(BaseBot):

    def __init__(self, elo, stockfish_path=ENGINE_PATH):
        super().__init__(elo)

        self.engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)

        # maximum strength
        self.engine.configure({
            "Threads": 1,
            "Hash": 128
        })

    def choose_move(self, board, whiteMs, blackMs):

        # determine remaining time
        if board.turn == chess.WHITE:
            my_time = whiteMs
        else:
            my_time = blackMs

        # convert ms to seconds
        my_time_sec = my_time / 1000.0

        # simple time policy
        think_time = min(max(my_time_sec * 0.03, 0.05), 2.0)

        result = self.engine.play(
            board,
            chess.engine.Limit(time=think_time)
        )

        return result.move