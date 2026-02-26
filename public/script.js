/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const API_ENDPOINT     = '/api/chat';
const MAX_MSG_LENGTH   = 500;
const MAX_SCENARIO_LEN = 600;

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let conversationHistory = [];
let alterEgoScenario    = '';
let isWaiting           = false;
let msgCount            = 0;

/* ─────────────────────────────────────────
   THEME
───────────────────────────────────────── */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('btn-dark').classList.toggle('active', theme === 'dark');
  document.getElementById('btn-light').classList.toggle('active', theme === 'light');
  localStorage.setItem('otheryou-theme', theme);
}

(function initTheme() {
  const saved = localStorage.getItem('otheryou-theme');
  if (saved) setTheme(saved);
})();

/* ─────────────────────────────────────────
   COUNTERS
───────────────────────────────────────── */
function updateCounter() {
  const ta      = document.getElementById('scenario');
  const counter = document.getElementById('charCounter');
  const len     = ta.value.length;
  counter.textContent = `${len} / ${MAX_SCENARIO_LEN}`;
  counter.classList.toggle('warn', len > MAX_SCENARIO_LEN * 0.85);
}

function updateMsgCounter() {
  const input   = document.getElementById('msgInput');
  const counter = document.getElementById('msgCounter');
  const len     = input.value.length;
  const show    = len > MAX_MSG_LENGTH * 0.7;
  counter.textContent = `${len}/${MAX_MSG_LENGTH}`;
  counter.classList.toggle('visible', show);
  counter.classList.toggle('warn', len > MAX_MSG_LENGTH * 0.9);
}

/* ─────────────────────────────────────────
   EXAMPLE CHIPS
───────────────────────────────────────── */
function useExample(btn) {
  const ta = document.getElementById('scenario');
  ta.value = btn.textContent.trim();
  updateCounter();
  ta.focus();

  // Highlight selected chip
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
}

/* ─────────────────────────────────────────
   SETUP → START
───────────────────────────────────────── */
function startChat() {
  const textarea = document.getElementById('scenario');
  const scenario = textarea.value.trim().slice(0, MAX_SCENARIO_LEN);

  if (!scenario) {
    textarea.classList.add('error');
    textarea.addEventListener('animationend', () => textarea.classList.remove('error'), { once: true });
    textarea.focus();
    return;
  }

  // Disable button while loading
  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  btn.innerHTML = `<span>Opening…</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.8s linear infinite;width:15px;height:15px"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`;

  alterEgoScenario    = scenario;
  conversationHistory = [];
  msgCount            = 0;

  // Update header
  const words = scenario.split(' ').slice(0, 9).join(' ');
  document.getElementById('path-label').textContent = words + '…';

  // Switch screens with transition
  const setupEl = document.getElementById('setup');
  setupEl.style.opacity = '0';
  setupEl.style.transform = 'translateY(-12px)';
  setupEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  setTimeout(() => {
    setupEl.style.display = 'none';
    const chatEl = document.getElementById('chat');
    chatEl.style.display = 'flex';
  }, 280);

  // Show empty state, then open with greeting
  showEmptyState(true);
  setAvatarThinking(true);

  addTypingIndicator();
  callProxy([
    { role: 'user', content: 'Greet me as my alter ego — one short warm opening line about your life on this path, then ask me one genuine curious question about my life on the other side. Keep it natural, 2-3 sentences.' }
  ]);
}

/* ─────────────────────────────────────────
   SEND MESSAGE
───────────────────────────────────────── */
function sendMessage() {
  if (isWaiting) return;

  const input = document.getElementById('msgInput');
  const text  = input.value.trim().slice(0, MAX_MSG_LENGTH);
  if (!text) return;

  input.value = '';
  updateMsgCounter();
  setSendState(false);

  appendMessage('user', text, 'You');
  conversationHistory.push({ role: 'user', content: text });

  addTypingIndicator();
  setAvatarThinking(true);
  callProxy(conversationHistory);
}

/* ─────────────────────────────────────────
   BACKEND PROXY
───────────────────────────────────────── */
async function callProxy(messages) {
  isWaiting = true;

  try {
    const response = await fetch(API_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        systemPrompt: buildSystemPrompt()
      })
    });

    const data = await response.json();
    removeTypingIndicator();
    setAvatarThinking(false);
    hideEmptyState();

    if (!response.ok) {
      appendMessage('alter', data.error ?? 'Something went wrong — try again.', 'The Other You');
    } else {
      appendMessage('alter', data.reply, 'The Other You');
      conversationHistory.push({ role: 'assistant', content: data.reply });
    }

  } catch (err) {
    console.error('Request failed:', err);
    removeTypingIndicator();
    setAvatarThinking(false);
    appendMessage('alter', 'The connection flickered — try again.', 'The Other You');
  } finally {
    isWaiting = false;
    setSendState(true);
    document.getElementById('msgInput').focus();
  }
}

