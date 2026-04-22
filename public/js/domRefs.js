export let boardEl, statusEl;
export let fenDisplay, evalFill;
export let engineDepthEl, engineEvalEl, engineBestMoveEl, enginePvEl;
export let whiteClockEl, blackClockEl;
export let colorSelect, newGameBtn, clockSelect, eloSelect, playerBotSelect;
export let engineToggle, playerbotToggle, tutorToggle, flipBtn, evalBar;

export function initDOMRefs() {
  boardEl = document.getElementById('board');
  statusEl = document.getElementById('status');

  fenDisplay = document.getElementById('fen-display');
  evalFill = document.getElementById('eval-fill');

  engineDepthEl = document.getElementById('engine-depth');
  engineEvalEl = document.getElementById('engine-eval');
  engineBestMoveEl = document.getElementById('engine-bestmove');
  enginePvEl = document.getElementById('engine-pv');

  whiteClockEl = document.getElementById('clock-white');
  blackClockEl = document.getElementById('clock-black');

  colorSelect = document.getElementById("color-select");
  newGameBtn = document.getElementById("new-game-btn");
  clockSelect = document.getElementById("clock-select");
  eloSelect = document.getElementById("elo-select");
  playerBotSelect = document.getElementById("player-bot-select");

  engineToggle = document.getElementById("toggle-engine");
  playerbotToggle = document.getElementById("toggle-bot");
  tutorToggle = document.getElementById("toggle-tutor");
  flipBtn = document.getElementById("flip-board-btn");
  evalBar = document.getElementById("eval-bar");
}