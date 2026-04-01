from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

from engine import engine_manager

import json
import time


app = FastAPI()


# =============================
# Request Models
# =============================

class FenRequest(BaseModel):
    fen: str


class DepthRequest(BaseModel):
    depth: int


class MultiPVRequest(BaseModel):
    value: int


class SkillRequest(BaseModel):
    level: int


# =============================
# Engine Control
# =============================

@app.post("/engine/start")
def start(req: FenRequest):

    engine_manager.set_position(req.fen)

    engine_manager.start()

    return {"ok": True}


@app.post("/engine/stop")
def stop():

    engine_manager.stop()

    return {"ok": True}


# =============================
# Position Updates
# =============================

@app.post("/engine/set-position")
def set_position(req: FenRequest):

    engine_manager.set_position(req.fen)

    return {"ok": True}


# =============================
# Engine Configuration
# =============================

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

    engine_manager.engine.configure({
        "Skill Level": req.level
    })

    return {"ok": True}


# =============================
# Queries
# =============================

@app.get("/engine/best-move")
def best_move():

    return {
        "move": engine_manager.best_move()
    }


@app.get("/engine/updates")
def updates():

    return {
        "lines": engine_manager.get_updates()
    }


# =============================
# Streaming (SSE)
# =============================

@app.get("/engine/stream")
def engine_stream():

    def event_stream():

        last = None

        while True:

            lines = engine_manager.get_updates()

            if lines != last:

                payload = json.dumps({
                    "type": "engineUpdate",
                    "lines": lines
                })

                yield f"data: {payload}\n\n"

                last = lines

            time.sleep(0.15)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream"
    )


# =============================
# Shutdown
# =============================

@app.post("/engine/quit")
def quit_engine():

    engine_manager.quit()

    return {"ok": True}

# ==============================
# Util
# ==============================

@app.middleware("http")
async def log_requests(request, call_next):
    print("Request:", request.method, request.url.path)
    response = await call_next(request)
    return response