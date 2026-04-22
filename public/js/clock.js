// clock.js
import { state } from './state.js';
import { whiteClockEl, blackClockEl } from './domRefs.js';

export function formatTime(ms) {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function updateClockDisplay(whiteStr, blackStr) {
  if (whiteClockEl) whiteClockEl.textContent = whiteStr;
  if (blackClockEl) blackClockEl.textContent = blackStr;
}

export async function syncClockState() {
  try {
    const res = await fetch('/api/clock/state');
    const data = await res.json();

    if (!data.ok || !data.state) {
      console.warn('Failed to sync clock state', data);
      return;
    }

    state.clockStatus.whiteMs = data.state.whiteMs;
    state.clockStatus.blackMs = data.state.blackMs;
    state.clockStatus.running = data.state.running;
    state.clockStatus.lastServerTime = data.state.serverTime;
    state.clockStatus.lastLocalTime = performance.now();
  } catch (err) {
    console.warn('Clock sync error', err);
  }
}

export function renderClock() {
  const cs = state.clockStatus;
  const topClockEl = document.querySelector('.clock-top');
  const bottomClockEl = document.querySelector('.clock-bottom');

  // stop all animations if off
  if (!cs.on) {
    requestAnimationFrame(renderClock);

    if (topClockEl && bottomClockEl) {
      topClockEl.classList.remove("active", "inactive");
      bottomClockEl.classList.remove("active", "inactive");
      topClockEl.classList.add("inactive");
      bottomClockEl.classList.add("inactive");
    }
    return;
  }

  const now = performance.now();
  const elapsed = now - cs.lastLocalTime;

  let white = cs.whiteMs;
  let black = cs.blackMs;

  if (cs.running === "white") white -= elapsed;
  else if (cs.running === "black") black -= elapsed;

  // Update active/inactive by board side (top/bottom), not fixed color.
  if (topClockEl && bottomClockEl) {
    topClockEl.classList.remove("active", "inactive");
    bottomClockEl.classList.remove("active", "inactive");

    const orientation = state.ground?.state?.orientation || "white";
    const topSideColor = orientation === "white" ? "black" : "white";
    const runningSide = cs.running;

    if (runningSide === topSideColor) {
      topClockEl.classList.add("active");
      bottomClockEl.classList.add("inactive");
    } else if (runningSide) {
      bottomClockEl.classList.add("active");
      topClockEl.classList.add("inactive");
    } else {
      topClockEl.classList.add("inactive");
      bottomClockEl.classList.add("inactive");
    }
  }

  // Low-time warning
  if (white > 0 && white < 10000) whiteClockEl.parentElement.classList.add("low-time");
  else whiteClockEl.parentElement.classList.remove("low-time");

  if (black > 0 && black < 10000) blackClockEl.parentElement.classList.add("low-time");
  else blackClockEl.parentElement.classList.remove("low-time");

  // Check for clock expiration
  if (!cs.clockExpired && (white <= 0 || black <= 0)) {
    cs.clockExpired = true;

    // Stop board moves
    //import('./board.js').then(({ stopBoardMoves }) => stopBoardMoves());

    // Stop server clock
    fetch('/api/clock/stop', { method: 'POST' });

    const winner = white <= 0 ? "Black" : "White";
    import('./domRefs.js').then(({ statusEl }) => statusEl.textContent = `Time out — ${winner} wins!`);
  }

  // Update display
  updateClockDisplay(formatTime(white), formatTime(black));

  requestAnimationFrame(renderClock);
}

export async function resetClock({ color = 'white', clockTime = 0 } = {}) {
  await fetch('/api/clock/stop', { method: 'POST' });

  const cs = state.clockStatus;

  if (clockTime > 0) {
    cs.on = true;
    cs.started = false;
    cs.clockExpired = false;
    cs.lastManagedFen = null;

    const res = await fetch('/api/clock/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: clockTime })
    });

    await syncClockState();
    renderClock();
  } else {
    cs.on = false;
    cs.lastManagedFen = null;
    updateClockDisplay("--:--", "--:--");
  }
}