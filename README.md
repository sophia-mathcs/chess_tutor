install chess, chessgrounds, express

go to stockfish and maia2 github and install both into /engines
make sure that the instance itself is linked corrected, check link in /src/servicesengine_servive.js

Run
In one terminal:
uvicorn main:app --port 8000
In second terminal:
node server.js