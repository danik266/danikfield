import { formatTime, showToast, playSound, loadData, saveData } from './utils.js';
import { MOCK_PLAYERS, CITY_NAMES, ACHIEVEMENTS, SKINS, THEMES, COACH_MESSAGES } from './data.js';

// Render board cells
export function renderBoard(engine, containerId, onReveal, onFlag) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${engine.cols}, var(--cell))`;
  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.addEventListener('click', () => onReveal(r, c));
      cell.addEventListener('contextmenu', e => { e.preventDefault(); onFlag(r, c); });
      cell.addEventListener('dblclick', () => onReveal(r, c, true));
      container.appendChild(cell);
    }
  }
}

// Update cell visuals
export function updateCell(engine, containerId, r, c) {
  const container = document.getElementById(containerId);
  const idx = r * engine.cols + c;
  const cell = container.children[idx];
  if (!cell) return;
  cell.className = 'cell';
  if (engine.revealed[r][c]) {
    cell.classList.add('revealed', 'cell-reveal');
    if (engine.board[r][c] === -1) {
      cell.innerHTML = '💣'; cell.classList.add('mine');
    } else if (engine.board[r][c] > 0) {
      cell.innerHTML = `<span class="cell-num n${engine.board[r][c]}">${engine.board[r][c]}</span>`;
    } else { cell.innerHTML = ''; }
  } else if (engine.flagged[r][c]) {
    cell.classList.add('flagged'); cell.innerHTML = '';
  } else { cell.innerHTML = ''; }
}

// Apply heatmap overlay
export function applyHeatmap(engine, containerId) {
  const probs = engine.calculateProbabilities();
  const container = document.getElementById(containerId);
  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      const idx = r * engine.cols + c;
      const cell = container.children[idx];
      if (!cell || engine.revealed[r][c] || engine.flagged[r][c]) continue;
      cell.classList.remove('heatmap-low', 'heatmap-med', 'heatmap-high');
      const p = probs[r][c];
      if (p < 0.2) cell.classList.add('heatmap-low');
      else if (p < 0.5) cell.classList.add('heatmap-med');
      else cell.classList.add('heatmap-high');
    }
  }
}

export function clearHeatmap(containerId) {
  const container = document.getElementById(containerId);
  for (const cell of container.children) {
    cell.classList.remove('heatmap-low', 'heatmap-med', 'heatmap-high');
  }
}

// Render leaderboard
export function renderLeaderboard(filter, city) {
  let players = [...MOCK_PLAYERS];
  const stats = loadData('mf_stats', {});
  // Add current player
  if (stats.totalGames > 0) {
    players.push({
      name: 'Вы ⭐', city: 'almaty', score: stats.totalXP || 0,
      games: stats.totalGames || 0, winrate: stats.wins ? Math.round(stats.wins / stats.totalGames * 100) : 0,
      best: stats.bestTime ? formatTime(stats.bestTime) : '--:--', isPlayer: true
    });
  }
  if (filter === 'city' && city) players = players.filter(p => p.city === city);
  players.sort((a, b) => b.score - a.score);

  // Podium
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`podium-${i + 1}`);
    const p = players[i];
    if (p) {
      el.querySelector('.podium-name').textContent = p.name;
      el.querySelector('.podium-score').textContent = p.score.toLocaleString() + ' XP';
    }
  }
  // Table
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = players.map((p, i) => `
    <tr style="${p.isPlayer ? 'background:rgba(108,92,231,.1)' : ''}">
      <td>${i + 1}</td><td>${p.name}</td><td>${CITY_NAMES[p.city] || p.city}</td>
      <td>${p.score.toLocaleString()}</td><td>${p.games}</td><td>${p.winrate}%</td><td>${p.best}</td>
    </tr>`).join('');
}

// Render daily leaderboard
export function renderDailyLeaderboard() {
  const list = document.getElementById('daily-leaderboard-list');
  const dailyPlayers = [
    { name: 'ProSweeper', time: '02:34', accuracy: '96%' },
    { name: 'MineMaster', time: '03:12', accuracy: '92%' },
    { name: 'SafeClick', time: '03:45', accuracy: '100%' },
    { name: 'BoomSlayer', time: '04:01', accuracy: '88%' },
    { name: 'FlagHunter', time: '04:22', accuracy: '94%' },
  ];
  const saved = loadData('mf_daily_result', null);
  if (saved && saved.date === getDailyDate()) {
    dailyPlayers.push({ name: 'Вы ⭐', time: formatTime(saved.time), accuracy: saved.accuracy + '%' });
    dailyPlayers.sort((a, b) => {
      const ta = a.time.split(':').reduce((m, s) => +m * 60 + +s);
      const tb = b.time.split(':').reduce((m, s) => +m * 60 + +s);
      return ta - tb;
    });
  }
  list.innerHTML = dailyPlayers.map((p, i) => `
    <div class="lb-entry"><span class="lb-rank">${['🥇','🥈','🥉'][i] || (i+1)}</span>
    <span class="lb-name">${p.name}</span><span class="lb-score">${p.time} · ${p.accuracy}</span></div>`).join('');
}

// Stats & achievements
export function renderStats() {
  const s = loadData('mf_stats', { totalGames: 0, wins: 0, bestTime: 0, streak: 0, maxStreak: 0, totalXP: 0 });
  document.getElementById('stat-total-games').textContent = s.totalGames;
  document.getElementById('stat-wins').textContent = s.wins || 0;
  document.getElementById('stat-winrate').textContent = s.totalGames ? Math.round((s.wins || 0) / s.totalGames * 100) + '%' : '0%';
  document.getElementById('stat-best-time').textContent = s.bestTime ? formatTime(s.bestTime) : '--:--';
  document.getElementById('stat-streak').textContent = s.streak || 0;
  document.getElementById('stat-total-xp').textContent = s.totalXP || 0;
  // Activity heatmap
  const heatmap = document.getElementById('activity-heatmap');
  heatmap.innerHTML = '';
  const activity = loadData('mf_activity', []);
  for (let i = 0; i < 30; i++) {
    const d = document.createElement('div');
    d.className = 'activity-cell';
    const val = activity[i] || 0;
    if (val >= 5) d.classList.add('l4');
    else if (val >= 3) d.classList.add('l3');
    else if (val >= 2) d.classList.add('l2');
    else if (val >= 1) d.classList.add('l1');
    heatmap.appendChild(d);
  }
  // Achievements
  const grid = document.getElementById('achievements-grid');
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = a.check(s);
    return `<div class="achievement ${unlocked ? '' : 'locked'}">
      <div class="achievement-icon">${a.icon}</div>
      <div class="achievement-name">${a.name}</div>
      <div class="achievement-desc">${a.desc}</div></div>`;
  }).join('');
}

// Shop
export function renderShop() {
  const owned = loadData('mf_owned_skins', ['default']);
  const skinsGrid = document.getElementById('skins-grid');
  skinsGrid.innerHTML = SKINS.map(s => `
    <div class="skin-card ${owned.includes(s.id) ? 'active' : ''} ${!s.owned && !owned.includes(s.id) ? 'locked' : ''}" data-skin="${s.id}">
      <div class="skin-preview">${s.preview}</div>
      <div class="skin-name">${s.name}</div>
      <div class="skin-price">${s.price}</div></div>`).join('');
  const themesGrid = document.getElementById('themes-grid');
  themesGrid.innerHTML = THEMES.map(t => `
    <div class="theme-card ${t.owned ? 'active' : 'locked'}" data-theme="${t.id}">
      <div class="theme-preview" style="background:linear-gradient(135deg,${t.colors.join(',')})"></div>
      <div class="theme-name">${t.name}</div>
      <div class="theme-price">${t.price || 'Бесплатно'}</div></div>`).join('');
}

// AI Coach
export function addCoachMessage(text) {
  const container = document.getElementById('coach-messages');
  const msg = document.createElement('div');
  msg.className = 'coach-msg';
  msg.innerHTML = `<div class="coach-avatar">🧠</div><div class="coach-bubble"><p>${text}</p></div>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

// Countdown to next daily
export function updateDailyCountdown() {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow - now;
  const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
  const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
  document.getElementById('countdown-time').textContent = `${h}:${m}:${s}`;
}

export function getDailyDate() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}

export function getDailySeed() {
  const d = getDailyDate();
  let hash = 0;
  for (let i = 0; i < d.length; i++) { hash = ((hash << 5) - hash) + d.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

// XP system
export function updateXPBar() {
  const s = loadData('mf_stats', { totalXP: 0 });
  const xp = s.totalXP || 0;
  const level = Math.floor(xp / 100) + 1;
  const progress = (xp % 100);
  document.getElementById('player-level').textContent = level;
  document.getElementById('xp-fill').style.width = progress + '%';
  document.getElementById('xp-text').textContent = `${progress} / 100 XP`;
}

// Generate share text
export function generateShareText(won, time, score, difficulty) {
  const icons = won ? '🟩' : '🟥';
  const result = won ? '✅ Победа!' : '💥 Поражение';
  return `MINEFIELD ${getDailyDate()}\n${result}\n⏱️ ${formatTime(time)} | ⭐ ${score}\n🎯 ${difficulty}\n\nminefield.app`;
}
