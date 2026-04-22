import chess
import asyncio
import random

from bots.base_bot import BaseBot
from bots.random_bot import RandomBot
from bots.stockfish_max_strength import StockfishBot


class ChessBot:

    def __init__(self, color, elo, bot_type="human_bot_trained"):
        self.color = color
        self.elo = elo
        self.bot_type = bot_type
        self.position_id = 0
        self.last_acted_fen = None
        self.engine = self._build_engine()

    def _build_engine(self):
        if self.bot_type == "maia2":
            from bots.maia2_bot import MaiaBot
            return MaiaBot(self.elo)
        if self.bot_type == "retrieval_model":
            from bots.retrieval_model import RetrievalBot
            return RetrievalBot(self.elo)
        from bots.human_bot_trained import HumanBotTrainedPolicy
        return HumanBotTrainedPolicy(self.elo)

    async def on_fen(self, fen, clock_state, send_move):

        self.board = chess.Board(fen)

        self.position_id += 1
        pid = self.position_id

        if not self._my_turn():
            return

        # Avoid duplicate decisions for the same position when warm-start
        # and SSE both provide the current FEN.
        if fen == self.last_acted_fen:
            return

        if pid != self.position_id:
            return

        move_payload = self.compute_move(self.board, clock_state)
        
        if pid != self.position_id:
            return

        await send_move(move_payload)
        self.last_acted_fen = fen

    def _my_turn(self):

        if self.board.turn == chess.WHITE and self.color == "w":
            return True

        if self.board.turn == chess.BLACK and self.color == "b":
            return True

        return False

    def _retrieve_times(self, clock):

        if not clock:
            return 0, 0

        if isinstance(clock, dict) and "state" in clock and isinstance(clock["state"], dict):
            whiteMs = clock["state"].get("whiteMs", 0)
            blackMs = clock["state"].get("blackMs", 0)
        else:
            whiteMs = clock.get("white", 0)
            blackMs = clock.get("black", 0)

        return whiteMs, blackMs

    def compute_move(self, board, clock_state):

        whiteMs, blackMs = self._retrieve_times(clock_state)

        move = self.engine.choose_move(board, whiteMs, blackMs)
        payload = {"move": move.uci()}
        if self.bot_type == "retrieval_model" and hasattr(self.engine, "get_last_top_choices"):
            payload["retrieval_top_choices"] = self.engine.get_last_top_choices()
        return payload