from fastapi import FastAPI
from pydantic import BaseModel
from playerbot import PlayerBot

app = FastAPI()

bot = PlayerBot()

# ---------- Request Schemas ----------

class StartRequest(BaseModel):
    elo: int = 800


class MoveRequest(BaseModel):
    fen: str
    whiteTime: int
    blackTime: int


# ---------- API Endpoints ----------

@app.post("/start")
def start(req: StartRequest):
    bot.start(req.elo)
    return {"ok": True}


@app.post("/stop")
def stop():
    bot.stop()
    return {"ok": True}


@app.post("/get-move")
def get_move(req: MoveRequest):
    move = bot.get_move(
        fen=req.fen,
        white_time=req.whiteTime,
        black_time=req.blackTime
    )
    return {
        "ok": True,
        "move": move
    }