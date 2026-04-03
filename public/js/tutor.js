export function handleTutorUpdate(cmd) {
    const el = document.getElementById('hint-text')
    if (!el) return
    el.classList.remove('tutor-thinking')
    el.textContent = cmd.explanation ?? 'No explanation available.'
}

export function showTutorThinking() {
    const el = document.getElementById('hint-text')
    if (!el) return
    el.classList.add('tutor-thinking')
    el.textContent = 'Analyzing your move\u2026'
}

export function clearTutorPanel() {
    const el = document.getElementById('hint-text')
    if (!el) return
    el.textContent = 'Enable Tutor to receive move explanations.'
}
