import chess
import asyncio
import random

from bots.base_bot import BaseBot
from bots.random_bot import RandomBot
from bots.stockfish_max_strength import StockfishBot
from bots.maia2_bot import MaiaBot
from bots.human_bot import HumanBot


class ChessBot:

    def __init__(self, color, elo):
        self.color = color
        self.elo = elo
        self.position_id = 0
        self.engine = HumanBot(elo)

    async def on_fen(self, fen, clock_state, send_move):

        self.board = chess.Board(fen)

        self.position_id += 1
        pid = self.position_id

        if not self._my_turn():
            return

        if pid != self.position_id:
            return

        move = self.compute_move(self.board, clock_state)
        
        if pid != self.position_id:
            return

        await send_move(move)

    def _my_turn(self):

        if self.board.turn == chess.WHITE and self.color == "w":
            return True

        if self.board.turn == chess.BLACK and self.color == "b":
            return True

        return False

    def _retrieve_times(self, clock):

        if not clock:
            return 0, 0

        whiteMs = clock.get("white", 0)
        blackMs = clock.get("black", 0)

        return whiteMs, blackMs

    def compute_move(self, board, clock_state):

        whiteMs, blackMs = self._retrieve_times(clock_state)

        move = self.engine.choose_move(board, whiteMs, blackMs)

        return move.uci()