let currentQuestions = [];
let currentIndex = 0;
let answers = [];
let playerName = '';
let score = 0;
let isAnswered = false;
let timerInterval = null;
let timeLeft = 0;
let maxTime = 30;
let streak = 0;
let bestStreak = 0;
let totalTimeTaken = 0;
let quizStartTime = 0;

const app = document.getElementById('app');

// ─── SOUND ENGINE ───────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playCorrect() {
  playTone(523, 0.1);
  setTimeout(() => playTone(659, 0.1), 100);
  setTimeout(() => playTone(784, 0.2), 200);
}

function playWrong() {
  playTone(300, 0.15, 'sawtooth', 0.08);
  setTimeout(() => playTone(250, 0.25, 'sawtooth', 0.08), 150);
}

function playRomantic() {
  playTone(523, 0.15);
  setTimeout(() => playTone(659, 0.15), 150);
  setTimeout(() => playTone(784, 0.15), 300);
  setTimeout(() => playTone(1047, 0.4), 450);
}

function playTick() {
  playTone(800, 0.05, 'sine', 0.05);
}

// ─── SPLASH SCREEN ─────────────────────────────────────
function showSplash() {
  app.innerHTML = `
    <div class="splash" onclick="splashClick(event)">
      <div class="splash-inner">
        <div class="splash-heart">💖</div>
        <h1 class="splash-title">Untuk Nadira</h1>
        <p class="splash-sub">Dari Hilman untuk kamu 💕</p>
        <div class="splash-divider"></div>
        <p class="splash-caption">"Semangat belajar sayang!<br>Hilman selalu di samping kamu ❤️"</p>
        <div class="splash-tap">👆 Tekan di mana saja untuk lanjut</div>
      </div>
    </div>
  `;
  // Keyboard also triggers
  document.addEventListener('keydown', splashKeyHandler);
  setTimeout(() => document.querySelector('.splash')?.classList.add('show'), 100);
}

function splashKeyHandler() {
  document.removeEventListener('keydown', splashKeyHandler);
  showWelcome();
}

function splashClick(e) {
  document.removeEventListener('keydown', splashKeyHandler);
  showWelcome();
}

// ─── FLOATING HEARTS ───────────────────────────────────
function renderHearts() {
  const bg = document.querySelector('.hearts-bg');
  for (let i = 0; i < 20; i++) {
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.textContent = ['❤️', '💕', '💗', '💖', '💝', '🥰'][Math.floor(Math.random() * 6)];
    heart.style.left = Math.random() * 100 + '%';
    heart.style.fontSize = (14 + Math.random() * 20) + 'px';
    heart.style.animationDuration = (12 + Math.random() * 20) + 's';
    heart.style.animationDelay = Math.random() * 15 + 's';
    bg.appendChild(heart);
  }
}

// ─── WELCOME SCREEN ────────────────────────────────────
function showWelcome() {
  document.removeEventListener('keydown', splashKeyHandler);
  app.innerHTML = `
    <div class="card welcome">
      <div class="heart-icon">💖</div>
      <h1>Quiz PJOK 💕</h1>
      <p class="subtitle">Untuk Nadira tersayang, selamat belajar dan berlatih! 🥰</p>
      <p class="romantic-msg">"Semangat ya sayang! Hilman selalu support kamu ❤️"</p>
      <div class="topics-grid">
        <div class="topic-tag">🏐 Bola Voli</div>
        <div class="topic-tag">📏 Lompat Tinggi</div>
        <div class="topic-tag">🤸 Senam Ketangkasan</div>
        <div class="topic-tag">📐 Lompat Jauh</div>
        <div class="topic-tag">🏊 Renang Gaya Dada</div>
        <div class="topic-tag">🥋 Pencak Silat</div>
      </div>
      <div class="welcome-extra">
        <p class="extra-info">📝 ${totalQuestionCount()} soal • 💕 ${romanticQuestions.length} pertanyaan romantis</p>
        <p class="extra-info">⏱ ${maxTime} detik per soal • 🏆 dapat reward spesial!</p>
      </div>
      <input type="text" class="name-input" id="nameInput" placeholder="Masukkan nama kamu..." value="Nadira" maxlength="30">
      <button class="btn btn-primary" onclick="startQuiz()">Mulai Belajar Sayang! 🚀</button>
    </div>
  `;
  document.getElementById('nameInput')?.focus();
  document.getElementById('nameInput')?.select();
  document.getElementById('nameInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') startQuiz(); });
}

