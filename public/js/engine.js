// engine.js
import {
    engineEvalEl,
    engineDepthEl,
    engineBestMoveEl,
    enginePvEl,
    hintTextEl
} from './domRefs.js';
import { state } from './state.js';

let hintReqId = 0;

// Called by SSE when engine sends update
export function handleEngineUpdate(lines) {
    if (!lines || !lines.length) return;
    const best = lines[0];
    let cp = best.eval_cp;
    let displayEval = "-";

    if (best.mate_in != null) {
        
        const sign = best.mate_in > 0 ? "" : "-";
        displayEval = `${sign}#${Math.abs(best.mate_in)}`;
        if (best.mate_in !== 0) cp = best.mate_in > 0 ? 10000 : -10000;
    } else if (cp != null) displayEval = (cp / 100).toFixed(2);

    engineEvalEl.textContent = displayEval;
    engineDepthEl.textContent = best.depth ?? "-";
    engineBestMoveEl.textContent = best.pv?.[0] ?? "-";
    enginePvEl.textContent = best.pv?.join(' ') ?? "-";
    state.lastEngineBestMove = best.pv?.[0] ?? null;

    // Update board arrow via board.js
    import('./board.js').then(b => b.drawBestMove(best.pv?.[0]));

    // Update eval bar via board.js
    import('./board.js').then(b => b.updateEvalBar(cp));

    // Only generate hints after the user makes a move, and only once per FEN.
    // (Engine ticks can be very frequent, so we must throttle.)
    if (state.lastPlayedMove) {
        requestHint({
            bestMove: best.pv?.[0] ?? null,
            pv: best.pv ?? [],
            evalCp: best.eval_cp ?? null,
            mateIn: best.mate_in ?? null,
            depth: best.depth ?? null,
        });
    }
}

async function requestHint(engineLine) {
    if (!hintTextEl) return;

    const status = state.lastBoardStatus;
    if (!status?.fen) return;

    if (state.hintInFlight) return;
    if (state.lastHintFen === status.fen) return;

    state.hintInFlight = true;
    const reqId = ++hintReqId;
    state.lastHintFen = status.fen;
    hintTextEl.textContent = "Generating hint explanation...";

    try {
        const res = await fetch('/api/engine/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fen: status.fen,
                turn: status.turn,
                engineLine,
                lastPlayedMove: state.lastPlayedMove,
                followedBestMove: state.lastMoveFollowedBest
            })
        });

        const data = await res.json().catch(() => ({}));
        if (reqId !== hintReqId) return;

        if (!res.ok || !data.ok) {
            hintTextEl.textContent = data.error || "Hint explanation unavailable.";
            state.hintInFlight = false;
            state.lastHintFen = null; // allow retry on next engine tick
            return;
        }

        hintTextEl.textContent = data.hint || "No hint generated.";
        state.hintInFlight = false;
    } catch (err) {
        if (reqId !== hintReqId) return;
        hintTextEl.textContent = "Hint explanation unavailable.";
        state.hintInFlight = false;
        state.lastHintFen = null; // allow retry on next engine tick
    }
}