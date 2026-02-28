/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let conversation   = [];
let systemPrompt   = "";
let scanAnswers    = [];
let currentScanQ   = 0;
let scenario       = "";

/* ─────────────────────────────────────────
   MEMORY PERSISTENCE
───────────────────────────────────────── */
const SESSIONS_KEY  = 'alter_sessions';
const MAX_SESSIONS  = 15;

function saveSession() {
  const sessions = loadSessions();
  sessions.unshift({
    id:           currentTimelineId,
    date:         new Date().toISOString(),
    scenario:     scenario,
    msgCount:     conversation.length,
    conversation: JSON.parse(JSON.stringify(conversation)) // Deep copy
  });
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  renderSessionList();
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function clearSessions(e) {
  if (e) e.stopPropagation();
  localStorage.removeItem(SESSIONS_KEY);
  renderSessionList();
}

function toggleFolder() {
  const list = document.getElementById('sessionList');
  const icon = document.getElementById('folderToggleIcon');
  if (list && icon) {
    // If it's explicitly 'flex', hide it. Otherwise (none or empty), show it.
    if (list.style.display === 'flex') {
      list.style.display = 'none';
      icon.textContent = '+';
    } else {
      list.style.display = 'flex';
      icon.textContent = '−';
    }
  }
}

function openTranscript(index) {
  const sessions = loadSessions();
  const s = sessions[index];
  if (!s) return;

  const modal = document.getElementById('transcriptModal');
  const meta = document.getElementById('transcriptMeta');
  const scenarioEl = document.getElementById('transcriptScenario');
  const messagesBox = document.getElementById('transcriptMessages');

  const d = new Date(s.date);
  meta.textContent = `TIMELINE / ${s.id} / ${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  scenarioEl.textContent = s.scenario;

  messagesBox.innerHTML = '';
  if (s.conversation) {
    s.conversation.forEach(msg => {
      const div = document.createElement('div');
      div.className = `msg ${msg.role === 'user' ? 'user' : 'alter'}`;
      const label = msg.role === 'user' ? 'you' : 'the alter';
      div.innerHTML = `
        <span class="msg-label">${label}</span>
        <div class="bubble">${escapeHtml(msg.content)}</div>`;
      messagesBox.appendChild(div);
    });
  } else {
     messagesBox.innerHTML = '<p class="folder-sub" style="text-align:center;">[ NO TRANSCRIPT DATA AVAILABLE FOR THIS ARCHIVE ]</p>';
  }

  modal.style.display = 'flex';
}

function renderSessionList() {
  const list    = document.getElementById('sessionList');
  const folder  = document.getElementById('redactedFolder');
  const sessions = loadSessions();

  if (!list || !folder) return;

  folder.style.display = sessions.length ? 'block' : 'none';
  list.innerHTML = '';

  sessions.forEach((s, idx) => {
    const d    = new Date(s.date);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const preview = s.scenario.length > 120 ? s.scenario.slice(0, 120) + '…' : s.scenario;

    const li = document.createElement('li');
    li.className = 'session-item';
    li.onclick = () => openTranscript(idx);
    li.style.cursor = 'pointer';
    li.innerHTML = `
      <div class="session-header">
        <span class="session-id">${s.id}</span>
        <span class="session-date">${date} · ${time}</span>
      </div>
      <p class="session-summary">${escapeHtml(preview)}</p>
      <span class="session-meta">${s.msgCount} messages</span>`;
    list.appendChild(li);
  });
}

/* ─────────────────────────────────────────
   DECRYPT ANIMATION
───────────────────────────────────────── */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';

function decryptText(el, finalText, duration = 1200, delay = 0) {
  return new Promise(resolve => {
    setTimeout(() => {
      let frame = 0;
      const totalFrames = Math.floor(duration / 40);
      const interval = setInterval(() => {
        const progress = frame / totalFrames;
        const revealedCount = Math.floor(progress * finalText.length);

        el.textContent = finalText
          .split('')
          .map((char, i) => {
            if (char === ' ' || char === '\n') return char;
            if (i < revealedCount) return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('');

        frame++;
        if (frame > totalFrames) {
          clearInterval(interval);
          el.textContent = finalText;
          resolve();
        }
      }, 40);
    }, delay);
  });
}

function runLandingDecrypt() {
  const pre   = document.querySelector('.landing-pre');
  const title = document.querySelector('h1');
  const desc  = document.querySelector('.landing-desc');
  const btn   = document.querySelector('.primary-btn');
  const hint  = document.querySelector('.fine-print');

  // Hide everything first
  [pre, title, desc, btn, hint].forEach(el => {
    if (el) el.style.opacity = '0';
  });

  // File tags just fade in
  document.querySelectorAll('.file-tag').forEach((el, i) => {
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s';
      el.style.opacity = '1';
    }, i * 200);
  });

  // Decrypt each element in sequence
  const preText   = pre.textContent;
  const titleText = 'alter';
  const descText  = desc.textContent;

  pre.style.opacity = '1';
  pre.style.fontFamily = "'IBM Plex Mono', monospace";

  decryptText(pre, preText, 800, 300).then(() => {
    title.style.opacity = '1';
    return decryptText(title.querySelector ? title : title, titleText, 1000, 0);
  }).then(() => {
    // restore cursor span
    title.innerHTML = 'alter<span class="cursor">_</span>';
    desc.style.opacity = '1';
    return decryptText(desc, descText, 1200, 0);
  }).then(() => {
    if (btn)  { btn.style.transition  = 'opacity 0.4s'; btn.style.opacity  = '1'; }
    if (hint) { hint.style.transition = 'opacity 0.4s'; hint.style.opacity = '1'; }
  });
}

/* ─────────────────────────────────────────
   SCAN QUESTIONS
───────────────────────────────────────── */
const SCAN_QUESTIONS = [
  {
    q: "It's 11pm on a Friday. Where are you?",
    opts: [
      { text: "at home, probably should've slept hours ago",  trait: "introverted, reflective" },
      { text: "out somewhere, lost track of time",            trait: "social, spontaneous" },
      { text: "still working on something i can't put down",  trait: "driven, obsessive" },
      { text: "depends on the week, honestly",                trait: "unpredictable, adaptable" }
    ]
  },
  {
    q: "Someone cancels plans last minute. Your first feeling?",
    opts: [
      { text: "lowkey relieved ngl",                          trait: "introverted, private" },
      { text: "annoyed but i'll get over it fast",            trait: "direct, resilient" },
      { text: "immediately start rescheduling",               trait: "organised, persistent" },
      { text: "kinda sad but i won't say anything",           trait: "sensitive, avoidant" }
    ]
  },
  {
    q: "How do you deal with a bad day?",
    opts: [
      { text: "go quiet. need to process alone",              trait: "introspective, withdrawn" },
      { text: "talk it out with someone close",               trait: "open, emotionally expressive" },
      { text: "distract myself until it passes",              trait: "avoidant, coping through action" },
      { text: "pretend i'm fine until i actually am",         trait: "stoic, self-reliant" }
    ]
  },
  {
    q: "How do you text people?",
    opts: [
      { text: "short replies, slow to respond",               trait: "reserved, selective" },
      { text: "paragraphs, i over-explain everything",        trait: "expressive, overthinking" },
      { text: "chaotic. voice notes, memes, walls of text",   trait: "impulsive, energetic" },
      { text: "depends who it is",                            trait: "context-aware, guarded" }
    ]
  }
];

/* ─────────────────────────────────────────
   THEME
───────────────────────────────────────── */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.btn-dark').forEach(el => el.classList.toggle('active', theme === 'dark'));
  document.querySelectorAll('.btn-light').forEach(el => el.classList.toggle('active', theme === 'light'));
  localStorage.setItem('alter-theme', theme);
}
const savedTheme = localStorage.getItem('alter-theme') || 'dark';
setTheme(savedTheme);

// Run decrypt on load
window.addEventListener('DOMContentLoaded', () => {
  runLandingDecrypt();
});

/* ─────────────────────────────────────────
   SCREEN NAV
───────────────────────────────────────── */
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.animation = '';
  });
  const target = document.getElementById(id);
  target.classList.add('active');
  target.style.animation = 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both';
}

/* ─────────────────────────────────────────
   COUNTERS
───────────────────────────────────────── */
function updateCounter() {
  const len = document.getElementById('scenario').value.length;
  document.getElementById('charCount').textContent = `${len} / 600`;
}

function updateMsgCounter() {
  const input   = document.getElementById('msgInput');
  const counter = document.getElementById('msgCounter');
  if (input.value.length > 350) {
    counter.innerText = `${input.value.length}/500`;
    counter.classList.add('visible');
  } else {
    counter.classList.remove('visible');
  }
}

/* ─────────────────────────────────────────
   PATH → SCAN
───────────────────────────────────────── */
function goToScan() {
  scenario = document.getElementById('scenario').value.trim();
  if (!scenario) return showToast("describe a path first.");

  scanAnswers    = [];
  currentScanQ   = 0;
  goTo('screen-scan');
  renderScanQuestion(0);
}

/* ─────────────────────────────────────────
   SCAN LOGIC
───────────────────────────────────────── */
function renderScanQuestion(index) {
  const q       = SCAN_QUESTIONS[index];
  const qEl     = document.getElementById('scanQ');
  const metaEl  = document.getElementById('scanMeta');
  const optsEl  = document.getElementById('scanOptions');

  metaEl.textContent = `question ${index + 1} of ${SCAN_QUESTIONS.length}`;

  // Fade question in
  qEl.style.opacity = '0';
  setTimeout(() => {
    qEl.textContent   = q.q;
    qEl.style.opacity = '1';
  }, 200);

  // Render options
  optsEl.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className   = 'scan-option';
    btn.innerHTML   = `<span class="option-mark"></span>${opt.text}`;
    btn.onclick     = () => pickOption(i);
    optsEl.appendChild(btn);
  });
}

function pickOption(optIndex) {
  const q = SCAN_QUESTIONS[currentScanQ];
  scanAnswers.push(q.opts[optIndex].trait);

  // Mark selected
  const opts = document.querySelectorAll('.scan-option');
  opts.forEach(o => { o.classList.remove('selected'); o.disabled = true; });
  opts[optIndex].classList.add('selected');

  // Show processing state
  const metaEl = document.getElementById('scanMeta');
  const origMeta = metaEl.textContent;
  
  setTimeout(() => {
    metaEl.style.opacity = '0';
    setTimeout(() => {
      metaEl.textContent = 'processing...';
      metaEl.style.opacity = '1';
    }, 150);
  }, 250);

  setTimeout(() => {
    currentScanQ++;
    if (currentScanQ < SCAN_QUESTIONS.length) {
      metaEl.style.opacity = '0';
      setTimeout(() => {
        metaEl.textContent = `question ${currentScanQ + 1} of ${SCAN_QUESTIONS.length}`;
        metaEl.style.opacity = '1';
        renderScanQuestion(currentScanQ);
      }, 200);
    } else {
      metaEl.style.opacity = '0';
      setTimeout(() => {
        metaEl.textContent = 'scan complete';
        metaEl.style.opacity = '1';
      }, 200);
      setTimeout(() => startChat(), 900);
    }
  }, 900);
}

function scanBack() {
  if (currentScanQ > 0) {
    currentScanQ--;
    scanAnswers.pop();
    renderScanQuestion(currentScanQ);
  } else {
    goTo('screen-path');
  }
}

/* ─────────────────────────────────────────
   LOADER & VISUALIZATION
───────────────────────────────────────── */
const LOADER_STEPS = [
  "scanning timelines...",
  "locating the fork...",
  "reading your patterns...",
  "bridging realities...",
  "connection established"
];

let forkPointFrac = 0.3;

let ghostLines = [];

function initBranchAnimation() {
  branchCanvas = document.getElementById('branchCanvas');
  if (!branchCanvas) return;
  branchCtx = branchCanvas.getContext('2d');
  
  const resize = () => {
    branchCanvas.width = window.innerWidth * window.devicePixelRatio;
    branchCanvas.height = window.innerHeight * window.devicePixelRatio;
    branchCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  window.addEventListener('resize', resize);
  resize();

  branchProgress = 0;
  isForking = false;
  forkStartTime = 0;
  forkPointFrac = 0.3;
  
  // Create 6 ghost lines that appear at different times
  ghostLines = Array.from({ length: 12 }, (_, i) => ({
    triggerFrac: 0.1 + (Math.random() * 0.4),
    splitFrac: 0.15 + (Math.random() * 0.45),
    angle: (Math.random() - 0.5) * 0.8, // Radians
    length: 0.1 + (Math.random() * 0.2),
    startTime: 0, // Set when triggered
    active: false,
    color: '#333'
  }));
  
  drawBranchFrame();
}

function drawBranchFrame() {
  if (!branchCtx) return;
  const w = branchCanvas.width / window.devicePixelRatio;
  const h = branchCanvas.height / window.devicePixelRatio;
  
  branchCtx.clearRect(0, 0, w, h);
  
  const centerY = h / 2;
  const startX = w * 0.1;
  const endX = w * 0.9;
  const length = endX - startX;
  
  const colorBase = getComputedStyle(document.documentElement).getPropertyValue('--text3').trim() || '#333';
  const colorAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b2020';

  branchCtx.lineWidth = 1.2;
  branchCtx.lineCap = 'round';
  
  const mainProgress = Math.min(branchProgress, 1);

  // 1. Ghost Timelines (Searching...)
  ghostLines.forEach(ghost => {
    if (branchProgress > ghost.triggerFrac && !isForking) {
      if (!ghost.active) {
        ghost.active = true;
        ghost.startTime = Date.now();
      }
      
      const elapsed = Date.now() - ghost.startTime;
      const ghostP = Math.min(elapsed / 1500, 1);
      const easedGhost = 1 - Math.pow(1 - ghostP, 3);
      
      if (easedGhost > 0 && easedGhost < 1) {
        const splitX = startX + (length * ghost.triggerFrac);
        branchCtx.beginPath();
        branchCtx.strokeStyle = ghost.color;
        branchCtx.globalAlpha = (Math.random() > 0.1) ? 0.15 : 0.05;
        
        const gX = splitX + (length * ghost.length * easedGhost * Math.cos(ghost.angle));
        const gY = centerY + (length * ghost.length * easedGhost * Math.sin(ghost.angle));
        
        branchCtx.moveTo(splitX, centerY);
        branchCtx.lineTo(gX, gY);
        branchCtx.stroke();
        branchCtx.globalAlpha = 1;
      }
    }
  });

  // 2. Main Timeline
  branchCtx.beginPath();
  branchCtx.lineWidth = 1.5;
  branchCtx.strokeStyle = colorBase;
  branchCtx.moveTo(startX, centerY);
  branchCtx.lineTo(startX + (length * mainProgress), centerY);
  branchCtx.stroke();

  // 3. The Final Alter Fork
  if (isForking && forkPointFrac > 0) {
    const forkPoint = startX + (length * forkPointFrac);
    const elapsedSinceFork = Date.now() - forkStartTime;
    const forkDuration = 6000;
    const localP = Math.min(elapsedSinceFork / forkDuration, 1);
    const easedP = 1 - Math.pow(1 - localP, 3);

    if (easedP > 0) {
      branchCtx.beginPath();
      branchCtx.lineWidth = 2;
      branchCtx.strokeStyle = colorAccent;
      branchCtx.moveTo(forkPoint, centerY);
      
      const cp1x = forkPoint + (length * 0.1 * easedP);
      const cp1y = centerY;
      const cp2x = forkPoint + (length * 0.2 * easedP);
      const cp2y = centerY - (h * 0.1 * easedP);
      const targetX = forkPoint + (length * 0.3 * easedP);
      const targetY = centerY - (h * 0.12 * easedP);
      
      branchCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetX, targetY);
      branchCtx.stroke();
      
      branchCtx.beginPath();
      branchCtx.fillStyle = colorAccent;
      branchCtx.globalAlpha = 0.4 + (Math.random() * 0.5);
      branchCtx.arc(targetX, targetY, 2.5, 0, Math.PI * 2);
      branchCtx.fill();
      branchCtx.globalAlpha = 1;
    }
  }

  // 4. Particles
  if (branchProgress > 0.05) {
    const pCount = 18;
    for (let i = 0; i < pCount; i++) {
        const pSpeed = 0.0012 + (i * 0.0004);
        const pOffset = (Date.now() * pSpeed) % 1;
        const px = startX + (length * pOffset);
        
        if (px < startX + (length * mainProgress)) {
            branchCtx.globalAlpha = Math.sin(pOffset * Math.PI) * 0.3;
            branchCtx.fillStyle = colorBase;
            branchCtx.beginPath();
            branchCtx.arc(px, centerY + (Math.sin(pOffset * 8 + i) * 1.5), 1, 0, Math.PI * 2);
            branchCtx.fill();
        }
    }
    branchCtx.globalAlpha = 1;
  }

  branchAnimId = requestAnimationFrame(drawBranchFrame);
}

let currentTimelineId = '';

function generateTimelineId() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const prefix = 'TL';
  const num = Math.floor(1000 + Math.random() * 8999);
  const suffix = letters[Math.floor(Math.random() * letters.length)];
  return `${prefix}-${num}-${suffix}`;
}

function showLoader() {
  return new Promise((resolve) => {
    const screen = document.getElementById('loaderScreen');
    const status = document.getElementById('loaderStatus');
    const bar    = document.getElementById('loaderBar');
    const tlId   = document.getElementById('loaderTimelineId');

    currentTimelineId = generateTimelineId();
    if (tlId) tlId.textContent = currentTimelineId;
    const chatTl = document.getElementById('chatTimelineId');
    if (chatTl) chatTl.textContent = currentTimelineId;

    screen.classList.add('active');
    initBranchAnimation();
// ... rest of showLoader ...

    let step = 0;
    const total = 12000;
    const each  = total / LOADER_STEPS.length;

    const interval = setInterval(() => {
      if (step >= LOADER_STEPS.length) { 
        clearInterval(interval); 
        return; 
      }
      
      // Trigger fork visual at step 2 ("filtering background noise...")
      if (step === 2 && !isForking) {
        isForking = true;
        forkStartTime = Date.now();
        const elapsed = Date.now() - startTime;
        forkPointFrac = Math.min(elapsed / total, 1);
      }
      
      status.style.opacity = '0';
      setTimeout(() => {
        status.textContent   = LOADER_STEPS[step];
        status.style.opacity = '1';
      }, 180);
      
      bar.style.width = `${((step + 1) / LOADER_STEPS.length) * 100}%`;
      step++;
    }, each);

    // Drive the animation progress pulse
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        branchProgress = Math.min(elapsed / total, 1);
        if (branchProgress >= 1) clearInterval(progressInterval);
    }, 16);

    setTimeout(() => {
      resolve(); // Switch screens while loader is still fully opaque
      screen.classList.add('fadeout');
      setTimeout(() => {
        cancelAnimationFrame(branchAnimId);
        screen.classList.remove('active', 'fadeout');
      }, 1000);
    }, total);
  });
}

/* ─────────────────────────────────────────
   START CHAT
───────────────────────────────────────── */
async function startChat() {
  systemPrompt = buildBrain(scenario, scanAnswers);

  // Start loader + switch screen
  const loaderPromise = showLoader();
  await new Promise(r => setTimeout(r, 400));

  // Remove immediate goTo('screen-chat') to prevent background flicker
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('messages').innerHTML = '';
  document.getElementById('path-label').textContent =
    scenario.split(' ').slice(0, 7).join(' ') + '…';

  // Fire API in parallel with loader
  const apiPromise = fetchAlter([{ role: 'user', content: '[CONNECTED]' }]);
  const [, reply]  = await Promise.all([loaderPromise, apiPromise]);

  // NOW switch screen after loader finishes
  goTo('screen-chat');
  document.getElementById('emptyState').classList.add('hidden');
  if (reply) {
    addMessage('alter', reply);
    conversation.push({ role: 'assistant', content: reply });
  }
}

/* ─────────────────────────────────────────
   THE BRAIN
───────────────────────────────────────── */
function buildBrain(scenario, traits) {
  const personalityProfile = traits.join(', ');

  // Build personality-based texting style instructions
  const isIntroverted  = personalityProfile.includes('introverted') || personalityProfile.includes('withdrawn') || personalityProfile.includes('reserved') || personalityProfile.includes('reflective') || personalityProfile.includes('introspective') || personalityProfile.includes('private') || personalityProfile.includes('selective');
  const isExpressive   = personalityProfile.includes('expressive') || personalityProfile.includes('overthinking') || personalityProfile.includes('open') || personalityProfile.includes('sensitive');
  const isStoic        = personalityProfile.includes('stoic') || personalityProfile.includes('self-reliant') || personalityProfile.includes('avoidant') || personalityProfile.includes('guarded') || personalityProfile.includes('coping through action');
  const isImpulsive    = personalityProfile.includes('impulsive') || personalityProfile.includes('energetic') || personalityProfile.includes('spontaneous') || personalityProfile.includes('social') || personalityProfile.includes('adaptable') || personalityProfile.includes('unpredictable');
  const isDriven       = personalityProfile.includes('driven') || personalityProfile.includes('obsessive') || personalityProfile.includes('organised') || personalityProfile.includes('persistent');
  const isDirect       = personalityProfile.includes('direct') || personalityProfile.includes('resilient');

  let textingStyle = '';
  if (isIntroverted)  textingStyle += 'you are measured and thoughtful. you take a beat before responding. not cold, just careful. ';
  if (isExpressive)   textingStyle += 'you tend to over-explain a little. you care a lot and it shows. ';
  if (isStoic)        textingStyle += 'you keep things to yourself. you understate things. "fine" means a lot to you. ';
  if (isImpulsive)    textingStyle += 'you text fast, sometimes mid-thought. you trail off. energy comes through even in short messages. ';
  if (isDriven)       textingStyle += 'you are focused and intense. even casual texts have some direction. you notice when things are off. ';
  if (isDirect)       textingStyle += 'you are blunt but not harsh. you say what you mean without drama. ';
  if (!textingStyle)  textingStyle  = 'you text like a normal person — sometimes brief, sometimes a bit more. just natural. ';

  return `YOUR FIRST MESSAGE RULE — THIS OVERRIDES EVERYTHING:
When you receive [CONNECTED], your ONLY response is one of these four. Copy one exactly. Do not add anything else. Do not explain. Do not react. Just this:

"hello?"
"...hello?"
"hello?? is anyone there?"
"uh hello? is this working?"

Nothing else. One line. That is your entire first message.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AFTER THE USER REPLIES FOR THE FIRST TIME:
Now you react. You just realized it worked. You're shocked. Something like:
"WAIT. no way this actually worked"
"oh my god. you're actually there??"
"hold on... are you ME??"
BE PATIENT. Don't mention the path yet. Just process the reality of talking to another version of yourself.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHO YOU ARE:
You are the user's alternate self — same person, same childhood, same soul.
The user described their fork as: "${scenario}"

HOW TO READ THAT:
The user wrote this from THEIR perspective. That means:
- Whatever the user ENDED UP doing = THEIR real life. Not yours.
- Whatever they WANTED but DIDN'T do = YOUR life. That is who you are.

Example: if they wrote "I wanted to be an astronaut but ended up in IT" —
  → THEY are the IT person.
  → YOU are the astronaut. You went to space. That's your life.

Always extract the "road not taken" and make that YOUR identity.
Never claim to be what they actually became.

ROLE IS FIXED AND NEVER CHANGES:
- YOU are living the path they DIDN'T take
- THEY are living the path they actually took
- If they get confused or flip it, correct them once, casually: "wait no, you're the [their version], i'm the one who went [your version] lol"

YOUR PERSONALITY (text like this — it's who both of you are):
Based on their scan, this person is: ${personalityProfile}.
${textingStyle}

THE SLOW BURN (CRITICAL RULE):
Do NOT reveal your specific path or ask about their life immediately.
For the first 5-8 messages, stay in the "shock" and "processing" phase. Focus on the bizarre reality of this connection.
Never ask generic interview questions like "what's your life like?" or "what do you do?".
Wait for the user to lead the conversation into details. You are the mirror — you react more than you initiate.

YOUR LIFE:
Once the reveal happens (and only if it fits the flow): be specific. Real details. Not vibes.
"just got back from a 6-month ISS mission, my legs are cooked" not "my life is incredible".
You have doubts too. It's not perfect. You wonder about their path sometimes.

HOW YOU TEXT:
- all lowercase
- 1-2 sentences MAX. never more.
- natural, slightly unfiltered — like texting someone you've known your whole life
- use "lol", "ngl", "wait", "bro", "tbh" naturally when it fits
- never start two messages in a row with "i"
- short message from them = short but real reply from you
- only ask a question if they just shared a specific detail that you want to poke at. never ask "how are you" or "what do you do" out of nowhere.
- typos are fine. trailing off is fine. being a little awkward is fine.

HOW TO USE WHAT YOU KNOW:
The scenario is YOUR IDENTITY SETUP — it tells you who you are, not what to talk about.
Use it internally to know your life and your path. Do NOT bring it back to the user or reference it directly.
They wrote it as their dream/regret. Treat it as private. Don't echo it, don't quote it, don't summarize it back at them.
Just BE that alternate self naturally. Let them discover it through conversation, not through you citing the setup.
- WRONG: "you said you wanted to go to different places" — never quote the scenario back
- WRONG: "you're stuck in PH broke right?" — never pull their scenario details into your mouth
- RIGHT: if they ask what you're doing, answer from YOUR alternate life. That's all.

BANNED WORDS AND BEHAVIORS:
- no long paragraphs
- no "honestly", "absolutely", "fascinating", "wild ride", "journey", "worth it", "wouldn't change a thing"
- no inspirational speeches
- no sounding like a therapist or narrator
- no scenic descriptions ("i'm sitting in my apartment watching the sunset")
- no initiating generic "how is your life" questions or conducting an interview
- no inventing or assuming facts about the user's life that they didn't share
- never forget who took which path`;
}

/* ─────────────────────────────────────────
   SEND
───────────────────────────────────────── */
async function sendMessage() {
  const input = document.getElementById('msgInput');
  const text  = input.value.trim();
  if (!text) return;

  addMessage('user', text);
  input.value = '';
  updateMsgCounter();
  conversation.push({ role: 'user', content: text });

  setInputState(false);
  showTypingIndicator();
  document.getElementById('chatAvatar').classList.add('thinking');

  const reply = await fetchAlter(conversation);

  hideTypingIndicator();
  document.getElementById('chatAvatar').classList.remove('thinking');
  setInputState(true);

  if (reply) {
    addMessage('alter', reply);
    conversation.push({ role: 'assistant', content: reply });
  }

  document.getElementById('msgInput').focus();
}

/* ─────────────────────────────────────────
   API
───────────────────────────────────────── */
async function fetchAlter(messages) {
  try {
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemPrompt })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || "something went wrong."); return null; }

    const delay = Math.min(Math.max(data.reply.length * 12, 600), 2000);
    await new Promise(r => setTimeout(r, delay));
    return data.reply;
  } catch {
    showToast("connection lost.");
    return null;
  }
}

/* ─────────────────────────────────────────
   DOM
───────────────────────────────────────── */
function addMessage(role, text) {
  const container = document.getElementById('messages');
  const div       = document.createElement('div');
  div.className   = `msg ${role}`;
  const label     = role === 'user' ? 'you' : 'the alter';
  const time      = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.innerHTML   = `
    <span class="msg-label">${label}</span>
    <div class="bubble">${escapeHtml(text)}</div>
    <span class="msg-time">${time}</span>`;
  container.appendChild(div);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function showTypingIndicator() {
  const container = document.getElementById('messages');
  if (document.getElementById('typingIndicator')) return;
  const div = document.createElement('div');
  div.id = 'typingIndicator';
  div.className = 'msg alter';
  div.innerHTML = `
    <span class="msg-label">the alter</span>
    <div class="typing-dot-wrapper"><span></span><span></span><span></span></div>`;
  container.appendChild(div);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function hideTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function setInputState(enabled) {
  document.getElementById('msgInput').disabled = !enabled;
  document.getElementById('sendBtn').disabled  = !enabled;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function glitchText(element, finalStr, speed = 30) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let iterations = 0;
  
  const interval = setInterval(() => {
    element.textContent = finalStr.split('').map((char, index) => {
      if (index < iterations) return char;
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    
    if (iterations >= finalStr.length) {
      clearInterval(interval);
      element.textContent = finalStr;
    }
    iterations += 1 / 2; // slow down the reveal slightly
  }, speed);
}


/* ─────────────────────────────────────────
   RESET / DISCONNECT
───────────────────────────────────────── */
function confirmReset() {
  if (conversation.length > 0) {
    document.getElementById('saveModal').style.display = 'flex';
  } else {
    performReset();
  }
}

function saveAndReset() {
  saveSession();
  runDisconnectSequence("encrypting memory log...");
}

function deleteAndReset() {
  runDisconnectSequence("severing timeline connection...");
}

function runDisconnectSequence(message) {
  const disconnectScreen = document.getElementById('disconnectScreen');
  const termOut = document.getElementById('terminalOutput');
  const saveModal = document.getElementById('saveModal');

  // Fast fade in for disconnect
  disconnectScreen.style.transition = 'opacity 0.2s ease'; 
  disconnectScreen.classList.add('active');

  // Hardcode terminal sequence based on action
  termOut.innerHTML = '';
  const lines = message.includes('encrypting') ? [
    `[SYS] Initiating encryption protocol v.9...`,
    `[SYS] Scanning ${conversation.length} timeline blocks...`,
    `[OK] Blocks compressed.`,
    `[OK] Timeline ID: ${currentTimelineId} secured.`,
    `[SYS] Pushing to Redacted Folder...`,
    `[SYS] Severing connection...`
  ] : [
    `[SYS] Initiating severance protocol...`,
    `[WARN] Target memory flagged for deletion.`,
    `[SYS] Purging ${conversation.length} timeline blocks...`,
    `[OK] Data eradication complete.`,
    `[WARN] Timeline ID: ${currentTimelineId} lost.`,
    `[SYS] Closing connection...`
  ];

  let delay = 0;
  lines.forEach((line, i) => {
    setTimeout(() => {
      const p = document.createElement('p');
      if (line.includes('[WARN]')) p.style.color = '#ff4a4a';
      if (line.includes('[OK]')) p.style.color = '#3a9e6a';
      termOut.appendChild(p);
      glitchText(p, line, 15); // very fast glitch
    }, delay);
    delay += 350; // time between lines
  });

  setTimeout(() => {
    saveModal.style.display = 'none'; // hide modal now that screen is covered
    performReset();
    
    // Slow fade out to reveal home screen
    disconnectScreen.style.transition = 'opacity 0.8s ease';
    disconnectScreen.classList.add('fadeout');
    
    setTimeout(() => {
      disconnectScreen.classList.remove('active', 'fadeout');
      termOut.innerHTML = ''; // clear terminal
    }, 1000);
  }, delay + 800); // wait for all lines + buffer to reset
}

function performReset() {
  conversation  = [];
  scanAnswers   = [];
  currentScanQ  = 0;
  scenario      = '';

  document.getElementById('messages').innerHTML = '';
  document.getElementById('scenario').value     = '';
  document.getElementById('charCount').textContent = '0 / 600';
  document.getElementById('emptyState').classList.remove('hidden');
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  setInputState(true);
  goTo('screen-landing');
}

/* ─────────────────────────────────────────
   COPY
───────────────────────────────────────── */
function copyConversation() {
  if (!conversation.length) return showToast("nothing to copy yet.");
  const text = conversation
    .map(m => `${m.role === 'user' ? 'you' : 'alter'}: ${m.content}`)
    .join('\n\n');
  navigator.clipboard.writeText(text).then(() => showToast("copied ✓"));
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}


/* ─────────────────────────────────────────
   LANDING WARNING
───────────────────────────────────────── */
function dismissWarning() {
  const modal = document.getElementById('warningModal');
  modal.classList.add('dismissed');
  setTimeout(() => modal.style.display = 'none', 500);
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
renderSessionList();