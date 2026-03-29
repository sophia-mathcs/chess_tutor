// ids.js
// Frontend identity/session manager, secure by mode

let ids = {
  gameId: null,
  playerId: [],      // visible player ID
  color: [],         // controlled color
  mode: 'bot'          // default: 'self' | 'bot' | 'pvp'
};

// ----------------- getters -----------------
export function getGameId() { return ids.gameId; }
export function getPlayerId() { return ids.playerId; }
export function getColor() { return ids.color; }
export function getMode() { return ids.mode; }

// ----------------- setters -----------------
export function setMode(selectedMode) { ids.mode = selectedMode; }

// ----------------- lifecycle calls -----------------
export async function createGameWithPlayers(color = 'white') {
  const res = await fetch('/api/lifecycle/create-game', {
    method: 'POST',
    body: JSON.stringify({ mode: ids.mode }) 
  });

  const data = await res.json();
  if (!data.ok) throw new Error("Failed to create game with players");

  ids.gameId = data.gameId;

  // store ids
  if (ids.mode === 'self') {
    joinPlayer('white');
    joinPlayer('black');
  } else {
    joinPlayer(color)
  }

  return getPlayerId();
}

// Assign color if joining later (like PvP)
export async function joinPlayer(color) {
  if (!ids.gameId) throw new Error("Game not created yet");

  const res = await fetch('api/lifecycle/assign-player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId: ids.gameId, color })
  });

  const data = await res.json();
  if (!data.ok) throw new Error("Failed to assign player");

  ids.playerId.push(data.playerId);
  ids.color.push(color);
}

// Reset IDs
export function clearIds() {
  ids.gameId = null;
  ids.playerId = [];
  ids.color = [];
  ids.mode = 'bot';
}