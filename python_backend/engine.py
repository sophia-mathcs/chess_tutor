import chess
import chess.engine
import threading

ENGINE_PATH = "../engines/stockfish/stockfish-macos-m1-apple-silicon"

class EngineManager:

    def __init__(self):

        self.engine = None
        self.board = chess.Board()

        self.depth = 15
        self.multipv = 1
        self.skill = 20

        self.running = False

        self.lines = {}
        self.latest_lines = []
        self.analysis_thread = None

    # ---------- lifecycle ----------

    def init(self):

        if not self.engine:
            self.engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)

        return {"status": "initialized"}

    def quit(self):

        self.running = False

        if self.engine:
            self.engine.quit()
            self.engine = None

        return {"status": "quit"}

    # ---------- configuration ----------

    def set_position(self, fen):
        self.board = chess.Board(fen)
        self.lines = {}

    def set_depth(self, depth):
        self.depth = depth

    def set_multipv(self, value):
        self.multipv = value

        if self.engine:
            self.engine.configure({"MultiPV": value})

    def set_skill(self, level):
        self.skill = level

        if self.engine:
            self.engine.configure({"Skill Level": level})

    # ---------- analysis loop ----------

    def _analysis_loop(self):

        self.lines = {}

        with self.engine.analysis(
            self.board,
            chess.engine.Limit(depth=self.depth),
            multipv=self.multipv
        ) as analysis:

            for info in analysis:

                if not self.running:
                    break

                if "pv" not in info:
                    continue

                pv_index = info.get("multipv", 1)

                pv = [m.uci() for m in info["pv"]]

                score = None

                if "score" in info:
                    score = info["score"].relative.score(mate_score=10000)

                line = {
                    "multipv": pv_index,
                    "depth": info.get("depth"),
                    "eval": score,
                    "pv": pv
                }

                # update the stable line
                self.lines[pv_index] = line

    def start_analysis(self):

        if not self.engine:
            self.init()

        if self.running:
            return {"status": "already running"}

        self.running = True
        self.latest_lines = []

        self.analysis_thread = threading.Thread(
            target=self._analysis_loop,
            daemon=True
        )

        self.analysis_thread.start()

        return {"status": "analysis started"}

    def stop(self):

        self.running = False

        return {"status": "stopped"}

    def stop_move(self):

        self.running = False

        return {"status": "move stopped"}

    # ---------- queries ----------

    def best_move(self):

        result = self.engine.play(
            self.board,
            chess.engine.Limit(depth=self.depth)
        )

        return result.move.uci()

    def get_updates(self):

        if not self.lines:
            return []

        # return sorted stable PV lines
        ordered = [
            self.lines[k]
            for k in sorted(self.lines.keys())
        ]

        return ordered

    def state(self):

        return {
            "running": self.running,
            "depth": self.depth,
            "multipv": self.multipv,
            "fen": self.board.fen()
        }

    def info(self):

        return {
            "name": "Stockfish"
        }


engine_manager = EngineManager()