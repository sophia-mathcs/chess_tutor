// players.js
import { state } from './state.js';


// User Handler
export async function onUserMove(orig, dest) {
    // Log the attempted move for debugging purposes
    console.log("USER MOVE", { from: orig, to: dest, fen: state.lastBoardStatus?.fen });

    const res = await fetch('/api/board/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: orig, to: dest }),
    });

    const data = await res.json();

    if (!res.ok) console.log("MOVE FAILED", data);

}