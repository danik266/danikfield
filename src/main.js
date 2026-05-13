import './style.css';
import { MinesweeperEngine } from './engine.js';
import { initParticles, showToast, formatTime, playSound, loadData, saveData } from './utils.js';
import { DIFFICULTIES, DAILY_DIFFICULTY, COACH_MESSAGES } from './data.js';
import { renderBoard, updateCell, applyHeatmap, clearHeatmap, renderLeaderboard,
  renderDailyLeaderboard, renderStats, renderShop, addCoachMessage,
  updateDailyCountdown, getDailySeed, getDailyDate, updateXPBar, generateShareText } from './ui.js';

let engine = null, dailyEngine = null;
let timerInterval = null, speedInterval = null;
let currentMode = 'classic', currentDiff = 'easy';
let soundEnabled = true, heatmapEnabled = false, coachEnabled = true;
let speedTimeLeft = 120;

function getStats() {
  return loadData('mf_stats', {
    totalGames:0, wins:0, bestTime:0, streak:0, maxStreak:0,
    totalXP:0, noFlagWin:false, dailyCompleted:0, perfectDaily:false,
    heatmapUses:0, maxCombo:0
  });
}

function addXP(amount) {
  const s = getStats();
  s.totalXP = (s.totalXP || 0) + amount;
  saveData('mf_stats', s);
  updateXPBar();
  showToast(`+${amount} XP`, 'xp');
}

function startTimer(displayId) {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (engine && engine.startTime && !engine.gameOver) {
      document.getElementById(displayId).textContent = formatTime(engine.getElapsedTime());
    }
  }, 200);
}

function startSpeedTimer() {
  speedTimeLeft = 120;
  document.getElementById('speed-timer-bar').style.display = 'block';
  clearInterval(speedInterval);
  speedInterval = setInterval(() => {
    if (!engine || engine.gameOver) { clearInterval(speedInterval); return; }
    if (!engine.startTime) return;
    speedTimeLeft = Math.max(0, 120 - engine.getElapsedTime());
    document.getElementById('speed-timer-fill').style.width = (speedTimeLeft / 120 * 100) + '%';
    if (speedTimeLeft <= 0) {
      clearInterval(speedInterval);
      engine.gameOver = true;
      showGameOver(false);
    }
  }, 100);
}

function newGame() {
  clearInterval(timerInterval); clearInterval(speedInterval);
  document.getElementById('speed-timer-bar').style.display = 'none';
  document.getElementById('game-overlay').style.display = 'none';
  const diff = DIFFICULTIES[currentDiff];
  const mines = currentMode === 'zen' ? 0 : diff.mines;
  engine = new MinesweeperEngine(diff.rows, diff.cols, mines);
  document.getElementById('mines-count').textContent = mines;
  document.getElementById('timer-display').textContent = '00:00';
  document.getElementById('combo-display').textContent = 'x1';
  document.getElementById('score-display').textContent = '0';
  renderBoard(engine, 'board-container', handleReveal, handleFlag);
  startTimer('timer-display');
  if (currentMode === 'speed') startSpeedTimer();
  if (coachEnabled) {
    document.getElementById('coach-messages').innerHTML = '';
    addCoachMessage(COACH_MESSAGES.start[Math.floor(Math.random() * COACH_MESSAGES.start.length)]);
  }
}

