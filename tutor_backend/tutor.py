import os
import chess
import chess.engine
try:
    from openai import OpenAI
except Exception:
    OpenAI = None

ENGINE_PATH = "../engines/stockfish/stockfish-macos-m1-apple-silicon"
TUTOR_DEPTH = 12

PIECE_VALUES = {
    chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0,
}


class TutorAnalyzer:
    def __init__(self):
        self.engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)
        self.llm = None
        api_key = os.environ.get("DUKE_API_KEY")
        if OpenAI is not None and api_key:
            self.llm = OpenAI(
                api_key=api_key,
                base_url="https://litellm.oit.duke.edu/v1",
            )

    def analyze(self, before_fen: str, after_fen: str, played_move: str) -> str:
        before_board = chess.Board(before_fen)
        after_board  = chess.Board(after_fen)
        mover = before_board.turn

        info_before = self.engine.analyse(before_board, chess.engine.Limit(depth=TUTOR_DEPTH))
        info_after  = self.engine.analyse(after_board,  chess.engine.Limit(depth=TUTOR_DEPTH))

        eval_before = info_before["score"].white().score(mate_score=10000)
        eval_after  = info_after["score"].white().score(mate_score=10000)
        best_move   = info_before["pv"][0].uci() if info_before.get("pv") else "none"
        pv          = [m.uci() for m in info_before.get("pv", [])[:5]]

        # Delta from mover's perspective (negative = cp lost)
        sign = 1 if mover == chess.WHITE else -1
        delta = (eval_after - eval_before) * sign
        classification = self._classify(delta)

        facts = self._board_facts(before_board)
        if self.llm is None:
            return self._fallback_explanation(
                played_move, best_move, eval_before, eval_after, delta, classification, facts
            )

        return self._call_llm(
            before_fen, played_move, best_move, pv,
            eval_before, eval_after, delta, classification, facts
        )

    def _fallback_explanation(
        self, played_move, best_move, eval_before, eval_after, delta, classification, facts
    ) -> str:
        mover = facts["turn"]
        cp_lost = max(0, int(-delta))
        if classification == "fine":
            return (
                f"{mover} played {played_move}, and the move is sound. "
                f"The evaluation changed from {eval_before/100:+.2f} to {eval_after/100:+.2f}. "
                f"The engine best move is {best_move}; compare it to learn a cleaner plan."
            )
        return (
            f"{mover} played {played_move}, classified as a {classification} "
            f"(about {cp_lost} centipawns lost). "
            f"The position evaluation shifted from {eval_before/100:+.2f} to {eval_after/100:+.2f}. "
            f"A stronger continuation was {best_move}; review that line to improve this phase."
        )

    def _classify(self, delta: int) -> str:
        cp_lost = -delta
        if cp_lost > 100: return "blunder"
        if cp_lost > 50:  return "mistake"
        if cp_lost > 20:  return "inaccuracy"
        return "fine"

    def _board_facts(self, board: chess.Board) -> dict:
        wk = board.king(chess.WHITE)
        bk = board.king(chess.BLACK)
        pieces = sum(
            len(board.pieces(pt, c))
            for pt in [chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]
            for c in [chess.WHITE, chess.BLACK]
        )
        if board.fullmove_number <= 10:
            phase = "opening"
        elif pieces <= 6:
            phase = "endgame"
        else:
            phase = "middlegame"

        wm = sum(PIECE_VALUES[p.piece_type] for p in board.piece_map().values() if p.color == chess.WHITE)
        bm = sum(PIECE_VALUES[p.piece_type] for p in board.piece_map().values() if p.color == chess.BLACK)

        return {
            "turn": "White" if board.turn == chess.WHITE else "Black",
            "phase": phase,
            "white_material": wm,
            "black_material": bm,
            "white_king": chess.square_name(wk) if wk is not None else "?",
            "black_king": chess.square_name(bk) if bk is not None else "?",
            "white_king_moved": wk != chess.E1,
            "black_king_moved": bk != chess.E8,
        }

    def _call_llm(self, before_fen, played_move, best_move, pv,
                  eval_before, eval_after, delta, classification, facts) -> str:
        def fmt(cp):
            return f"{cp / 100:+.2f}"

        system = (
            "You are a chess coach. You are given verified engine analysis and board facts. "
            "Do not invent tactical details not present in the data. "
            "Explain clearly in 3-5 sentences suitable for a club-level player."
        )

        user = f"""Position before move (FEN): {before_fen}
Move played: {played_move} | Classification: {classification.upper()}

Engine analysis:
  Eval before (White perspective): {fmt(eval_before)}
  Eval after  (White perspective): {fmt(eval_after)}
  Eval change for mover: {fmt(delta)} cp
  Best move instead: {best_move}
  Principal variation: {' '.join(pv) if pv else 'n/a'}

Board facts:
  Side to move: {facts['turn']} | Phase: {facts['phase']}
  White material: {facts['white_material']} cp | Black material: {facts['black_material']} cp
  White king: {facts['white_king']} (king has moved: {facts['white_king_moved']})
  Black king: {facts['black_king']} (king has moved: {facts['black_king_moved']})

Explain the move, why it was {classification}, and what the better plan was."""

        resp = self.llm.chat.completions.create(
            model="GPT 4.1",
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.4,
            max_tokens=300,
        )
        return resp.choices[0].message.content.strip()

    def quit(self):
        try:
            self.engine.quit()
        except Exception:
            pass
