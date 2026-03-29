// players.js
// Handles user moves securely using assigned player IDs

import { getPlayerId, getColor, getGameId } from './ids.js';

// Sends a move to the backend with attached playerId
export async function onUserMove(from, to) {
    const playerId = getPlayerId();
    const color = getColor();
    const gameId = getGameId();

    if (!playerId || !gameId || !color) {
        console.warn('Move blocked: player ID or game ID missing');
        return;
    }

    try {
        const res = await fetch('/api/board/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            gameId, 
            playerId, 
            from, 
            to
        })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
        console.warn('Move rejected:', data.error);
        return;
        }
    } catch (err) {
        console.error('Move failed', err);
    }
}