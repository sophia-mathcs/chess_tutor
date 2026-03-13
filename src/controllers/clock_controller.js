const whiteClockEl = document.getElementById("clock-white");
const blackClockEl = document.getElementById("clock-black");

const clockController = {
    interval: null,
    whiteTime: 0,
    blackTime: 0,
    running: false,
    turn: 'white',

    reset(initialSeconds, startingTurn) {
        this.whiteTime = initialSeconds;
        this.blackTime = initialSeconds;
        this.turn = startingTurn;
        this.updateDisplay();
        if (this.interval) clearInterval(this.interval);
        if (initialSeconds > 0) this.start();
    },

    start() {
        this.running = true;
        this.interval = setInterval(() => {
            if (!this.running) return;
            if (this.turn === 'white') this.whiteTime--;
            else this.blackTime--;
            this.updateDisplay();
        }, 1000);
    },

    switchTurn() {
        this.turn = this.turn === 'white' ? 'black' : 'white';
    },

    stop() {
        this.running = false;
        if (this.interval) clearInterval(this.interval);
    },

    updateDisplay() {
        const format = (s) => {
            const m = Math.floor(s/60).toString().padStart(2,'0');
            const sec = (s%60).toString().padStart(2,'0');
            return `${m}:${sec}`;
        };
        whiteClockEl.textContent = format(this.whiteTime);
        blackClockEl.textContent = format(this.blackTime);
    }
};
