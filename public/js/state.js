export const state = {

    // Chessground instance
    ground: null,

    // Last board status
    lastBoardStatus: null,

    // Clock status
    clockStatus: {
        on: false,
        started: false,
        clockExpired: false,
        whiteMs: 0,
        blackMs: 0,
        running: null,
        lastServerTime: 0,
        lastLocalTime: 0
    },

    // Flag for flipped clocks
    clocksFlipped: false,

    playerColor: 'white',
    playerbotEnabled: false,
    playerbotColor: null,
}