import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from pathlib import Path

root = Path(__file__).resolve().parent.parent.parent

X = np.load(f"{root}/playerbot_backend/data/X.npy")
y = np.load(f"{root}/playerbot_backend/data/y.npy")

X = torch.tensor(X, dtype=torch.float32)
y = torch.tensor(y, dtype=torch.long)


class PolicyModel(nn.Module):

    def __init__(self):

        super().__init__()

        self.linear = nn.Linear(5, 3)

    def forward(self, x):

        return self.linear(x)


model = PolicyModel()

optimizer = optim.Adam(model.parameters(), lr=0.01)

loss_fn = nn.CrossEntropyLoss()


for epoch in range(1000):

    optimizer.zero_grad()

    logits = model(X)

    loss = loss_fn(logits, y)

    loss.backward()

    optimizer.step()

    print("Epoch", epoch, "loss", loss.item())


W = model.linear.weight.detach().numpy()
b = model.linear.bias.detach().numpy()


np.savez(
    f"{root}/playerbot_backend/models/engine_policy_v1.npz",
    W=W,
    b=b
)

print("Policy saved.")