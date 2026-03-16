import { applyStatus } from './board.js';
import { handleEngineUpdate } from './engine.js';

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
            break;
            case 'engineUpdate':
            handleEngineUpdate(cmd.lines);
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