function totalQuestionCount() {
  let count = 0;
  for (const k of Object.keys(topicQuestions)) count += topicQuestions[k].length;
  return count;
}

// ─── START QUIZ ────────────────────────────────────────
function startQuiz() {
  const input = document.getElementById('nameInput');
  playerName = input?.value.trim() || 'Nadira';
  if (!playerName) playerName = 'Nadira';

  currentQuestions = buildQuizQuestions();
  currentIndex = 0;
  answers = [];
  score = 0;
  streak = 0;
  bestStreak = 0;
  totalTimeTaken = 0;
  quizStartTime = Date.now();

  if (currentQuestions.length === 0) {
    app.innerHTML = '<div class="card"><p>Tidak ada soal tersedia.</p></div>';
    return;
  }

  showQuestion();
}

// ─── SHOW QUESTION ─────────────────────────────────────
function showQuestion() {
  if (currentIndex >= currentQuestions.length) {
    showResult();
    return;
  }

  const q = currentQuestions[currentIndex];
  const total = currentQuestions.length;
  const progress = ((currentIndex) / total) * 100;
  const isRomantic = q.isRomantic;
  isAnswered = false;
  timeLeft = maxTime;
  clearInterval(timerInterval);

  app.innerHTML = `
    <div class="card">
      <div class="quiz-header">
        <div>
          <span class="progress-text">Soal ${currentIndex + 1} dari ${total}</span>
          ${streak >= 3 ? `<span class="streak-badge">🔥 ${strex}x</span>` : ''}
        </div>
        ${q.topic ? `<span class="topic-label">${isRomantic ? '💕 Romantis' : q.topic}</span>` : ''}
      </div>

      <div class="timer-bar-container">
        <div class="timer-bar" id="timerBar"></div>
        <span class="timer-text" id="timerText">${maxTime}s</span>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${progress}%"></div>
      </div>

      <div class="question-area">
        ${isRomantic
          ? '<div class="romantic-badge pulse-badge">💕 Pertanyaan Spesial dari Hilman</div>'
          : `<div class="question-label">${q.topic || 'PJOK'}</div>`}
        <div class="question-text">${q.question}</div>
      </div>

      <div class="options" id="optionsContainer">
        ${q.options.map((opt, idx) => `
          <button class="option" data-index="${idx}" onclick="selectOption(${idx})">
            <span class="opt-letter">${String.fromCharCode(65 + idx)}</span>
            <span class="opt-text">${opt}</span>
          </button>
        `).join('')}
      </div>

      <button class="btn btn-primary" id="nextBtn" style="display:none" onclick="nextQuestion()">
        ${currentIndex < total - 1 ? 'Selanjutnya →' : 'Lihat Hasil! 🎉'}
      </button>
    </div>
  `;

  startTimer();
}

// ─── TIMER ──────────────────────────────────────────────
function startTimer() {
  const bar = document.getElementById('timerBar');
  const text = document.getElementById('timerText');
  if (!bar) return;

  bar.style.width = '100%';
  bar.style.background = 'linear-gradient(90deg, #4caf50, #8bc34a)';

  timerInterval = setInterval(() => {
    timeLeft--;
    if (text) text.textContent = timeLeft + 's';

    const pct = (timeLeft / maxTime) * 100;
    bar.style.width = pct + '%';

    if (timeLeft <= 10) bar.style.background = 'linear-gradient(90deg, #ff9800, #ffc107)';
    if (timeLeft <= 5) {
      bar.style.background = 'linear-gradient(90deg, #f44336, #e91e63)';
      bar.style.animation = 'timerPulse 0.5s ease-in-out infinite';
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!isAnswered) {
        isAnswered = true;
        playTick();
        autoMarkWrong();
      }
    }
  }, 1000);
}

