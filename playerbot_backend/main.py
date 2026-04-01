import asyncio
import json
import aiohttp
from fastapi import FastAPI

from playerbot import ChessBot


SERVER = "http://localhost:3000"

app = FastAPI()

bot = None


async def send_move(move):

    orig = move[:2]
    dest = move[2:4]

    async with aiohttp.ClientSession() as session:

        await session.post(
            f"{SERVER}/api/board/move",
            json={"from": orig, "to": dest}
        )


async def fetch_clock():

    async with aiohttp.ClientSession() as session:

        async with session.get(f"{SERVER}/api/clock/state") as resp:
            try:
                return await resp.json()
            except:
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

                        if fen and bot:
                            clock = await fetch_clock()
                            await bot.on_fen(fen, clock, send_move)

        except Exception as e:

            print(f"SSE connection failed: {e}")
            print(f"Retrying in {RETRY_SECONDS} seconds...")

            await asyncio.sleep(RETRY_SECONDS)


from pydantic import BaseModel

class BotStartRequest(BaseModel):
    bot_color: str
    elo: int = 800


@app.post("/playerbot/start")
async def start_bot(req: BotStartRequest):

    print("Bot activated:", req)

    if req.bot_color not in ["w", "b"]:
        print("Not a valid color:", req.bot_color)
        return {"error": "invalid color"}

    global bot
    bot = ChessBot(req.bot_color, req.elo)

    return {"status": "started", "color": req.bot_color}


@app.post("/playerbot/stop")
async def stop_bot():
    
    print("Bot deactivated")

    global bot
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