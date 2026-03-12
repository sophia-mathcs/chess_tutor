import chess
import chess.engine
import threading
import time

ENGINE_PATH = "../engines/stockfish/stockfish-macos-m1-apple-silicon"

class EngineManager:

    def __init__(self):

        self.engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)

        self.board = chess.Board()

        self.depth = 15
        self.multipv = 1

        self.enabled = False

        self.lines = {}

        self.lock = threading.Lock()

        self.last_fen = None

        self.thread = threading.Thread(
            target=self._analysis_loop,
            daemon=True
        )

        self.thread.start()

    # =================================
    # Main analysis loop (runs forever)
    # =================================

    def _analysis_loop(self):

        while True:

            if not self.enabled:
                time.sleep(0.1)
                continue

            try:

                with self.lock:
                    board = self.board.copy()
                    depth = self.depth
                    multipv = self.multipv

                fen = board.fen()

                # Skip redundant analysis
                if fen == self.last_fen:
                    time.sleep(0.15)
                    continue

                self.last_fen = fen

                info = self.engine.analyse(
                    board,
                    chess.engine.Limit(depth=depth),
                    multipv=multipv
                )

                if isinstance(info, dict):
                    info = [info]

                new_lines = {}

                for i, line in enumerate(info):

                    pv_moves = [m.uci() for m in line.get("pv", [])]

                    score_obj = line.get("score")

                    if score_obj:
                        score = score_obj.relative.score(mate_score=10000)
                    else:
                        score = None

                    new_lines[i + 1] = {
                        "multipv": i + 1,
                        "depth": depth,
                        "eval": score,
                        "pv": pv_moves
                    }

                with self.lock:
                    self.lines = new_lines

            except Exception as e:
                print("Engine error:", e)

            time.sleep(0.1)

    # =================================
    # Engine control
    # =================================

    def start(self):

        self.enabled = True

    def stop(self):

        self.enabled = False

    # =================================
    # Position control
    # =================================

    def set_position(self, fen):

        with self.lock:

            self.board = chess.Board(fen)

            self.lines = {}

            self.last_fen = None

    # =================================
    # Engine configuration
    # =================================

    def set_depth(self, depth):

        with self.lock:
            self.depth = depth

    def set_multipv(self, value):

        with self.lock:
            self.multipv = value

        try:
            self.engine.configure({"MultiPV": value})
        except Exception as e:
            print("MultiPV config error:", e)

    # =================================
    # Queries
    # =================================

    def get_updates(self):

        with self.lock:
            return [self.lines[k] for k in sorted(self.lines)]

    def best_move(self):

        with self.lock:
            board = self.board.copy()
            depth = self.depth

        result = self.engine.play(
            board,
            chess.engine.Limit(depth=depth)
        )

        return result.move.uci()

    # =================================
    # Shutdown
    # =================================

    def quit(self):

        try:
            self.engine.quit()
        except Exception:
            pass


engine_manager = EngineManager()
