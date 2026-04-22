import numpy as np
from policies.engine_policy import EnginePolicy


def load_policy(path):

    data = np.load(path)

    W = data["W"]
    b = data["b"]

    return EnginePolicy(W, b)