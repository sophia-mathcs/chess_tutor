import chess
import asyncio
import random


class ChessBot:

    def __init__(self, color, elo):
        self.color = color
        self.elo = elo
        self.position_id = 0

    async def on_fen(self, fen, clock_state, send_move):

        self.board = chess.Board(fen)

        self.position_id += 1
        pid = self.position_id

        if not self._my_turn():
            return

        think_time = self._compute_think_time(clock_state)

        await asyncio.sleep(think_time)

        if pid != self.position_id:
            return

        move = self.compute_move()

        await send_move(move)

    def _my_turn(self):

        if self.board.turn == chess.WHITE and self.color == "w":
            return True

        if self.board.turn == chess.BLACK and self.color == "b":
            return True

        return False

    def _compute_think_time(self, clock):

        if not clock:
            return random.uniform(0.4, 1.0)

        white = clock.get("white", 0)
        black = clock.get("black", 0)

        my_time = white if self.color == "w" else black

        if my_time > 120:
            return random.uniform(0.5, 1.5)

        if my_time > 30:
            return random.uniform(0.3, 0.9)

        return random.uniform(0.1, 0.4)

    def compute_move(self):

        moves = list(self.board.legal_moves)

        move = random.choice(moves)

        self.board.push(move)

        return move.uci()