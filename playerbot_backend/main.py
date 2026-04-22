import asyncio
import json
import aiohttp
from fastapi import FastAPI

from playerbot import ChessBot


SERVER = "http://localhost:3000"

app = FastAPI()

bot = None
bot_lock = asyncio.Lock()


async def send_move(move_payload):
    move = move_payload["move"]
    orig = move[:2]
    dest = move[2:4]
    top_choices = move_payload.get("retrieval_top_choices", [])
    if top_choices:
        print(f"Sending retrieval top choices: {len(top_choices)}")

    async with aiohttp.ClientSession() as session:

        await session.post(
            f"{SERVER}/api/board/move",
            json={
                "from": orig,
                "to": dest,
                "source": "bot",
                "retrieval_top_choices": move_payload.get("retrieval_top_choices", []),
            }
        )


async def fetch_clock():

    async with aiohttp.ClientSession() as session:

        async with session.get(f"{SERVER}/api/clock/state") as resp:
            try:
                return await resp.json()
            except:
                return None


async def fetch_board_fen():
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{SERVER}/api/board/state") as resp:
            try:
                data = await resp.json()
                return data.get("status", {}).get("fen")
            except Exception:
                return None




RETRY_SECONDS = 5

async def listen_sse():

    while True:

        try:

            async with aiohttp.ClientSession() as session:

                async with session.get(f"{SERVER}/api/general/stream") as resp:
                    
                    print("caught the stream")

                    async for raw in resp.content:

                        line = raw.decode().strip()

                        if not line.startswith("data:"):
                            continue

                        try:
                            data = json.loads(line[5:])
                        except:
                            continue

                        fen = data.get("fen")
                        current_bot = bot

                        if fen and current_bot:
                            clock = await fetch_clock()
                            await current_bot.on_fen(fen, clock, send_move)

        except Exception as e:

            print(f"SSE connection failed: {e}")
            print(f"Retrying in {RETRY_SECONDS} seconds...")

            await asyncio.sleep(RETRY_SECONDS)


from pydantic import BaseModel

class BotStartRequest(BaseModel):
    bot_color: str
    elo: int = 800
    bot_type: str = "human_bot_trained"


@app.post("/playerbot/start")
async def start_bot(req: BotStartRequest):

    print("Bot activated:", req)

    if req.bot_color not in ["w", "b"]:
        print("Not a valid color:", req.bot_color)
        return {"error": "invalid color"}

    valid_types = {"human_bot_trained", "maia2", "retrieval_model"}
    if req.bot_type not in valid_types:
        print("Not a valid bot_type:", req.bot_type)
        return {"error": "invalid bot_type"}

    new_bot = ChessBot(req.bot_color, req.elo, req.bot_type)

    global bot
    async with bot_lock:
        bot = new_bot

    # Prime bot immediately on current board position so it can move
    # without waiting for the next SSE setFen event.
    try:
        fen = await fetch_board_fen()
        if fen:
            clock = await fetch_clock()
            await new_bot.on_fen(fen, clock, send_move)
    except Exception as e:
        print(f"Bot warm-start failed: {e}")

    return {"status": "started", "color": req.bot_color, "bot_type": req.bot_type}


@app.post("/playerbot/stop")
async def stop_bot():
    
    print("Bot deactivated")

    global bot
    async with bot_lock:
        bot = None

    return {"status": "stopped"}


@app.on_event("startup")
async def startup():

    asyncio.create_task(listen_sse())



# ==============================
# Util
# ==============================
@app.middleware("http")
async def log_requests(request, call_next):
    print("Request:", request.method, request.url.path)
    response = await call_next(request)
    return response