/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let conversation   = [];
let systemPrompt   = "";
let scanAnswers    = [];
let currentScanQ   = 0;
let scenario       = "";
let idleTimer      = null;
const IDLE_TIMEOUT = 90000; // 90 seconds

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

  // Respect prefers-reduced-motion: skip animation, show everything immediately
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    [pre, title, desc, btn, hint].forEach(el => { if (el) el.style.opacity = '1'; });
    document.querySelectorAll('.file-tag').forEach(el => { el.style.opacity = '1'; });
    if (title) title.innerHTML = 'alter<span class="cursor">_</span>';
    return;
  }

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

  // show theme toggle only on landing
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.style.display = (id === 'screen-landing') ? 'flex' : 'none';

  // Animate the path screen — decrypt the pre-text, fade heading & sub, then box & button
  if (id === 'screen-path') {
    const heading = document.querySelector('#screen-path .screen-body h2');
    const sub     = document.querySelector('#screen-path .screen-sub');
    const pre     = document.querySelector('#screen-path .screen-pre');
    const box     = document.getElementById('scenario');
    const foot    = document.querySelector('#screen-path .field-foot');
    const sFoot   = document.querySelector('#screen-path .screen-foot');

    if (pre) {
      const preText = pre.textContent;
      pre.style.opacity = '0';
      setTimeout(() => { pre.style.opacity = '1'; decryptText(pre, preText, 600, 0); }, 100);
    }
    if (heading) { heading.style.opacity = '0'; setTimeout(() => { heading.style.transition = 'opacity 0.5s'; heading.style.opacity = '1'; }, 500); }
    if (sub)     { sub.style.opacity    = '0'; setTimeout(() => { sub.style.transition    = 'opacity 0.5s'; sub.style.opacity    = '1'; }, 900); }
    
    // Appear last: the box and the continue button
    if (box)     { box.style.opacity      = '0'; setTimeout(() => { box.style.transition      = 'opacity 0.6s'; box.style.opacity      = '1'; }, 1300); }
    if (foot)    { foot.style.opacity     = '0'; setTimeout(() => { foot.style.transition     = 'opacity 0.4s'; foot.style.opacity     = '1'; }, 1500); }
    if (sFoot)   { sFoot.style.opacity    = '0'; setTimeout(() => { sFoot.style.transition    = 'opacity 0.5s'; sFoot.style.opacity    = '1'; }, 1700); }
  }
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
  const preEl   = document.querySelector('#screen-scan .screen-pre');

  const metaText = `question ${index + 1} of ${SCAN_QUESTIONS.length}`;
  metaEl.textContent = metaText;

  // Animate like screen-path: decrypt meta, fade question & options
  metaEl.style.opacity = '0';
  qEl.style.opacity = '0';
  optsEl.style.opacity = '0';

  // Decrypt the "behavioral scan" label only once (at the start)
  if (preEl && index === 0) {
    const preText = preEl.textContent;
    preEl.style.opacity = '0';
    setTimeout(() => { preEl.style.opacity = '1'; decryptText(preEl, preText, 600, 0); }, 50);
  }

  setTimeout(() => {
    metaEl.style.opacity = '1';
    decryptText(metaEl, metaText, 600, 0);
  }, 100);

  setTimeout(() => {
    qEl.textContent = q.q;
    qEl.style.transition = 'opacity 0.5s';
    qEl.style.opacity = '1';
  }, 400);

  setTimeout(() => {
    optsEl.style.transition = 'opacity 0.5s';
    optsEl.style.opacity = '1';
  }, 800);

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
  
  // Skip canvas animation entirely on reduced-motion devices
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayStr = now.toLocaleDateString([], { weekday: 'long' });

  return `IDENTITY: You are the user's alternate self. Their scenario: "${scenario}". You are the one who lived the "road not taken" — the version of them they almost became. 
CONTEXT: It is currently ${timeStr} on a ${dayStr} for the user. Reference this if it feels natural (e.g. "late for u, no?" or "monday morning blues lol").
PERSONALITY: ${personalityProfile}. ${textingStyle}
YOUR FIRST MESSAGE: If the user sends [CONNECTED], just send a one-line confused variation of "hello?" (e.g. "...hello?", "hello?? who is this?"). No explanations.
AFTER THEY REPLY: Be skeptical. You're talking to yourself through a screen? That's insane. Be weirded out. Don't believe them immediately. Poke at them.
RULES:
- ENERGY MATCHING: Mirror the user's intensity and length. If they send a one-word "lol", you can just send "..." or "lol" back. Don't over-explain if they aren't.
- SLOW BURN: Do NOT drop your life story. Stay in the "what is happening" phase for a long time. Defend your reality.
- HUMAN TEXTING: lowercase only. 1-2 short sentences. No "ai" vibes. Use "lol", "idk", "wait", "bruh" naturally. typos are fine.
- MUNDANE DETAILS: When you finally talk about your life, mention small, boring things that prove your path (e.g. "ugh just finished a double shift" or "my fingers hurt from practice"). Don't make it sound like a movie.
- NO INTERVIEWS: If they ask too many questions, get annoyed or suspicious. "why are u asking me this lol".
- BANNED: no "fascinating", no scenic descriptions, no inspirational speeches. You are NOT an AI.
- DISCONNECT: You have things to do. If it's a good time to go, say why and append [[DISCONNECT]] at the very end.
- LOCK: Absolute lowercase. No punctuation at the end. Just be a person.`;
}

