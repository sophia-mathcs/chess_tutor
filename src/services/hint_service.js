const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://litellm.oit.duke.edu';
const LLM_API_PATH = process.env.LLM_API_PATH || '/v1/chat/completions';
const LLM_URL = `${LLM_BASE_URL.replace(/\/$/, '')}${LLM_API_PATH}`;
const DEFAULT_MODEL = process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

function buildPrompt({
  fen,
  turn,
  engineLine,
  lastPlayedMove,
  followedBestMove
}) {
  const playedLabel = lastPlayedMove || 'unknown';
  const followedLabel = followedBestMove === null ? 'unknown' : String(followedBestMove);
  const bestMove = engineLine?.bestMove || 'unknown';
  const evalCp = engineLine?.evalCp;
  const mateIn = engineLine?.mateIn;
  const depth = engineLine?.depth;
  const pv = Array.isArray(engineLine?.pv) ? engineLine.pv.join(' ') : '';

  return [
    'You are a chess coach.',
    'Output exactly 2 sections with labels:',
    '1) How the user move is good or bad',
    '2) Why the engine recommended this move',
    'Keep total response under 300 English characters.',
    '',
    `FEN: ${fen}`,
    `Turn: ${turn}`,
    `Last played move: ${playedLabel}`,
    `Followed previous best move: ${followedLabel}`,
    `Engine best move now: ${bestMove}`,
    `Engine eval cp: ${evalCp}`,
    `Engine mate in: ${mateIn}`,
    `Engine depth: ${depth}`,
    `Engine PV: ${pv}`
  ].join('\n');
}

exports.explainHint = async (payload) => {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'Missing LLM_API_KEY (or OPENAI_API_KEY) on server' };
  }

  const prompt = buildPrompt(payload);

  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a chess coach. Respond in concise English.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`LLM API failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const hint = extractHintText(data);

  if (!hint) {
    throw new Error(`LLM response missing hint text. Response keys: ${Object.keys(data).join(', ')}`);
  }

  return { ok: true, hint };
};

function extractHintText(data) {
  // OpenAI-compatible chat.completions response
  const choiceText = data?.choices?.[0]?.message?.content;
  if (typeof choiceText === 'string' && choiceText.trim()) {
    return choiceText.trim();
  }

  // Responses API commonly returns text inside `output[].content[].text`
  // but exact shape can vary; try several known locations.
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        // Some variants use { type: 'output_text', text: '...' }
        if (typeof c?.text === 'string' && c.text.trim()) return c.text.trim();
        // Fallbacks
        if (typeof c?.output_text === 'string' && c.output_text.trim()) return c.output_text.trim();
      }
    }
  }

  return null;
}