function autoMarkWrong() {
  const q = currentQuestions[currentIndex];
  const options = document.querySelectorAll('.option');
  const nextBtn = document.getElementById('nextBtn');

  options.forEach((opt, i) => {
    opt.classList.add('disabled');
    if (i === q.correct) opt.classList.add('correct');
  });

  answers.push({
    question: q.question,
    topic: q.topic,
    selected: -1,
    correct: q.correct,
    isCorrect: false,
    isRomantic: !!q.isRomantic,
    romanticMessage: q.romanticMessage || null,
    timedOut: true
  });

  streak = 0;
  nextBtn.style.display = 'block';
}

// ─── SELECT OPTION ─────────────────────────────────────
function selectOption(index) {
  if (isAnswered) return;
  isAnswered = true;
  clearInterval(timerInterval);

  const q = currentQuestions[currentIndex];
  const options = document.querySelectorAll('.option');
  const nextBtn = document.getElementById('nextBtn');
  const bar = document.getElementById('timerBar');

  // Stop timer animation
  if (bar) bar.style.animation = 'none';

  options.forEach((opt, i) => {
    opt.classList.add('disabled');
    if (i === q.correct) opt.classList.add('correct');
    if (i === index && i !== q.correct) opt.classList.add('wrong');
    if (i === index) opt.classList.add('selected');
  });

  const isCorrect = index === q.correct;
  if (isCorrect) {
    score++;
    streak++;
    if (streak > bestStreak) bestStreak = streak;
    if (q.isRomantic) playRomantic();
    else playCorrect();
  } else {
    streak = 0;
    playWrong();
  }

  timeLeft = Math.max(0, timeLeft);
  totalTimeTaken += maxTime - timeLeft;

  answers.push({
    question: q.question,
    topic: q.topic,
    selected: index,
    correct: q.correct,
    isCorrect,
    isRomantic: !!q.isRomantic,
    romanticMessage: q.romanticMessage || null,
    timedOut: false,
    options: q.options
  });

  nextBtn.style.display = 'block';
  nextBtn.focus();
}

// ─── NEXT QUESTION ─────────────────────────────────────
function nextQuestion() {
  clearInterval(timerInterval);
  currentIndex++;
  showQuestion();
}

