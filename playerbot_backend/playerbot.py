import chess
import asyncio

from bots.human_bot import HumanBot


class ChessBot:

    def __init__(self, color, elo):
        self.color = color
        self.elo = elo
        self.position_id = 0
        self.last_fen = None
        self.engine = HumanBot(elo)

    async def on_fen(self, fen, clock_state, send_move):
        # SSE may push the same position repeatedly; ignore duplicates so
        # think delay does not constantly cancel the pending move.
        if fen == self.last_fen:
            return

        self.last_fen = fen
        self.board = chess.Board(fen)

        self.position_id += 1
        pid = self.position_id

        if not self._my_turn():
            return

        if pid != self.position_id:
            return

        whiteMs, blackMs, clock_enabled = self._retrieve_times(clock_state)
        think_seconds = self.engine.estimate_think_time(
            self.board,
            whiteMs,
            blackMs,
            use_clock=clock_enabled
        )
        if think_seconds > 0:
            await asyncio.sleep(think_seconds)

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
            return 0, 0, False

        whiteMs = clock.get("white", 0)
        blackMs = clock.get("black", 0)
        # Treat clock as enabled when server has non-zero configured time.
        clock_enabled = (whiteMs > 0 or blackMs > 0)

        return whiteMs, blackMs, clock_enabled

    def compute_move(self, board, clock_state):

        whiteMs, blackMs, _ = self._retrieve_times(clock_state)

        move = self.engine.choose_move(board, whiteMs, blackMs)

        return move.uci()