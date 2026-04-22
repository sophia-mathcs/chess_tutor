import { applyStatus, drawRetrievalChoices, clearRetrievalChoices } from './board.js';
import { handleEngineUpdate } from './engine.js';
import { state } from "./state.js";
import { syncClockState } from './clock.js';

export function connect() {
    const ev = new EventSource('/api/general/stream');
    ev.onopen = () => console.log('Connected to SSE');
    ev.onerror = () => {
        console.warn('SSE disconnected, retrying...');
        ev.close();
        setTimeout(connect, 3000);
    };
    ev.onmessage = async e => {
        const cmd = JSON.parse(e.data);

        switch(cmd.type) {
            case 'setFen':
                applyStatus(cmd.status);
                manageClocks(cmd.status);
                if (cmd.source === 'bot' && Array.isArray(cmd.retrievalTopChoices) && cmd.retrievalTopChoices.length) {
                    console.log('SSE retrievalTopChoices', cmd.retrievalTopChoices);
                    drawRetrievalChoices(cmd.retrievalTopChoices);
                } else {
                    clearRetrievalChoices();
                }
                if (cmd.source !== 'bot') import('./tutor.js').then(t => t.onMoveMade());
            break;
            case 'engineUpdate':
                handleEngineUpdate(cmd.lines);
            break;
            case 'tutorUpdate':
                import('./tutor.js').then(t => t.handleTutorUpdate(cmd));
            break;
            case 'flip':
                import('./board.js').then(b => b.flipBoard());
            break;
            case 'select':
                import('./board.js').then(b => b.state.ground.selectSquare(cmd.key));
            break;
        }
    };
}


// Players Clock Manager
async function manageClocks(status){
    if (status.isGameOver){
        state.clockStatus.on = false;
        state.clockStatus.lastManagedFen = status.fen || null;
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

        await syncClockState();

        const desiredRunning = status.turn;
        const currentRunning = state.clockStatus.running;
        const fenChanged = status.fen && status.fen !== state.clockStatus.lastManagedFen;

        // Keep clock side aligned with side-to-move from board status.
        // Use explicit set-turn to avoid drift from duplicated/out-of-order events.
        if (fenChanged && currentRunning !== desiredRunning) {
            const res = await fetch('/api/clock/set-turn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ turn: desiredRunning })
            });
            const data = await res.json();
            await syncClockState();
            console.log("CLOCK SET TURN", data);
        }

        state.clockStatus.lastManagedFen = status.fen || null;
    }
}