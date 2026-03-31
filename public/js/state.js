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

    // Hints context
    lastEngineBestMove: null,
    lastPlayedMove: null,
    lastMoveFollowedBest: null,

    // Hint request throttling (avoid calling OpenAI on every engine tick)
    lastHintFen: null,
    hintInFlight: false

}