// ─── SHOW RESULT ───────────────────────────────────────
function showResult() {
  clearInterval(timerInterval);
  const total = currentQuestions.length;
  const percentage = Math.round((score / total) * 100);
  const isPass = percentage >= 70;

  const romanticAnswers = answers.filter(a => a.isRomantic);
  const romanticCorrect = romanticAnswers.filter(a => a.isCorrect).length;
  const timedOut = answers.filter(a => a.timedOut).length;

  // Save
  saveResult(playerName, score, total, percentage, answers);

  // Topic scores
  const topicScores = {};
  answers.forEach(a => {
    if (!a.isRomantic) {
      if (!topicScores[a.topic]) topicScores[a.topic] = { correct: 0, total: 0 };
      topicScores[a.topic].total++;
      if (a.isCorrect) topicScores[a.topic].correct++;
    }
  });

  let topicSummaryHtml = Object.entries(topicScores).map(([topic, data]) => {
    const pct = Math.round((data.correct / data.total) * 100);
    return `
      <div class="summary-row">
        <span class="topic-name">${topic}</span>
        <span class="topic-score ${pct >= 70 ? 'pass' : 'fail'}">${data.correct}/${data.total} (${pct}%)</span>
      </div>
    `;
  }).join('');

  let romanticMsg = '';
  if (romanticAnswers.length > 0) {
    romanticMsg = `
      <div class="reward-message">
        💕 Pertanyaan Romantis: ${romanticCorrect}/${romanticAnswers.length} dijawab bener<br>
        ${romanticCorrect === romanticAnswers.length ? 'Kamu sayang Hilman banget! 🥰💖' : 'Hilman tetep sayang kamu kok! ❤️'}
      </div>
    `;
  }

  // Love meter
  const lovePct = romanticAnswers.length > 0 ? Math.round((romanticCorrect / romanticAnswers.length) * 100) : 0;
  const loveMeter = lovePct >= 80 ? '💖💖💖💖💖' : lovePct >= 60 ? '💖💖💖💖' : lovePct >= 40 ? '💖💖💖' : lovePct >= 20 ? '💖💖' : '💖';

  const icon = isPass ? '🎉' : '😢';
  const message = isPass
    ? `Selamat ${playerName}! Kamu hebat banget! Hilman bangga sama kamu! 🥰💕`
    : `Semangat ${playerName}! Belajar lagi ya sayang, Hilman yakin kamu pasti bisa! 💪💕`;

  app.innerHTML = `
    <div class="card result">
      <div class="result-icon">${icon}</div>
      <h2>${isPass ? 'Selamat Sayang! 🎉' : 'Semangat Sayang! 💪'}</h2>
      <div class="score-text">${score}/${total}</div>
      <div class="score-detail">Nilai: ${percentage}% ${timedOut > 0 ? `• ⏱ ${timedOut} soal kehabisan waktu` : ''}</div>
      <p style="color:#666;margin-bottom:16px;">${message}</p>

      <div class="love-meter">
        <span>Love Meter: ${loveMeter}</span>
        <span style="font-size:12px;color:#95a5a6;">${lovePct}% cinta 💕</span>
      </div>

      ${romanticMsg}

      <div class="result-stats-row">
        <div class="stat-mini">
          <span class="stat-mini-value">🔥 ${bestStreak}</span>
          <span class="stat-mini-label">Streak Terbaik</span>
        </div>
        <div class="stat-mini">
          <span class="stat-mini-value">⏱ ${Math.round(totalTimeTaken / Math.max(1, total - timedOut))}s</span>
          <span class="stat-mini-label">Rata-rata Waktu</span>
        </div>
        <div class="stat-mini">
          <span class="stat-mini-value">${Math.round((score / Math.max(1, total - timedOut)) * 100)}%</span>
          <span class="stat-mini-label">Akurasi (dijawab)</span>
        </div>
      </div>

      <div class="score-summary">
        <h4>📊 Detail Nilai per Topik</h4>
        ${topicSummaryHtml}
      </div>

      <div class="action-buttons">
        <button class="btn btn-primary" onclick="showReview()">📋 Review Jawaban</button>
        <button class="btn btn-success" onclick="showReward()">🎁 Ambil Reward Spesial!</button>
        <button class="btn btn-secondary" onclick="showWelcome()">🔄 Coba Lagi</button>
      </div>
    </div>
  `;

  if (isPass) setTimeout(() => showReward(), 600);
}

