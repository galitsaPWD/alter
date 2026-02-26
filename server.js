import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

/* ─────────────────────────────────────────
   MIDDLEWARE
───────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));   // reject huge payloads
app.use(cors({ origin: '*' }));             // tighten to your domain in prod

/* ─────────────────────────────────────────
   RATE LIMITING  — 20 requests / min / IP
───────────────────────────────────────── */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down a little.' }
});

app.use('/api/', limiter);

/* ─────────────────────────────────────────
   SERVE STATIC FILES (your frontend)
───────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ─────────────────────────────────────────
   PROXY ENDPOINT  POST /api/chat
───────────────────────────────────────── */
app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body;

  // ── Validate input ──
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  if (messages.length > 40) {
    return res.status(400).json({ error: 'Conversation too long — please start a new chat.' });
  }

  if (typeof systemPrompt !== 'string' || systemPrompt.length > 1000) {
    return res.status(400).json({ error: 'Invalid system prompt.' });
  }

  // Sanitise each message
  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role)) {
      return res.status(400).json({ error: 'Invalid message role.' });
    }
    if (typeof msg.content !== 'string' || msg.content.length > 2000) {
      return res.status(400).json({ error: 'Message too long.' });
    }
  }

  // ── Call Groq (key stays server-side) ──
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:      'llama-3.3-70b-versatile',
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      }),
      signal: AbortSignal.timeout(15000)   // 15s timeout
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      if (groqRes.status === 401) return res.status(401).json({ error: 'Invalid API key.' });
      if (groqRes.status === 429) return res.status(429).json({ error: 'Rate limit hit — try again in a moment.' });
      return res.status(502).json({ error: err?.error?.message ?? 'Groq error.' });
    }

    const data  = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content ?? '';
    return res.json({ reply });

  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Request timed out — try again.' });
    }
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Something went wrong on our end.' });
  }
});

/* ─────────────────────────────────────────
   CATCH-ALL → serve index.html (SPA)
───────────────────────────────────────── */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅  Other You running at http://localhost:${PORT}`);
});
