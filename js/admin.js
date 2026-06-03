let currentFilter = 'all';
let expandedId = null;
let adminPassword = '';

const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    if (e.message.includes('Unauthorized')) throw e;
    if (e.message.includes('Failed to fetch')) {
      throw new Error('Gagal terhubung ke server. Pastikan sudah di-deploy ke Vercel.');
    }
    throw e;
  }
}

async function loadResults() {
  const container = document.getElementById('resultsContainer');
  const totalEl = document.getElementById('totalAttempts');
  const avgEl = document.getElementById('avgScore');
  const bestEl = document.getElementById('bestScore');

  let results = [];
  try {
    results = await apiCall(`gist?password=${encodeURIComponent(adminPassword)}`);
  } catch (e) {
    container.innerHTML = `
      <div class="empty-state" style="border:2px solid #ffcdd2;">
        <div class="empty-icon">⚠️</div>
        <h3>Gagal memuat data</h3>
        <p style="color:#e91e63;">${e.message}</p>
        <button class="btn btn-primary" style="margin-top:12px;" onclick="loadResults()">🔄 Coba Lagi</button>
      </div>
    `;
    totalEl.textContent = '—';
    avgEl.textContent = '—%';
    bestEl.textContent = '—%';
    return;
  }

  if (!results || results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>Belum ada hasil quiz</h3>
        <p>Nadira belum mengerjakan quiz. Tunggu ya...</p>
        <p style="font-size:12px;color:#bdc3c7;margin-top:8px;">Data tersimpan di cloud Vercel Blob ☁️</p>
      </div>
    `;
    totalEl.textContent = '0';
    avgEl.textContent = '0%';
    bestEl.textContent = '0%';
    return;
  }

  totalEl.textContent = results.length;

  const percentages = results.map(r => r.percentage);
  avgEl.textContent = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) + '%';
  bestEl.textContent = Math.max(...percentages) + '%';

  // Filter by name
  let filtered = results;
  if (currentFilter !== 'all') {
    filtered = results.filter(r => r.name === currentFilter);
  }

  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const names = [...new Set(results.map(r => r.name))];

  const filterContainer = document.getElementById('filterContainer');
  filterContainer.innerHTML = `
    <select class="filter-select" onchange="changeFilter(this.value)">
      <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>Semua</option>
      ${names.map(n => `<option value="${n}" ${currentFilter === n ? 'selected' : ''}>${n}</option>`).join('')}
    </select>
  `;

  const rows = filtered.map(r => {
    const date = new Date(r.timestamp);
    const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const pass = r.percentage >= 70;
    const isExpanded = expandedId === r.id;

    const romanticCount = r.answers ? r.answers.filter(a => a.isRomantic).length : 0;
    const timedOutCount = r.answers ? r.answers.filter(a => a.timedOut).length : 0;

    return `
      <div class="result-card ${pass ? 'pass' : 'fail'}">
        <div class="result-card-header" onclick="toggleDetail(${r.id})">
          <div class="result-card-info">
            <span class="result-name">${r.name}</span>
            <span class="result-date">${dateStr}</span>
          </div>
          <div class="result-card-stats">
            ${timedOutCount > 0 ? `<span style="font-size:11px;color:#ff9800;">⏱${timedOutCount}</span>` : ''}
            <span class="result-badge ${pass ? 'badge-pass' : 'badge-fail'}">${r.percentage}%</span>
            <span class="result-score">${r.score}/${r.total}</span>
            <span class="expand-icon">${isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
        ${isExpanded ? `
          <div class="result-card-detail">
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              <span style="font-size:12px;color:#7b1fa2;">🔥 Streak: ${r.bestStreak || '-'}</span>
              <span style="font-size:12px;color:#7b1fa2;">⏱ Waktu: ${r.totalTimeTaken ? Math.round(r.totalTimeTaken / Math.max(1, r.total - timedOutCount)) + 's/soal' : '-'}</span>
              ${romanticCount > 0 ? `<span style="font-size:12px;color:#e91e63;">💕 ${romanticCount} soal romantis</span>` : ''}
            </div>
            <div class="detail-topics">
              ${getTopicBreakdown(r.answers)}
            </div>
            <div class="detail-answers">
              <h4>Detail Jawaban:</h4>
              ${r.answers.map((a, i) => `
                <div class="answer-item ${a.isCorrect ? 'correct' : 'wrong'}">
                  <span class="answer-num">${i + 1}.</span>
                  <span class="answer-text">${a.isRomantic ? '💕 ' : ''}${(a.question || '').substring(0, 60)}${(a.question || '').length > 60 ? '...' : ''}</span>
                  <span class="answer-status">${a.isCorrect ? '✅' : a.timedOut ? '⏱' : '❌'}</span>
                </div>
              `).join('')}
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteResult(${r.id})">🗑 Hapus</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = rows;
}

function getTopicBreakdown(answers) {
  if (!answers) return '';
  const topics = {};
  answers.forEach(a => {
    if (a.isRomantic) return;
    if (!topics[a.topic]) topics[a.topic] = { correct: 0, total: 0 };
    topics[a.topic].total++;
    if (a.isCorrect) topics[a.topic].correct++;
  });

  return Object.entries(topics).map(([topic, data]) => {
    const pct = Math.round((data.correct / data.total) * 100);
    return `
      <div class="topic-chip ${pct >= 70 ? 'pass' : 'fail'}">
        <span class="chip-name">${topic}</span>
        <span class="chip-score">${data.correct}/${data.total}</span>
      </div>
    `;
  }).join('');
}

function toggleDetail(id) {
  expandedId = expandedId === id ? null : id;
  loadResults();
}

function changeFilter(value) {
  currentFilter = value;
  expandedId = null;
  loadResults();
}

async function deleteResult(id) {
  if (!confirm('Hapus hasil ini dari cloud?')) return;
  try {
    await apiCall(`gist?password=${encodeURIComponent(adminPassword)}&id=${id}`);
    if (expandedId === id) expandedId = null;
    loadResults();
  } catch (e) {
    alert('Gagal menghapus: ' + e.message);
  }
}

async function clearAllResults() {
  if (!confirm('Hapus SEMUA hasil quiz dari cloud? Data tidak bisa dikembalikan!')) return;
  if (!confirm('Yakin banget nih?')) return;
  try {
    await apiCall(`gist?password=${encodeURIComponent(adminPassword)}&clear=true`);
    expandedId = null;
    loadResults();
  } catch (e) {
    alert('Gagal menghapus: ' + e.message);
  }
}

function checkAuth() {
  const pw = prompt('Masukkan password admin:');
  if (!pw) return;

  fetch(`/api/gist?password=${encodeURIComponent(pw)}`)
    .then(res => {
      if (res.status === 401) throw new Error('Password salah!');
      if (!res.ok) throw new Error('Server error (HTTP ' + res.status + '). Cek Vercel Blob sudah di-enable?');
      return res.json();
    })
    .then(() => {
      adminPassword = pw;
      document.getElementById('authScreen').style.display = 'none';
      document.getElementById('dashboardScreen').style.display = 'block';
      document.getElementById('cloudStatus').textContent = '☁️ Cloud • Vercel Blob';
      loadResults();
    })
    .catch((err) => {
      const isWrongPw = err.message.includes('Password salah');
      document.body.innerHTML = `
        <div class="container" style="text-align:center;">
          <div class="card">
            <h2 style="color:#e91e63;">${isWrongPw ? '❌ Akses Ditolak' : '⚠️ Error Server'}</h2>
            <p style="color:#666;margin:16px 0;">${err.message}</p>
            ${isWrongPw ? '' : '<p style="font-size:13px;color:#e91e63;">💡 Pastikan Vercel Blob sudah di-enable: <strong>Vercel Dashboard → Storage → Create Blob</strong></p>'}
            <button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button>
          </div>
        </div>
      `;
    });
}

async function exportData() {
  try {
    const results = await apiCall(`gist?password=${encodeURIComponent(adminPassword)}`);
    if (!results || results.length === 0) {
      alert('Belum ada data untuk di-export!');
      return;
    }
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pjok-quiz-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Gagal export: ' + e.message);
  }
}
