import chess
import chess.pgn
import chess.engine
import numpy as np
from pathlib import Path
from multiprocessing import Pool, cpu_count
import random
import os

from feature_extractor import build_features

## Data retrieved from https://database.lichess.org/#broadcasts

############################################
# Paths
############################################

root = Path(__file__).resolve().parent.parent.parent

STOCKFISH_PATH = f"{root}/engines/stockfish/stockfish-macos-m1-apple-silicon"

PGN_PATH = f"{root}/playerbot_backend/data/lichess_games.pgn"

OUTPUT_X = f"{root}/playerbot_backend/data/X.npy"
OUTPUT_Y = f"{root}/playerbot_backend/data/y.npy"


############################################
# Settings
############################################

SAMPLE_RATE = 0.2
BATCH_SIZE = 2000
MAX_POSITIONS = 100000


############################################
# Worker globals
############################################

def init_worker():
    """
    Each worker starts ONE persistent Stockfish instance.
    """
    global engine

    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

    engine.configure({
        "Threads": 1,
        "Hash": 64
    })


############################################
# Engine helpers
############################################

def evaluate(board):

    global engine

    info = engine.analyse(
        board,
        chess.engine.Limit(time=0.02),
        multipv=2
    )

    if not isinstance(info, list):
        info = [info]

    evals = []

    for entry in info:

        score = entry["score"].white().score(mate_score=10000)

        if score is None:
            score = 0

        evals.append(score)

    best = evals[0]
    second = evals[1] if len(evals) > 1 else best

    complexity = abs(best - second)

    return best, complexity


def label_from_cpl(cpl):

    if cpl > 200:
        return 0

    if cpl > 50:
        return 1

    return 2


############################################
# Worker task
############################################

def process_position(job):

    fen, move_uci, elo = job

    global engine

    board = chess.Board(fen)

    move = chess.Move.from_uci(move_uci)

    eval_before, complexity = evaluate(board)

    best_info = engine.analyse(
        board,
        chess.engine.Limit(time=0.02)
    )

    best_score = best_info["score"].white().score(mate_score=10000)

    board.push(move)

    eval_after = engine.analyse(
        board,
        chess.engine.Limit(time=0.01)
    )["score"].white().score(mate_score=10000)

    cpl = abs(best_score - eval_after)

    features = build_features(board, elo, eval_before, complexity)

    label = label_from_cpl(cpl)

    return features, label


############################################
# Lazy writer
############################################

def append_batch(X_batch, y_batch):

    if not os.path.exists(OUTPUT_X):

        np.save(OUTPUT_X, np.array(X_batch))
        np.save(OUTPUT_Y, np.array(y_batch))

        return

    X_old = np.load(OUTPUT_X)
    y_old = np.load(OUTPUT_Y)

    X_new = np.concatenate([X_old, X_batch])
    y_new = np.concatenate([y_old, y_batch])

    np.save(OUTPUT_X, X_new)
    np.save(OUTPUT_Y, y_new)


############################################
# Main
############################################

def main():

    workers = max(1, cpu_count() - 1)

    pool = Pool(workers, initializer=init_worker)

    jobs = []
    processed = 0

    X_batch = []
    y_batch = []

    with open(PGN_PATH) as pgn:

        while True:

            game = chess.pgn.read_game(pgn)

            if game is None:
                break

            board = game.board()

            elo = int(game.headers.get("WhiteElo", 1500))

            for move in game.mainline_moves():

                if random.random() < SAMPLE_RATE:

                    jobs.append((board.fen(), move.uci(), elo))

                board.push(move)

                if len(jobs) >= BATCH_SIZE:

                    results = pool.map(process_position, jobs)

                    for f, l in results:

                        X_batch.append(f)
                        y_batch.append(l)

                    processed += len(results)

                    print(f"Processed {processed} positions")

                    append_batch(
                        np.array(X_batch),
                        np.array(y_batch)
                    )

                    X_batch = []
                    y_batch = []
                    jobs = []

                if processed >= MAX_POSITIONS:
                    break

            if processed >= MAX_POSITIONS:
                break

    pool.close()
    pool.join()

    if X_batch:

        append_batch(
            np.array(X_batch),
            np.array(y_batch)
        )

    print("Dataset generation complete.")


if __name__ == "__main__":
    main()