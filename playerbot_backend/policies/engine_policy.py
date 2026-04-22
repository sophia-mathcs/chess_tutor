import numpy as np
import random


class EnginePolicy:

    def __init__(self, W, b):

        self.W = np.array(W)
        self.b = np.array(b)

    def softmax(self, z):

        z = z - np.max(z)
        e = np.exp(z)

        return e / e.sum()

    def probs(self, features):

        z = self.W @ features + self.b

        return self.softmax(z)

    def sample(self, features):

        p = self.probs(features)

        return random.choices(
            ["blunder", "stockfish", "maia"],
            weights=p,
            k=1
        )[0]