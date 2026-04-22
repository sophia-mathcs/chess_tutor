const clockController = {

    whiteMs: 0,
    blackMs: 0,

    running: false,
    turn: 'white',

    lastTick: null,

    // Reset clock to initial time and turn
    reset(initialSeconds, startingTurn = 'white') {
        const ms = initialSeconds * 1000;

        this.whiteMs = ms;
        this.blackMs = ms;

        this.turn = startingTurn;
        this.running = false;
        this.lastTick = null;
    },

    // Start clock
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTick = Date.now();
    },

    // Stop clock
    stop() {
        this._updateElapsed();
        this.running = false;
        this.lastTick = null;
    },

    // Switch active player
    switchTurn() {
        this._updateElapsed();
        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.lastTick = Date.now();
    },

    // Set active player deterministically
    setTurn(turn) {
        this._updateElapsed();
        if (turn === 'white' || turn === 'black') {
            this.turn = turn;
        }
        this.lastTick = Date.now();
    },

    // Internal: update elapsed time
    _updateElapsed() {
        if (!this.running || !this.lastTick) return;

        const now = Date.now();
        const elapsed = now - this.lastTick;

        if (this.turn === 'white') {
            this.whiteMs -= elapsed;
            if (this.whiteMs < 0) this.whiteMs = 0;
        } else {
            this.blackMs -= elapsed;
            if (this.blackMs < 0) this.blackMs = 0;
        }

        this.lastTick = now;
    },

    // Read current state (updates elapsed time first)
    getState() {
        this._updateElapsed();
        return {
            whiteMs: this.whiteMs,
            blackMs: this.blackMs,
            running: this.running ? this.turn : null,
            serverTime: Date.now()
        };
    }
};


// ----------------------
// API Routes
// ----------------------

exports.reset = (req, res) => {
    const { time, startingTurn } = req.body || {};

    if (time === undefined) {
        return res.status(400).json({ error: 'Provide time (seconds)' });
    }

    clockController.reset(time, startingTurn || 'white');
    res.json({ ok: true, state: clockController.getState() });
};

exports.start = (req, res) => {
    clockController.start();
    res.json({ ok: true, state: clockController.getState() });
};

exports.stop = (req, res) => {
    clockController.stop();
    res.json({ ok: true, state: clockController.getState() });
};

exports.switchTurn = (req, res) => {
    clockController.switchTurn();
    res.json({ ok: true, state: clockController.getState() });
};

exports.setTurn = (req, res) => {
    const { turn } = req.body || {};
    if (turn !== 'white' && turn !== 'black') {
        return res.status(400).json({ ok: false, error: 'turn must be white or black' });
    }
    clockController.setTurn(turn);
    res.json({ ok: true, state: clockController.getState() });
};

exports.state = (req, res) => {
    res.json({ ok: true, state: clockController.getState() });
};
