import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
from tutor import TutorAnalyzer

app = FastAPI()
tutor_analyzer = TutorAnalyzer()


class AnalyzeRequest(BaseModel):
    before_fen:  str
    after_fen:   str
    played_move: str  # UCI notation, e.g. "e2e4"
    novice: bool = False


@app.post("/tutor/analyze")
async def analyze(req: AnalyzeRequest):
    explanation = await asyncio.to_thread(
        tutor_analyzer.analyze, req.before_fen, req.after_fen, req.played_move, req.novice
    )
    return {"ok": True, "explanation": explanation}


@app.post("/tutor/quit")
def quit_tutor():
    tutor_analyzer.quit()
    return {"ok": True}