// ─── REVIEW MODE ───────────────────────────────────────
function showReview() {
  const html = answers.map((a, i) => {
    const isRomantic = a.isRomantic;
    const correctOpt = a.options ? a.options[a.correct] : '';
    const selectedOpt = a.options && a.selected >= 0 ? a.options[a.selected] : 'Tidak dijawab';

    let answerText = a.isCorrect ? '✅ Benar' : (a.timedOut ? '⏱ Kehabisan waktu' : '❌ Salah');

    let explanation = '';
    if (a.timedOut) {
      explanation = `<p class="review-explain">Jawaban yang benar: <strong>${String.fromCharCode(65 + a.correct)}. ${correctOpt}</strong></p>`;
    } else if (!a.isCorrect) {
      explanation = `<p class="review-explain">Jawaban kamu: <strong>${String.fromCharCode(65 + a.selected)}. ${selectedOpt}</strong> &nbsp;|&nbsp; Jawaban benar: <strong>${String.fromCharCode(65 + a.correct)}. ${correctOpt}</strong></p>`;
    }

    return `
      <div class="review-item ${a.isCorrect ? 'review-correct' : 'review-wrong'}">
        <div class="review-header">
          <span class="review-num">${i + 1}</span>
          <span class="review-topic">${isRomantic ? '💕' : a.topic}</span>
          <span class="review-status">${answerText}</span>
        </div>
        <p class="review-question">${a.question}</p>
        ${explanation}
        ${isRomantic && a.romanticMessage ? `<p class="review-romantic-msg">${a.romanticMessage}</p>` : ''}
      </div>
    `;
  }).join('');

  app.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;">📋 Review Jawaban</h2>
        <span style="font-size:14px;font-weight:600;color:#7b1fa2;">${score}/${answers.length}</span>
      </div>
      <div class="review-list">
        ${html}
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;flex-direction:column;">
        <button class="btn btn-primary" onclick="showResult()">← Kembali ke Hasil</button>
        <button class="btn btn-secondary" onclick="showWelcome()">🔄 Coba Lagi</button>
      </div>
    </div>
  `;
}

// ─── REWARD ────────────────────────────────────────────
function showReward() {
  const romanticAnswers = answers.filter(a => a.isRomantic);
  const lastRomantic = romanticAnswers[romanticAnswers.length - 1];

  const overlay = document.getElementById('rewardOverlay');
  const modal = overlay.querySelector('.reward-modal');

  const messages = [
    "Kamu adalah yang terbaik! 💖",
    "Hilman bangga banget sama kamu! 🥰",
    "Pokoknya kamu juara! 🏆",
    "Love you more than anything! 💕",
    "Semoga kita selalu bersama! 💑",
    "Nggak ada yang bisa ngalahin kamu! 🌟",
    "Bikin Hilman makin sayang! 💗"
  ];

  let text = lastRomantic?.romanticMessage
    ? `${lastRomantic.romanticMessage}<br><br>${messages[Math.floor(Math.random() * messages.length)]}`
    : messages.join('<br><br>');

  modal.querySelector('.reward-text').innerHTML = text;
  overlay.classList.add('show');
  startConfetti();
  try { playRomantic(); } catch (e) {}
}

function closeReward() {
  document.getElementById('rewardOverlay').classList.remove('show');
  stopConfetti();
}

function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const emojis = ['💖', '💕', '💗', '💝', '🥰', '✨', '🌟', '🎉'];
  const particles = [];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: 12 + Math.random() * 16,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 1.2 + Math.random() * 2.5,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 6
    });
  }

  let animId;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      if (p.y < canvas.height + 20) active = true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.font = p.size + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    });

    if (active) animId = requestAnimationFrame(animate);
  }

  animate();
  canvas._confettiAnim = animId;
}

function stopConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (canvas._confettiAnim) cancelAnimationFrame(canvas._confettiAnim);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── SAVE RESULT ───────────────────────────────────────
function saveResult(name, score, total, percentage, answers) {
  const result = {
    name,
    score,
    total,
    percentage,
    bestStreak,
    totalTimeTaken,
    answers,
    timestamp: new Date().toISOString(),
    id: Date.now()
  };

  // Save locally as cache
  const localResults = JSON.parse(localStorage.getItem('pjokQuizResults') || '[]');
  localResults.push(result);
  localStorage.setItem('pjokQuizResults', JSON.stringify(localResults));

  // Save to cloud (GitHub Gist) — cross-device
  fetch('/api/gist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  }).catch(() => {
    console.log('Cloud save unavailable (offline or first deploy)');
  });
}

// ─── KEYBOARD SUPPORT ──────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (isAnswered) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      const btn = document.getElementById('nextBtn');
      if (btn && btn.style.display !== 'none') btn.click();
    }
    return;
  }

  const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
  const idx = keyMap[e.key?.toLowerCase()];
  if (idx !== undefined && !isAnswered) {
    const opt = document.querySelector(`.option[data-index="${idx}"]`);
    if (opt) opt.click();
  }
});

// ─── INIT ──────────────────────────────────────────────
renderHearts();
showSplash();

window.addEventListener('resize', () => {
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
});
