import chess
import chess.engine
import os
import shutil

from bots.base_bot import BaseBot

from pathlib import Path

root = Path(__file__).resolve().parent.parent.parent.parent


def resolve_stockfish_path():
    env_path = os.environ.get("STOCKFISH_PATH")
    if env_path and Path(env_path).exists():
        return env_path

    candidates = [
        Path(f"{root}/engines/stockfish/stockfish-windows-x86-64-avx2.exe"),
        Path(f"{root}/engines/stockfish/stockfish"),
        Path(f"{root}/engines/stockfish/stockfish-macos"),
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


ENGINE_PATH = resolve_stockfish_path()

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