let enabled = false

export function setEnabled(val) {
    enabled = val
}

export function resetConversation() {
    const area = document.getElementById('followup-area')
    const input = document.getElementById('followup-input')
    if (area) area.style.display = 'none'
    if (input) input.value = ''
}

export function onMoveMade() {
    resetConversation()
    if (enabled) showTutorThinking()
}

export function handleTutorUpdate(cmd) {
    const el = document.getElementById('hint-text')
    if (!el) return
    el.classList.remove('tutor-thinking')
    el.textContent = cmd.explanation || 'No explanation available.'
    if (enabled) {
        const area = document.getElementById('followup-area')
        if (area) area.style.display = 'flex'
    }
}

export function showTutorThinking() {
    const el = document.getElementById('hint-text')
    if (!el) return
    el.classList.add('tutor-thinking')
    el.textContent = 'Analyzing your move…'
}

export function clearTutorPanel() {
    const el = document.getElementById('hint-text')
    if (!el) return
    el.textContent = 'Enable Tutor to receive move explanations.'
    resetConversation()
}

async function sendFollowup() {
    const input = document.getElementById('followup-input')
    const btn = document.getElementById('followup-btn')
    const hintEl = document.getElementById('hint-text')
    const question = input?.value.trim()
    if (!question) return
    if (hintEl) {
        hintEl.classList.add('tutor-thinking')
        hintEl.textContent = 'Thinking…'
    }
    if (btn) btn.disabled = true
    try {
        const res = await fetch('/api/tutor/followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        })
        const data = await res.json()
        if (hintEl) {
            hintEl.classList.remove('tutor-thinking')
            hintEl.textContent = data.explanation || 'No response.'
        }
        if (input) input.value = ''
    } catch (err) {
        if (hintEl) {
            hintEl.classList.remove('tutor-thinking')
            hintEl.textContent = 'Follow-up failed.'
        }
    } finally {
        if (btn) btn.disabled = false
    }
}

document.getElementById('followup-btn')?.addEventListener('click', sendFollowup)
document.getElementById('followup-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendFollowup()
})
