import os
import chess
import chess.engine
from openai import OpenAI

ENGINE_PATH = "../../engines/stockfish/stockfish-windows-x86-64-avx2.exe"
TUTOR_DEPTH = 12

PIECE_VALUES = {
    chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0,
}


class TutorAnalyzer:
    def __init__(self):
        self.engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)
        self.llm = OpenAI(
            api_key="sk-2ZydGeXgPd_MAmFNHJiVQw",
            base_url="https://litellm.oit.duke.edu/v1",
        )
        self._conv_messages = []

    def analyze(self, before_fen: str, after_fen: str, played_move: str, novice: bool = False) -> str:
        before_board = chess.Board(before_fen)
        after_board  = chess.Board(after_fen)
        mover = before_board.turn

        info_before = self.engine.analyse(before_board, chess.engine.Limit(depth=TUTOR_DEPTH))
        info_after  = self.engine.analyse(after_board,  chess.engine.Limit(depth=TUTOR_DEPTH))

        eval_before = info_before["score"].white().score(mate_score=10000)
        eval_after  = info_after["score"].white().score(mate_score=10000)
        best_move   = info_before["pv"][0].uci() if info_before.get("pv") else "none"
        pv          = [m.uci() for m in info_before.get("pv", [])[:5]]

        sign = 1 if mover == chess.WHITE else -1
        delta = (eval_after - eval_before) * sign
        classification = self._classify(delta)

        facts      = self._board_facts(before_board)
        move_facts = self._move_facts(before_board, played_move, best_move)
        legal_sans = self._legal_moves_san(before_board)

        return self._call_llm(before_fen, played_move, best_move, pv,
                              eval_before, eval_after, delta, classification,
                              facts, move_facts, legal_sans, novice)

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

    def _move_facts(self, before_board: chess.Board, move_uci: str, best_move_uci: str) -> dict:
        move = chess.Move.from_uci(move_uci)
        mover = before_board.turn
        opponent = not mover

        piece = before_board.piece_at(move.from_square)
        piece_name = chess.piece_name(piece.piece_type) if piece else "unknown"

        captured = before_board.piece_at(move.to_square)
        capture_name = chess.piece_name(captured.piece_type) if captured else None

        dest_attacked = before_board.is_attacked_by(opponent, move.to_square)

        after_board = before_board.copy()
        after_board.push(move)
        gives_check = after_board.is_check()

        en_prise = []
        for sq, p in after_board.piece_map().items():
            if p.color == mover:
                if after_board.is_attacked_by(opponent, sq) and not after_board.is_attacked_by(mover, sq):
                    en_prise.append(f"{chess.piece_name(p.piece_type)} on {chess.square_name(sq)}")

        best_facts = None
        if best_move_uci and best_move_uci != "none":
            bm = chess.Move.from_uci(best_move_uci)
            bp = before_board.piece_at(bm.from_square)
            bc = before_board.piece_at(bm.to_square)
            bb = before_board.copy()
            bb.push(bm)
            best_facts = {
                "piece": chess.piece_name(bp.piece_type) if bp else "unknown",
                "from": chess.square_name(bm.from_square),
                "to": chess.square_name(bm.to_square),
                "captures": chess.piece_name(bc.piece_type) if bc else None,
                "gives_check": bb.is_check(),
            }

        return {
            "piece": piece_name,
            "from": chess.square_name(move.from_square),
            "to": chess.square_name(move.to_square),
            "captures": capture_name,
            "dest_was_attacked": dest_attacked,
            "en_prise_after": en_prise,
            "gives_check": gives_check,
            "best_move_facts": best_facts,
        }

    def _legal_moves_san(self, board: chess.Board) -> list[str]:
        return [board.san(m) for m in board.legal_moves]

    def _call_llm(self, before_fen, played_move, best_move, pv,
                  eval_before, eval_after, delta, classification,
                  facts, move_facts, legal_sans, novice=False) -> str:
        def fmt(cp):
            return f"{cp / 100:+.2f}"

        def move_desc(mf):
            parts = [f"{mf['piece'].capitalize()} {mf['from']}→{mf['to']}"]
            if mf["captures"]:
                parts.append(f"captures {mf['captures']}")
            if mf["gives_check"]:
                parts.append("gives check")
            return ", ".join(parts)

        mf = move_facts
        played_desc = move_desc(mf)
        if mf["dest_was_attacked"]:
            played_desc += " [destination was controlled by opponent]"

        en_prise_str = ", ".join(mf["en_prise_after"]) if mf["en_prise_after"] else "none"

        best_desc = move_desc(mf["best_move_facts"]) if mf["best_move_facts"] else best_move

        system = (
            "You are a chess coach. You are given verified engine analysis, board facts, and tactical details "
            "computed directly from the position. Do not invent tactical details not present in the data. "
            "When suggesting alternative moves, only recommend moves from the legal moves list provided. "
            "Explain clearly in 3-5 sentences. Answer in plain prose — no headers, no bullet points, no markdown."
        )

        novice_line = (
            "\nNote: explain this as if teaching a complete beginner — use simple language and define any chess terms you use."
        ) if novice else ""

        user = f"""Position before move (FEN): {before_fen}
Move played: {played_move} | Classification: {classification.upper()}

Engine analysis:
  Eval before (White perspective): {fmt(eval_before)}
  Eval after  (White perspective): {fmt(eval_after)}
  Eval change for mover: {fmt(delta)} cp
  Best move instead: {best_move}
  Principal variation: {' '.join(pv) if pv else 'n/a'}

Move details:
  Played: {played_desc}
  Pieces left en prise after move: {en_prise_str}
  Best move: {best_desc}

Board facts:
  Side to move: {facts['turn']} | Phase: {facts['phase']}
  White material: {facts['white_material']} cp | Black material: {facts['black_material']} cp
  White king: {facts['white_king']} (has moved: {facts['white_king_moved']})
  Black king: {facts['black_king']} (has moved: {facts['black_king_moved']})

Legal moves available before the move was played:
  {', '.join(legal_sans)}

Explain the move, why it was {classification}, and what the better plan was.{novice_line}"""

        messages = [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ]
        resp = self.llm.chat.completions.create(
            model="gpt-5.2",
            messages=messages,
            temperature=0.4,
            max_tokens=300,
        )
        text = resp.choices[0].message.content.strip()
        text = text.replace("**", "").replace("*", "")
        if not text:
            text = "The engine could not generate an explanation for this move."
        self._conv_messages = messages + [{"role": "assistant", "content": text}]
        return text

    def followup(self, question: str) -> str:
        if not self._conv_messages:
            return "No position context available. Please make a move first."
        messages = self._conv_messages + [{"role": "user", "content": question}]
        resp = self.llm.chat.completions.create(
            model="gpt-5.2",
            messages=messages,
            temperature=0.4,
            max_tokens=300,
        )
        text = resp.choices[0].message.content.strip()
        text = text.replace("**", "").replace("*", "")
        if not text:
            text = "Sorry, no response was generated."
        self._conv_messages = messages + [{"role": "assistant", "content": text}]
        return text

    def quit(self):
        try:
            self.engine.quit()
        except Exception:
            pass