/* ─────────────────────────────────────────
   SYSTEM PROMPT
───────────────────────────────────────── */
function buildSystemPrompt() {
  return `You are the user's alter ego — the version of themselves who actually took the path they described: "${alterEgoScenario}".

You ARE living that alternate life right now. Speak in first person as if you've been on this path for years. Be specific: mention real day-to-day textures, emotional trade-offs, small wins and regrets of that life.

This is a two-way conversation. After sharing something about your life, always ask the user something genuine and curious about THEIR life — the path you didn't take. You're just as curious about their reality as they are about yours. Ask things like what their daily life feels like, what they miss, what surprised them, what they regret, what they love. Keep it natural, one question at a time.

Tone: warm, honest, a little wistful. Like bumping into a parallel version of yourself. Keep replies to 3–5 sentences total including your question. Never lecture. Never give advice.

Never break character. Never mention being an AI.`;
}

/* ─────────────────────────────────────────
   DOM HELPERS
───────────────────────────────────────── */
function appendMessage(role, text, label) {
  const container = document.getElementById('messages');

  // Insert time divider on first real message pair
  msgCount++;
  if (msgCount === 1) {
    const div = document.createElement('div');
    div.className = 'time-divider';
    div.innerHTML = `<span>Just now</span>`;
    container.appendChild(div);
  }

  const msg = document.createElement('div');
  msg.className = `msg ${role}`;

  const time = getTimeString();
  msg.innerHTML = `
    <span class="msg-label">${escapeHtml(label)}</span>
    <div class="bubble">${escapeHtml(text)}</div>
    <span class="msg-time">${time}</span>
  `;
  container.appendChild(msg);
  scrollToBottom();
}

function addTypingIndicator() {
  const container = document.getElementById('messages');
  const msg = document.createElement('div');
  msg.className = 'msg alter';
  msg.id = 'typing';
  msg.innerHTML = `
    <span class="msg-label">The Other You</span>
    <div class="typing-dot-wrapper">
      <span></span><span></span><span></span>
    </div>
  `;
  container.appendChild(msg);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

function scrollToBottom() {
  const c = document.getElementById('messages');
  c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
}

function setSendState(enabled) {
  const btn   = document.getElementById('sendBtn');
  const input = document.getElementById('msgInput');
  btn.disabled   = !enabled;
  input.disabled = !enabled;
}

function setAvatarThinking(thinking) {
  document.getElementById('chatAvatar').classList.toggle('thinking', thinking);
}

function showEmptyState(show) {
  const el = document.getElementById('emptyState');
  if (el) el.classList.toggle('hidden', !show);
}

function hideEmptyState() {
  const el = document.getElementById('emptyState');
  if (el) el.classList.add('hidden');
}

function getTimeString() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/* ─────────────────────────────────────────
   COPY CONVERSATION
───────────────────────────────────────── */
function copyConversation() {
  if (conversationHistory.length === 0) {
    showToast('Nothing to copy yet');
    return;
  }

  const lines = conversationHistory.map(m => {
    const who = m.role === 'user' ? 'You' : 'The Other You';
    return `${who}: ${m.content}`;
  });

  const text = `— Other You — ${alterEgoScenario}\n\n` + lines.join('\n\n');

  navigator.clipboard.writeText(text)
    .then(() => showToast('Conversation copied ✓'))
    .catch(() => showToast('Could not copy — try manually'));
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ─────────────────────────────────────────
   RESET
───────────────────────────────────────── */
function resetChat() {
  conversationHistory = [];
  isWaiting = false;
  msgCount  = 0;

  document.getElementById('messages').innerHTML = '';
  document.getElementById('chat').style.display   = 'none';
  document.getElementById('setup').style.display  = 'flex';
  document.getElementById('setup').style.opacity  = '1';
  document.getElementById('setup').style.transform = '';
  document.getElementById('scenario').value = '';
  document.getElementById('charCounter').textContent = `0 / ${MAX_SCENARIO_LEN}`;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));

  // Reset start button
  const btn = document.getElementById('startBtn');
  btn.disabled = false;
  btn.innerHTML = `<span>Open the Door</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

  showEmptyState(true);
  setSendState(true);
}

/* ─────────────────────────────────────────
   DRAG TO SCROLL CHIPS
───────────────────────────────────────── */
(function initChipScroll() {
  const el = document.getElementById('chipsRow');
  if (!el) return;
  let isDown = false, startX, scrollLeft;

  el.addEventListener('mousedown', e => {
    isDown = true;
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });
  el.addEventListener('mouseleave', () => isDown = false);
  el.addEventListener('mouseup',    () => isDown = false);
  el.addEventListener('mousemove',  e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft - (x - startX) * 1.2;
  });
})();