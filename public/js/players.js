// players.js
import { state } from './state.js';
import { applyStatus } from './board.js';
import { syncClockState } from './clock.js';
import { statusEl } from './domRefs.js';

// Handler for user moves on the board
export async function onUserMove(orig, dest) {
    // Log the attempted move for debugging purposes
    console.log("USER MOVE", { from: orig, to: dest, fen: state.lastBoardStatus?.fen });

    const previousStatus = state.lastBoardStatus;
    const playedMove = `${orig}${dest}`;

    try {
    const res = await fetch('/api/board/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: orig, to: dest }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        // Log the error response for debugging purposes
        console.log("MOVE REJECTED", data)

        // Revert the move if illegal or game is over
        if (previousStatus) {
        state.ground.set({ fen: previousStatus.fen });
        applyStatus(previousStatus);
        }
        statusEl.textContent = data.error || 'Move rejected by server.';
        return;
    }

    // Only set hint context when the server accepted the move.
    state.lastPlayedMove = playedMove;
    state.lastMoveFollowedBest = state.lastEngineBestMove
        ? state.lastEngineBestMove === playedMove
        : null;
    } catch (err) {
    if (previousStatus) {
        state.ground.set({ fen: previousStatus.fen });
        applyStatus(previousStatus);
    }
    statusEl.textContent = 'Network error, move reverted.';
    }

    if (state.clockStatus.on) {

    if (!state.clockStatus.started) {
        state.clockStatus.started = true;

        const res = await fetch('/api/clock/start', {
        method: 'POST'
        });

        const data = await res.json();

        await syncClockState();

        // Log the attempted clock start for debugging purposes
        console.log("CLOCK START", data);
    }

    const res = await fetch('/api/clock/switch-turn', {
        method: 'POST'
    });


    // Switch turn on the clock after a move is made
    const data = await res.json();

    await syncClockState();

    // Log the attempted clock switch for debugging purposes
    console.log("CLOCK SWITCH", data);
    }
}