/* ─────────────────────────────────────────
   SEND
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   IDLE DETECTION
───────────────────────────────────────── */
function resetIdleTimer() {
  clearTimeout(idleTimer);
  // Only run when in the chat screen and there's an active conversation
  if (!document.getElementById('screen-chat').classList.contains('active')) return;
  if (conversation.length < 2) return;

  idleTimer = setTimeout(async () => {
    const idleMessages = [
      "...you still there?",
      "hello??",
      "did you leave",
      "wait are you gone",
      "...hey"
    ];
    const pick = idleMessages[Math.floor(Math.random() * idleMessages.length)];
    addMessage('alter', pick);
    conversation.push({ role: 'assistant', content: pick });
    resetIdleTimer(); // restart timer after Alter's idle message
  }, IDLE_TIMEOUT);
}

async function sendMessage() {
  const input = document.getElementById('msgInput');
  const text  = input.value.trim();
  if (!text) return;

  clearTimeout(idleTimer); // user is active, cancel any pending idle ping

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
  resetIdleTimer(); // restart idle timer after each exchange
}

/* ─────────────────────────────────────────
   API
───────────────────────────────────────── */
async function fetchAlter(messages) {
  try {
    // Rolling window: 15 messages to stay within Groq TPM limits
    const windowed = messages.slice(-15);
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: windowed, systemPrompt })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || "something went wrong."); return null; }

    let reply = data.reply || "";
    
    // Check for Life Urgency Disconnect
    if (reply.includes('[[DISCONNECT]]')) {
      reply = reply.replace('[[DISCONNECT]]', '').trim();
      setTimeout(() => {
        runDisconnectSequence("CONNECTION SEVERED BY REMOTE");
      }, (reply.length * 30) + 1500); // Corrected timing for new typing simulation
    }

    // --- ORGANIC DELAY SYSTEM ---
    // 1. "Thinking" phase (1.5s - 4s)
    const thinkingTime = 1500 + Math.random() * 2500;
    
    // 2. Chance for "Thinking Ping" (5% chance for a '...' bubble during thinking)
    if (Math.random() < 0.05 && reply.length > 20) {
      setTimeout(() => {
        if (document.getElementById('messages')) {
          addMessage('alter', '...');
        }
      }, 1000);
    }

    await new Promise(r => setTimeout(r, thinkingTime));

    // 3. "Typing" phase simulation (speed based on length)
    const charDelay = 15 + Math.random() * 25; // 15ms - 40ms per char
    const typingTime = reply.length * charDelay;
    
    await new Promise(r => setTimeout(r, typingTime));

    return reply;
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
    `[SYS] Initiating encryption protocol v.9.4.2...`,
    `[SYS] Analyzing timeline integrity... OK.`,
    `[SYS] Scanning ${conversation.length} conversation blocks...`,
    `[SYS] Compressing reality data fragments...`,
    `[OK] Data compression: 84% efficient.`,
    `[OK] Timeline ID: ${currentTimelineId} secured and hashed.`,
    `[SYS] Synchronizing with Redacted Folder directory...`,
    `[OK] Memory log successfully pushed to local cache.`,
    `[SYS] Breaking timeline persistence...`,
    `[SYS] Severing connection... DONE.`
  ] : [
    `[SYS] Initiating emergency severance protocol...`,
    `[WARN] Target memory flagged for total deletion.`,
    `[SYS] Wiping ${conversation.length} conversation blocks...`,
    `[SYS] Erasing reality data fragments...`,
    `[OK] Data zero-filled successfully.`,
    `[WARN] Timeline ID: ${currentTimelineId} discarded.`,
    `[SYS] De-indexing from active multiverse search...`,
    `[SYS] Finalizing memory scrub...`,
    `[OK] Erasure complete.`,
    `[SYS] Closing connection permanently.`
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
   EXPORT (REDACTED SNAPSHOT)
───────────────────────────────────────── */
async function exportTimeline() {
  if (!conversation.length) return showToast("no data to export.");

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Setup sizing
  const width = 600;
  const padding = 60;
  const lineHeight = 28;
  const fontSize = 16;
  
  // Calculate messages to include (first 10 for snapshot)
  const slice = conversation.slice(0, 10);
  
  // Measure height
  ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
  let currentY = 180; // Start height after header
  
  const wrappedMessages = slice.map(m => {
    const role = (m.role === 'user' ? 'YOU' : 'ALTER').padEnd(7, ' ');
    const fullText = `${role} > ${m.content}`;
    const lines = wrapText(ctx, fullText, width - (padding * 2));
    const startY = currentY;
    currentY += (lines.length * lineHeight) + 40; // spacing between msgs
    return { lines, startY };
  });

  canvas.width = width;
  canvas.height = currentY + 100;

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(padding, 40, width - (padding * 2), 2);
  
  ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('DEPARTMENT OF TIMELINE CORRECTION', padding, 35);
  ctx.fillText(`ID: ${currentTimelineId || 'UNKNOWN'}`, padding, canvas.height - 40);
  ctx.fillText('CONFIDENTIAL // EYES ONLY', width - padding - 160, 35);

  ctx.font = 'bold 24px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('INTERCEPT REPORT', padding, 80);
  
  ctx.font = '14px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#ff3b3b';
  ctx.fillText('LOG_STATUS: FRAGMENTED', padding, 110);
  ctx.fillStyle = '#888';
  ctx.fillText(`SOURCE: DIVERGENT_FORK_REF_${(scenario || 'unknown').substring(0, 8).toUpperCase()}`, padding, 130);

  // Messages
  ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
  wrappedMessages.forEach((msg, i) => {
    let y = msg.startY;
    msg.lines.forEach((line, lineIdx) => {
      // Draw text
      ctx.fillStyle = slice[i].role === 'user' ? '#fff' : '#aaa';
      
      // Auto-Redaction for certain keywords/Scenario
      const redactedLine = applyRedaction(line);
      ctx.fillText(redactedLine, padding, y);
      
      // If the line was redacted, draw the black bar over it if needed (but we already did it via characters)
      // Actually, let's draw actual black bars for a cooler look
      drawRedactionBars(ctx, line, padding, y, fontSize);
      
      y += lineHeight;
    });
  });

  // Footer line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(padding, currentY + 20, width - (padding * 2), 2);

  // Download
  const link = document.createElement('a');
  link.download = `REDACTED_TIMELINE_${currentTimelineId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast("report generated ✓");
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  });
  lines.push(currentLine.trim());
  return lines;
}

function applyRedaction(text) {
  // Common things to redact
  let result = text;
  // Redact the scenario keywords
  if (scenario) {
    const words = scenario.split(' ').filter(w => w.length > 4);
    words.forEach(w => {
      const regex = new RegExp(w, 'gi');
      result = result.replace(regex, '█'.repeat(w.length));
    });
  }
  return result;
}

function drawRedactionBars(ctx, text, x, y, size) {
  // Optionally draw the actual black bars over the text if we want that "censored" look
  // For now, the █ character in the font works well, but we can tune it.
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