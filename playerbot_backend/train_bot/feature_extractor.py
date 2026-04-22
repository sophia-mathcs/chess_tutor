import numpy as np


def build_features(board, elo, eval_cp, complexity):

    elo_norm = (elo - 1500) / 400
    eval_norm = eval_cp / 400
    move_norm = board.fullmove_number / 60
    complexity_norm = complexity / 200

    return np.array([
        1.0,
        elo_norm,
        eval_norm,
        complexity_norm,
        move_norm
    ])