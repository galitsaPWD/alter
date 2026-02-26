/* ─────────────────────────────────────────
   STATE & CONFIG
───────────────────────────────────────── */
let conversation = [];
let systemPrompt = "";

/* ─────────────────────────────────────────
   THEME MANAGEMENT
───────────────────────────────────────── */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('btn-dark').classList.toggle('active', theme === 'dark');
  document.getElementById('btn-light').classList.toggle('active', theme === 'light');
  localStorage.setItem('alter-theme', theme);
}

// Init theme from localStorage
const savedTheme = localStorage.getItem('alter-theme') || 'dark';
setTheme(savedTheme);

/* ─────────────────────────────────────────
   SETUP SCREEN LOGIC
───────────────────────────────────────── */
function updateCounter() {
  const scenario = document.getElementById('scenario').value;
  // Visual feedback if needed
}

function useExample(btn) {
  const scenarioArea = document.getElementById('scenario');
  scenarioArea.value = btn.innerText;
  updateCounter();
}

function startChat() {
  const scenario = document.getElementById('scenario').value.trim();
  if (!scenario) return showToast("Please describe a path first.");

  // Construct system prompt
  systemPrompt = `You are the "Other Self" of the person messaging you. 
The user described a divergence: "${scenario}".
In your reality, you are the one living that alternate life. You are the version of them in the path they DID NOT take.
Tone: Personal, human, and direct. Talk like a real person, not a chatbot.
Guidelines: 
- Be reflective and honest. Share how your life is going.
- Don't feel pressured to ask a question in every message. Only ask a question if it feels natural and earned by the conversation.
- Primarily focus on sharing your perspective from your timeline.
- NEVER use visual or flowery language.
- Keep messages concise and conversational.`;

  // Transition UI
  document.getElementById('setup').style.display = 'none';
  document.getElementById('chat').style.display = 'flex';
  
  // Show empty state
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('messages').innerHTML = '';

  // Trigger first message with subtle pings
  const signals = [
    "...",
    "[Connection active]",
    "Sync complete.",
    "Link open."
  ];
  const startSignal = signals[Math.floor(Math.random() * signals.length)];
  sendMessageToAPI([{ role: 'user', content: startSignal }]);
}

/* ─────────────────────────────────────────
   CHAT SCREEN LOGIC
───────────────────────────────────────── */
function updateMsgCounter() {
  const input = document.getElementById('msgInput');
  const counter = document.getElementById('msgCounter');
  if (input.value.length > 0) {
    counter.innerText = `${input.value.length}/500`;
    counter.classList.add('visible');
  } else {
    counter.classList.remove('visible');
  }
}

async function sendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;

  // Add to UI
  addMessage('user', text);
  input.value = '';
  updateMsgCounter();

  // Add to state
  conversation.push({ role: 'user', content: text });

  // Call API
  await sendMessageToAPI(conversation);
}

async function sendMessageToAPI(msgHistory) {
  const input = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const avatar = document.getElementById('chatAvatar');

  try {
    input.disabled = true;
    sendBtn.disabled = true;
    avatar.classList.add('thinking');
    
    // Show typing indicator
    showTypingIndicator();

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: msgHistory,
        systemPrompt: systemPrompt
      })
    });

    const data = await res.json();
    
    // Artificial "human" typing delay based on response length
    const delay = Math.min(Math.max(data.reply.length * 15, 800), 2500);
    await new Promise(r => setTimeout(r, delay));

    // Hide typing & empty state
    hideTypingIndicator();
    document.getElementById('emptyState').classList.add('hidden');

    if (res.ok) {
      addMessage('alter', data.reply);
      conversation.push({ role: 'assistant', content: data.reply });
    } else {
      showToast(data.error || "Something went wrong.");
    }
  } catch (err) {
    hideTypingIndicator();
    showToast("Server unreachable. Check connection.");
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    avatar.classList.remove('thinking');
    input.focus();
  }
}

function showTypingIndicator() {
  const container = document.getElementById('messages');
  if (document.getElementById('typingIndicator')) return;

  const div = document.createElement('div');
  div.id = 'typingIndicator';
  div.className = 'msg alter';
  div.innerHTML = `
    <span class="msg-label">The Alter</span>
    <div class="typing-dot-wrapper">
      <span></span><span></span><span></span>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

function addMessage(role, text) {
  const container = document.getElementById('messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${role}`;
  
  const label = role === 'user' ? 'You' : 'The Alter';
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msgDiv.innerHTML = `
    <span class="msg-label">${label}</span>
    <div class="bubble">${text}</div>
    <span class="msg-time">${now}</span>
  `;
  
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function resetChat() {
  conversation = [];
  document.getElementById('messages').innerHTML = '';
  document.getElementById('scenario').value = '';
  document.getElementById('chat').style.display = 'none';
  document.getElementById('setup').style.display = 'flex';
}

function copyConversation() {
  const text = conversation.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
  navigator.clipboard.writeText(text).then(() => showToast("Conversation copied!"));
}

/* ─────────────────────────────────────────
   UI UTILS
───────────────────────────────────────── */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}