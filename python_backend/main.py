from fastapi import FastAPI
from pydantic import BaseModel
from engine import engine_manager

app = FastAPI()


class FenRequest(BaseModel):
    fen: str


class DepthRequest(BaseModel):
    depth: int


class MultiPVRequest(BaseModel):
    value: int


class SkillRequest(BaseModel):
    level: int


# ---------- lifecycle ----------

@app.post("/engine/init")
def init():
    return engine_manager.init()


@app.post("/engine/quit")
def quit():
    return engine_manager.quit()


# ---------- analysis ----------

@app.post("/engine/start")
def start(req: FenRequest):

    engine_manager.set_position(req.fen)

    return engine_manager.start_analysis()


@app.post("/engine/stop")
def stop():
    return engine_manager.stop()


@app.post("/engine/stop-move")
def stop_move():
    return engine_manager.stop_move()


# ---------- updates ----------

@app.get("/engine/updates")
def updates():

    return {
        "lines": engine_manager.get_updates()
    }


# ---------- position ----------

@app.post("/engine/set-position")
def set_position(req: FenRequest):

    engine_manager.set_position(req.fen)

    return {"ok": True}


# ---------- configuration ----------

@app.post("/engine/depth")
def depth(req: DepthRequest):

    engine_manager.set_depth(req.depth)

    return {"ok": True}


@app.post("/engine/multipv")
def multipv(req: MultiPVRequest):

    engine_manager.set_multipv(req.value)

    return {"ok": True}


@app.post("/engine/skill-level")
def skill(req: SkillRequest):

    engine_manager.set_skill(req.level)

    return {"ok": True}


# ---------- queries ----------

@app.get("/engine/best-move")
def best_move():

    return {
        "move": engine_manager.best_move()
    }


@app.get("/engine/state")
def state():

    return engine_manager.state()


@app.get("/engine/info")
def info():

    return engine_manager.info()