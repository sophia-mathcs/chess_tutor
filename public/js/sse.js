import { applyStatus } from './board.js';
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
    }
    if (state.clockStatus.on) {
        if (!state.clockStatus.started) {
            state.clockStatus.started = true;

            const res = await fetch('/api/clock/start', {
            method: 'POST'
            });

            const data = await res.json();

            await syncClockState();

            console.log("CLOCK START", data);
        }

        const res = await fetch('/api/clock/switch-turn', {
            method: 'POST'
        });

        const data = await res.json();

        await syncClockState();

        console.log("CLOCK SWITCH", data);
    }
}