function handleReveal(r, c, isChord = false) {
  if (!engine || engine.gameOver) return;
  let result;
  if (isChord && engine.revealed[r][c]) {
    result = engine.chordReveal(r, c);
  } else {
    result = engine.reveal(r, c);
  }
  if (result.cells.length === 0 && !result.exploded) return;
  for (const cell of result.cells) updateCell(engine, 'board-container', cell.r, cell.c);
  if (soundEnabled) playSound(result.exploded ? 'explode' : 'reveal');
  if (result.combo && result.combo > 2) {
    document.getElementById('combo-display').textContent = `x${result.combo}`;
    if (soundEnabled) playSound('combo');
    if (coachEnabled) addCoachMessage(COACH_MESSAGES.combo[Math.floor(Math.random() * COACH_MESSAGES.combo.length)]);
  }
  document.getElementById('score-display').textContent = engine.score;
  if (heatmapEnabled && !engine.gameOver) applyHeatmap(engine, 'board-container');
  if (result.exploded) {
    const cell = document.querySelector(`#board-container .cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) cell.classList.add('exploded');
    engine.getAllMines().forEach(m => updateCell(engine, 'board-container', m.r, m.c));
    showGameOver(false);
  } else if (engine.gameWon) {
    showGameOver(true);
  }
  // Coach feedback
  if (coachEnabled && !engine.gameOver && result.cells.length > 0) {
    const probs = engine.calculateProbabilities();
    const wasRisky = result.cells.some(c2 => {
      let neighborMineProb = 0;
      engine.forNeighbors(c2.r, c2.c, (nr, nc) => {
        if (!engine.revealed[nr][nc] && probs[nr]?.[nc] > 0.4) neighborMineProb++;
      });
      return neighborMineProb > 0;
    });
    if (wasRisky && Math.random() > 0.6) {
      addCoachMessage(COACH_MESSAGES.risky[Math.floor(Math.random() * COACH_MESSAGES.risky.length)]);
    }
  }
}

function handleFlag(r, c) {
  if (!engine || engine.gameOver) return;
  const result = engine.toggleFlag(r, c);
  if (result === null) return;
  updateCell(engine, 'board-container', r, c);
  document.getElementById('mines-count').textContent = engine.minesLeft;
  if (soundEnabled) playSound('flag');
}

function showGameOver(won) {
  clearInterval(timerInterval); clearInterval(speedInterval);
  const overlay = document.getElementById('game-overlay');
  overlay.style.display = 'flex';
  document.getElementById('overlay-icon').textContent = won ? '🎉' : '💥';
  document.getElementById('overlay-title').textContent = won ? 'Победа!' : 'Game Over';
  document.getElementById('overlay-subtitle').textContent = won ? 'Отличная работа!' : 'Вы наступили на мину!';
  const time = engine.getElapsedTime();
  document.getElementById('overlay-stats').innerHTML = `
    <div class="overlay-stat"><div class="overlay-stat-value">${formatTime(time)}</div><div class="overlay-stat-label">Время</div></div>
    <div class="overlay-stat"><div class="overlay-stat-value">${engine.score}</div><div class="overlay-stat-label">Очки</div></div>
    <div class="overlay-stat"><div class="overlay-stat-value">${engine.moves}</div><div class="overlay-stat-label">Ходов</div></div>`;
  if (soundEnabled) playSound(won ? 'win' : 'explode');
  // Update stats
  const s = getStats();
  s.totalGames = (s.totalGames || 0) + 1;
  if (won) {
    s.wins = (s.wins || 0) + 1;
    s.streak = (s.streak || 0) + 1;
    s.maxStreak = Math.max(s.maxStreak || 0, s.streak);
    if (!s.bestTime || time < s.bestTime) s.bestTime = time;
    if (engine.combo > (s.maxCombo || 0)) s.maxCombo = engine.combo;
    let usedFlags = false;
    for (let r2 = 0; r2 < engine.rows; r2++) for (let c2 = 0; c2 < engine.cols; c2++) if (engine.flagged[r2][c2]) usedFlags = true;
    if (!usedFlags) s.noFlagWin = true;
  } else { s.streak = 0; }
  saveData('mf_stats', s);
  addXP(won ? 50 + Math.floor(engine.score / 10) : 5);
  // Activity
  const act = loadData('mf_activity', new Array(30).fill(0));
  act[0] = (act[0] || 0) + 1;
  saveData('mf_activity', act);
}

// Daily challenge
function startDaily() {
  clearInterval(timerInterval);
  document.getElementById('daily-overlay').style.display = 'none';
  const seed = getDailySeed();
  dailyEngine = new MinesweeperEngine(DAILY_DIFFICULTY.rows, DAILY_DIFFICULTY.cols, DAILY_DIFFICULTY.mines, seed);
  document.getElementById('daily-mines').textContent = DAILY_DIFFICULTY.mines;
  document.getElementById('daily-timer').textContent = '00:00';
  document.getElementById('daily-accuracy').textContent = '100%';
  renderBoard(dailyEngine, 'daily-board-container', handleDailyReveal, handleDailyFlag);
  timerInterval = setInterval(() => {
    if (dailyEngine && dailyEngine.startTime && !dailyEngine.gameOver) {
      document.getElementById('daily-timer').textContent = formatTime(dailyEngine.getElapsedTime());
    }
  }, 200);
}

function handleDailyReveal(r, c) {
  if (!dailyEngine || dailyEngine.gameOver) return;
  const result = dailyEngine.reveal(r, c);
  for (const cell of result.cells) updateCell(dailyEngine, 'daily-board-container', cell.r, cell.c);
  if (soundEnabled) playSound(result.exploded ? 'explode' : 'reveal');
  if (result.exploded) {
    dailyEngine.getAllMines().forEach(m => updateCell(dailyEngine, 'daily-board-container', m.r, m.c));
    showDailyResult(false);
  } else if (dailyEngine.gameWon) { showDailyResult(true); }
  const totalCells = dailyEngine.rows * dailyEngine.cols - dailyEngine.totalMines;
  const accuracy = totalCells > 0 ? Math.round((1 - dailyEngine.wrongFlags / Math.max(1, dailyEngine.moves)) * 100) : 100;
  document.getElementById('daily-accuracy').textContent = accuracy + '%';
}

function handleDailyFlag(r, c) {
  if (!dailyEngine || dailyEngine.gameOver) return;
  dailyEngine.toggleFlag(r, c);
  updateCell(dailyEngine, 'daily-board-container', r, c);
  document.getElementById('daily-mines').textContent = dailyEngine.minesLeft;
  if (soundEnabled) playSound('flag');
}

function showDailyResult(won) {
  clearInterval(timerInterval);
  const overlay = document.getElementById('daily-overlay');
  overlay.style.display = 'flex';
  document.getElementById('daily-overlay-icon').textContent = won ? '🏆' : '💥';
  document.getElementById('daily-overlay-title').textContent = won ? 'Daily Complete!' : 'Попробуйте завтра';
  const time = dailyEngine.getElapsedTime();
  const accuracy = Math.round((1 - dailyEngine.wrongFlags / Math.max(1, dailyEngine.moves)) * 100);
  document.getElementById('daily-overlay-stats').innerHTML = `
    <div class="overlay-stat"><div class="overlay-stat-value">${formatTime(time)}</div><div class="overlay-stat-label">Время</div></div>
    <div class="overlay-stat"><div class="overlay-stat-value">${accuracy}%</div><div class="overlay-stat-label">Точность</div></div>`;
  if (won) {
    saveData('mf_daily_result', { date: getDailyDate(), time, accuracy, won: true });
    const s = getStats(); s.dailyCompleted = (s.dailyCompleted || 0) + 1;
    if (accuracy === 100) s.perfectDaily = true;
    saveData('mf_stats', s);
    addXP(100);
  }
  renderDailyLeaderboard();
}

// Navigation
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  if (view === 'leaderboard') renderLeaderboard('global');
  if (view === 'stats') renderStats();
  if (view === 'shop') renderShop();
  if (view === 'daily') { renderDailyLeaderboard(); updateDailyCountdown(); }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  updateXPBar();

  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Mode selection
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
    });
  });

  // Difficulty selection
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDiff = btn.dataset.diff;
    });
  });

  // Toggles
  document.getElementById('toggle-heatmap').addEventListener('change', e => {
    heatmapEnabled = e.target.checked;
    if (engine && !engine.gameOver) {
      if (heatmapEnabled) { applyHeatmap(engine, 'board-container'); const s = getStats(); s.heatmapUses = (s.heatmapUses || 0) + 1; saveData('mf_stats', s); }
      else clearHeatmap('board-container');
    }
  });
  document.getElementById('toggle-coach').addEventListener('change', e => { coachEnabled = e.target.checked; });
  document.getElementById('toggle-sound').addEventListener('change', e => { soundEnabled = e.target.checked; });

  // Buttons
  document.getElementById('btn-new-game').addEventListener('click', newGame);
  document.getElementById('btn-retry').addEventListener('click', newGame);
  document.getElementById('btn-start-daily').addEventListener('click', startDaily);

  // AI Coach buttons
  document.getElementById('btn-hint').addEventListener('click', () => {
    if (!engine || engine.gameOver || engine.firstClick) { addCoachMessage('Начните игру, чтобы получить подсказку.'); return; }
    const definite = engine.findDefiniteMines();
    if (definite.length > 0) {
      const m = definite[0];
      addCoachMessage(COACH_MESSAGES.hint_mine(m.r, m.c));
      const cell = document.querySelector(`#board-container .cell[data-r="${m.r}"][data-c="${m.c}"]`);
      if (cell) { cell.style.boxShadow = '0 0 12px rgba(255,107,107,.8)'; setTimeout(() => cell.style.boxShadow = '', 2000); }
    } else {
      const safest = engine.findSafestCell();
      if (safest) {
        addCoachMessage(COACH_MESSAGES.hint_safe(safest.r, safest.c));
        const cell = document.querySelector(`#board-container .cell[data-r="${safest.r}"][data-c="${safest.c}"]`);
        if (cell) { cell.style.boxShadow = '0 0 12px rgba(0,184,148,.8)'; setTimeout(() => cell.style.boxShadow = '', 2000); }
      }
    }
  });
  document.getElementById('btn-analyze').addEventListener('click', () => {
    if (!engine || engine.gameOver || engine.firstClick) { addCoachMessage('Начните игру для анализа.'); return; }
    const definite = engine.findDefiniteMines();
    const safest = engine.findSafestCell();
    const safeCount = safest && safest.prob < 0.1 ? 'несколько' : '0';
    addCoachMessage(COACH_MESSAGES.analysis(safeCount, definite.length));
  });

  // Leaderboard filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.getElementById('city-selector').style.display = filter === 'city' ? 'block' : 'none';
      renderLeaderboard(filter, document.getElementById('city-select').value);
    });
  });
  document.getElementById('city-select').addEventListener('change', e => {
    renderLeaderboard('city', e.target.value);
  });

  // Pro modal
  const proModal = document.getElementById('pro-modal');
  document.getElementById('btn-upgrade-pro').addEventListener('click', () => proModal.style.display = 'flex');
  document.getElementById('btn-upgrade-main')?.addEventListener('click', () => proModal.style.display = 'flex');
  document.getElementById('modal-close-pro').addEventListener('click', () => proModal.style.display = 'none');
  document.getElementById('btn-pay').addEventListener('click', () => {
    showToast('✅ Спасибо за поддержку! PRO активирован (демо)', 'success');
    proModal.style.display = 'none';
  });

  // Share
  const shareModal = document.getElementById('share-modal');
  document.getElementById('btn-share')?.addEventListener('click', () => {
    if (!engine) return;
    document.getElementById('share-text').value = generateShareText(engine.gameWon, engine.getElapsedTime(), engine.score, currentDiff);
    shareModal.style.display = 'flex';
  });
  document.getElementById('btn-daily-share')?.addEventListener('click', () => {
    if (!dailyEngine) return;
    document.getElementById('share-text').value = generateShareText(dailyEngine.gameWon, dailyEngine.getElapsedTime(), 0, 'daily');
    shareModal.style.display = 'flex';
  });
  document.getElementById('modal-close-share').addEventListener('click', () => shareModal.style.display = 'none');
  document.getElementById('btn-copy-share').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('share-text').value);
    showToast('📋 Скопировано!', 'success');
  });
  document.getElementById('btn-twitter-share')?.addEventListener('click', () => {
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(document.getElementById('share-text').value));
  });
  document.getElementById('btn-telegram-share')?.addEventListener('click', () => {
    window.open('https://t.me/share/url?url=minefield.app&text=' + encodeURIComponent(document.getElementById('share-text').value));
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
  });

  // Daily countdown
  setInterval(updateDailyCountdown, 1000);

  // Daily date
  const d = new Date();
  const months = ['Января','Февраля','Марта','Апреля','Мая','Июня','Июля','Августа','Сентября','Октября','Ноября','Декабря'];
  document.getElementById('daily-date').textContent = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

  // Start first game
  newGame();
  showToast('🎮 Добро пожаловать в MINEFIELD!', 'info');
});
