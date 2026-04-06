// engine.js
import { engineEvalEl, engineDepthEl, engineBestMoveEl, enginePvEl } from './domRefs.js';

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

    // Update board arrow via board.js
    import('./board.js').then(b => b.drawBestMove(best.pv?.[0]));

    // Update eval bar via board.js
    import('./board.js').then(b => b.updateEvalBar(cp));
}