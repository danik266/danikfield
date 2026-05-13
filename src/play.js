import './style.css';
import { MinesweeperEngine } from './engine.js';
import { initLayout, showToast, formatTime, playSound, loadData, saveData, getDailyDate } from './layout.js';
import { DIFFICULTIES, COACH_MESSAGES } from './data.js';
import { loadAndApplyCustomization } from './skins.js';

initLayout('play');
loadAndApplyCustomization();

// Particles
const canvas = document.getElementById('particles-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let pts = [];
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  for (let i = 0; i < 40; i++) pts.push({ x: Math.random()*innerWidth, y: Math.random()*innerHeight, vx:(Math.random()-.5)*.2, vy:(Math.random()-.5)*.2, r:Math.random()*1.5+.5, a:Math.random()*.3+.05 });
  (function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const p of pts) { p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0; if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(208,140,64,${p.a})`; ctx.fill(); }
    for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) { const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y); if(d<100){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(208,140,64,${.06*(1-d/100)})`;ctx.stroke();}}
    requestAnimationFrame(draw);
  })();
}

let engine = null, timerInterval = null, speedInterval = null;
let currentMode = 'classic', currentDiff = 'easy';
let soundEnabled = true, heatmapEnabled = false, coachEnabled = true;

function getStats() {
  return loadData('mf_stats', { totalGames:0,wins:0,bestTime:0,streak:0,maxStreak:0,totalXP:0,noFlagWin:false,dailyCompleted:0,perfectDaily:false,heatmapUses:0,maxCombo:0 });
}

function addXP(amt) {
  const s = getStats(); s.totalXP = (s.totalXP||0)+amt; saveData('mf_stats',s);
  const xpFill = document.getElementById('xp-fill');
  if (xpFill) xpFill.style.width = (s.totalXP%100)+'%';
  showToast(`+${amt} XP`, 'xp');
}

function renderBoard() {
  const c = document.getElementById('board-container');
  c.innerHTML = ''; c.style.gridTemplateColumns = `repeat(${engine.cols}, var(--cell-size))`;
  for (let r = 0; r < engine.rows; r++) for (let col = 0; col < engine.cols; col++) {
    const cell = document.createElement('div');
    cell.className = 'cell'; cell.dataset.r = r; cell.dataset.c = col;
    cell.addEventListener('click', () => handleReveal(r, col));
    cell.addEventListener('contextmenu', e => { e.preventDefault(); handleFlag(r, col); });
    cell.addEventListener('dblclick', () => handleReveal(r, col, true));
    c.appendChild(cell);
  }
}

function updateCell(r, c) {
  const cell = document.getElementById('board-container').children[r * engine.cols + c];
  if (!cell) return;
  cell.className = 'cell';
  if (engine.revealed[r][c]) {
    cell.classList.add('revealed','cell-reveal');
    if (engine.board[r][c] === -1) { cell.innerHTML = '<i data-lucide="bomb" style="width:16px;height:16px;color:var(--danger)"></i>'; cell.classList.add('mine'); }
    else if (engine.board[r][c] > 0) cell.innerHTML = `<span class="n${engine.board[r][c]}">${engine.board[r][c]}</span>`;
    else cell.innerHTML = '';
  } else if (engine.flagged[r][c]) {
    cell.classList.add('flagged');
    cell.innerHTML = '<i data-lucide="flag" class="flag-icon"></i>';
  } else cell.innerHTML = '';
  if (window.lucide) window.lucide.createIcons();
}

function applyHeatmap() {
  const probs = engine.calculateProbabilities();
  const cont = document.getElementById('board-container');
  for (let r=0;r<engine.rows;r++) for (let c=0;c<engine.cols;c++) {
    const cell = cont.children[r*engine.cols+c];
    if (!cell||engine.revealed[r][c]||engine.flagged[r][c]) continue;
    cell.classList.remove('heatmap-low','heatmap-med','heatmap-high');
    const p=probs[r][c]; if(p<.2)cell.classList.add('heatmap-low'); else if(p<.5)cell.classList.add('heatmap-med'); else cell.classList.add('heatmap-high');
  }
}

function addCoachMsg(text) {
  const c = document.getElementById('coach-messages');
  const d = document.createElement('div'); d.className = 'coach-msg';
  d.innerHTML = `<div class="coach-avatar"><i data-lucide="brain" style="width:14px;height:14px"></i></div><div class="coach-bubble"><p>${text}</p></div>`;
  c.appendChild(d); c.scrollTop = c.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

function newGame() {
  clearInterval(timerInterval); clearInterval(speedInterval);
  document.getElementById('speed-timer-bar').style.display = 'none';
  document.getElementById('game-overlay').style.display = 'none';

  const diff = DIFFICULTIES[currentDiff];

  // Calculate mines based on mode
  let mines = diff.mines;
  if (currentMode === 'zen') mines = 0;

  engine = new MinesweeperEngine(diff.rows, diff.cols, mines);

  // Update HUD
  document.getElementById('mines-count').textContent = mines;
  document.getElementById('timer-display').textContent = '00:00';
  document.getElementById('combo-display').textContent = 'x1';
  document.getElementById('score-display').textContent = '0';

  renderBoard();

  // Timer — always runs
  timerInterval = setInterval(() => {
    if (engine?.startTime && !engine.gameOver) {
      document.getElementById('timer-display').textContent = formatTime(engine.getElapsedTime());
    }
  }, 200);

  // === MODE-SPECIFIC SETUP ===

  // Speed Run — 2-minute countdown bar
  if (currentMode === 'speed') {
    document.getElementById('speed-timer-bar').style.display = 'block';
    clearInterval(speedInterval);
    speedInterval = setInterval(() => {
      if (!engine || engine.gameOver) { clearInterval(speedInterval); return; }
      if (!engine.startTime) return;
      const elapsed = engine.getElapsedTime();
      const timeLeft = Math.max(0, 120 - elapsed);
      const pct = (timeLeft / 120) * 100;
      const fill = document.getElementById('speed-timer-fill');
      fill.style.width = pct + '%';
      // Color changes as time runs out
      if (pct < 20) fill.style.background = 'var(--danger)';
      else if (pct < 50) fill.style.background = 'var(--gold)';
      else fill.style.background = 'var(--primary)';
      if (timeLeft <= 0) {
        clearInterval(speedInterval);
        engine.gameOver = true;
        showGameOver(false, 'Время вышло!');
      }
    }, 100);
  }

  // Probability Trainer — auto-enable heatmap, coach gives tips after each move
  if (currentMode === 'probability') {
    heatmapEnabled = true;
    coachEnabled = true;
    document.getElementById('toggle-heatmap').checked = true;
    document.getElementById('toggle-coach').checked = true;
  }

  // Zen Mode — no mines, just relax
  if (currentMode === 'zen') {
    coachEnabled = false;
    document.getElementById('toggle-coach').checked = false;
  }

  // Coach welcome message
  if (coachEnabled) {
    document.getElementById('coach-messages').innerHTML = '';
    const modeMessages = {
      classic: 'Классический режим. Найди все безопасные ячейки!',
      speed: 'Speed Run! У тебя 2 минуты. Действуй быстро!',
      zen: 'Режим Zen. Мин нет — просто наслаждайся процессом.',
      probability: 'Тренажёр вероятностей. Heatmap активирован. Анализируй каждый ход!',
    };
    addCoachMsg(modeMessages[currentMode] || COACH_MESSAGES.start[0]);
  }

  // Update mode info text below board
  updateModeInfo();

  if (window.lucide) window.lucide.createIcons();
}

function updateModeInfo() {
  const diff = DIFFICULTIES[currentDiff];
  const modeNames = { classic: 'Классика', speed: 'Speed Run', zen: 'Zen Mode', probability: 'Тренажёр' };
  const diffNames = { easy: 'Новичок', medium: 'Средний', hard: 'Эксперт' };
  const mines = currentMode === 'zen' ? 0 : diff.mines;
  const btn = document.getElementById('btn-new-game');
  btn.innerHTML = `<i data-lucide="play" style="width:16px;height:16px"></i> ${modeNames[currentMode]} · ${diffNames[currentDiff]} · ${diff.rows}×${diff.cols} · ${mines} мин`;
  if (window.lucide) window.lucide.createIcons();
}

function handleReveal(r, c, isChord = false) {
  if (!engine || engine.gameOver) return;
  const result = isChord && engine.revealed[r][c] ? engine.chordReveal(r,c) : engine.reveal(r,c);
  if (!result.cells.length && !result.exploded) return;
  for (const cl of result.cells) updateCell(cl.r, cl.c);
  if (soundEnabled) playSound(result.exploded ? 'explode' : 'reveal');
  if (result.combo > 2) {
    document.getElementById('combo-display').textContent = `x${result.combo}`;
    if (soundEnabled) playSound('combo');
    if (coachEnabled) addCoachMsg(COACH_MESSAGES.combo[Math.floor(Math.random()*2)]);
  }
  document.getElementById('score-display').textContent = engine.score;

  // Auto-update heatmap in probability mode or if enabled
  if (heatmapEnabled && !engine.gameOver) applyHeatmap();

  // Probability mode — coach gives feedback on each move
  if (currentMode === 'probability' && coachEnabled && !engine.gameOver && result.cells.length > 0) {
    const probs = engine.calculateProbabilities();
    const safest = engine.findSafestCell();
    if (safest && safest.prob < 0.05) {
      addCoachMsg(`Безопасная зона найдена рядом с [${safest.r+1}, ${safest.c+1}]. Вероятность мины: ${Math.round(safest.prob*100)}%`);
    } else if (safest && safest.prob > 0.3) {
      addCoachMsg(`Осторожно! Все оставшиеся ячейки рискованные. Лучший вариант: [${safest.r+1}, ${safest.c+1}] (${Math.round(safest.prob*100)}%)`);
    }
  }

  if (result.exploded) {
    const cell = document.querySelector(`#board-container .cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) cell.classList.add('exploded');
    engine.getAllMines().forEach(m => updateCell(m.r, m.c));
    showGameOver(false);
  } else if (engine.gameWon) {
    showGameOver(true);
  }
}

function handleFlag(r, c) {
  if (!engine || engine.gameOver) return;
  if (engine.toggleFlag(r,c) === null) return;
  updateCell(r,c);
  document.getElementById('mines-count').textContent = engine.minesLeft;
  if (soundEnabled) playSound('flag');
  // In probability mode, coach comments on flags
  if (currentMode === 'probability' && coachEnabled) {
    if (engine.flagged[r][c]) {
      const probs = engine.calculateProbabilities();
      // Was it a good flag?
      const defMines = engine.findDefiniteMines();
      const isDefinite = defMines.some(m => m.r === r && m.c === c);
      if (isDefinite) addCoachMsg('Точный флаг! Эта ячейка — точно мина.');
      else addCoachMsg('Флаг поставлен. Проверь — достаточно ли данных для уверенности?');
    }
  }
}

function showGameOver(won, customSubtitle) {
  clearInterval(timerInterval); clearInterval(speedInterval);
  const o = document.getElementById('game-overlay'); o.style.display = 'flex';
  document.getElementById('overlay-title').textContent = won ? 'Победа!' : 'Game Over';

  let subtitle = won ? 'Отличная работа!' : 'Наступил на мину';
  if (customSubtitle) subtitle = customSubtitle;
  if (currentMode === 'speed' && won) subtitle = 'Успел за 2 минуты!';
  if (currentMode === 'zen' && won) subtitle = 'Поле полностью раскрыто. Красота!';
  document.getElementById('overlay-subtitle').textContent = subtitle;

  const t = engine.getElapsedTime();
  let statsHtml = `
    <div class="overlay-stat"><div class="overlay-stat-value">${formatTime(t)}</div><div class="overlay-stat-label">Время</div></div>
    <div class="overlay-stat"><div class="overlay-stat-value">${engine.score}</div><div class="overlay-stat-label">Очки</div></div>
    <div class="overlay-stat"><div class="overlay-stat-value">${engine.moves}</div><div class="overlay-stat-label">Ходов</div></div>`;
  if (currentMode === 'speed') {
    const timeLeft = Math.max(0, 120 - t);
    statsHtml += `<div class="overlay-stat"><div class="overlay-stat-value">${formatTime(timeLeft)}</div><div class="overlay-stat-label">Осталось</div></div>`;
  }
  document.getElementById('overlay-stats').innerHTML = statsHtml;

  if (soundEnabled) playSound(won ? 'win' : 'explode');

  // Don't count zen mode in stats
  if (currentMode !== 'zen') {
    const s = getStats(); s.totalGames = (s.totalGames||0) + 1;
    if (won) {
      s.wins = (s.wins||0) + 1;
      s.streak = (s.streak||0) + 1;
      s.maxStreak = Math.max(s.maxStreak||0, s.streak);
      if (!s.bestTime || t < s.bestTime) s.bestTime = t;
      if (engine.combo > (s.maxCombo||0)) s.maxCombo = engine.combo;
      // Check no-flag win
      let usedFlags = false;
      for (let r2=0;r2<engine.rows;r2++) for (let c2=0;c2<engine.cols;c2++) if(engine.flagged[r2][c2]) usedFlags=true;
      if (!usedFlags) s.noFlagWin = true;
    } else { s.streak = 0; }
    saveData('mf_stats', s);
    addXP(won ? 50 + Math.floor(engine.score/10) : 5);
  }

  const act = loadData('mf_activity', new Array(30).fill(0));
  act[0] = (act[0]||0) + 1;
  saveData('mf_activity', act);

  if (window.lucide) window.lucide.createIcons();
}

// === EVENT LISTENERS ===

// Mode selection — auto-restart game
document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  currentMode = b.dataset.mode;
  newGame();
}));

// Difficulty selection — auto-restart game
document.querySelectorAll('.diff-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  currentDiff = b.dataset.diff;
  newGame();
}));

// Toggles
document.getElementById('toggle-heatmap').addEventListener('change', e => {
  heatmapEnabled = e.target.checked;
  if (engine && !engine.gameOver) {
    if (heatmapEnabled) {
      applyHeatmap();
      const s = getStats(); s.heatmapUses = (s.heatmapUses||0) + 1; saveData('mf_stats', s);
    } else {
      document.querySelectorAll('.cell').forEach(c => c.classList.remove('heatmap-low','heatmap-med','heatmap-high'));
    }
  }
});
document.getElementById('toggle-coach').addEventListener('change', e => { coachEnabled = e.target.checked; });
document.getElementById('toggle-sound').addEventListener('change', e => { soundEnabled = e.target.checked; });

document.getElementById('btn-new-game').addEventListener('click', newGame);
document.getElementById('btn-retry').addEventListener('click', newGame);

// AI Coach buttons
document.getElementById('btn-hint').addEventListener('click',()=>{
  if(!engine||engine.gameOver||engine.firstClick){addCoachMsg('Начните игру для подсказки.');return;}
  const def=engine.findDefiniteMines();
  if(def.length>0){const m=def[0];addCoachMsg(COACH_MESSAGES.hint_mine(m.r,m.c));const c=document.querySelector(`#board-container .cell[data-r="${m.r}"][data-c="${m.c}"]`);if(c){c.style.boxShadow='0 0 12px rgba(229,83,75,.6)';setTimeout(()=>c.style.boxShadow='',2000);}}
  else{const sf=engine.findSafestCell();if(sf){addCoachMsg(COACH_MESSAGES.hint_safe(sf.r,sf.c));const c=document.querySelector(`#board-container .cell[data-r="${sf.r}"][data-c="${sf.c}"]`);if(c){c.style.boxShadow='0 0 12px rgba(61,214,140,.6)';setTimeout(()=>c.style.boxShadow='',2000);}}}
});
document.getElementById('btn-analyze').addEventListener('click',()=>{
  if(!engine||engine.gameOver||engine.firstClick){addCoachMsg('Начните игру для анализа.');return;}
  const def=engine.findDefiniteMines();const sf=engine.findSafestCell();
  addCoachMsg(COACH_MESSAGES.analysis(sf&&sf.prob<.1?'несколько':'0',def.length));
});

// Share
document.getElementById('btn-share')?.addEventListener('click',()=>{
  const m=document.getElementById('share-modal');if(m)m.style.display='flex';
  const tx=document.getElementById('share-text');if(tx&&engine)tx.value=`DANIKFIELD ${getDailyDate()}\n${engine.gameWon?'Победа!':'Game Over'}\nВремя: ${formatTime(engine.getElapsedTime())} | Очки: ${engine.score}\ndarikfield.app`;
});
document.getElementById('modal-close-share')?.addEventListener('click',()=>{document.getElementById('share-modal').style.display='none';});
document.getElementById('btn-copy-share')?.addEventListener('click',()=>{navigator.clipboard.writeText(document.getElementById('share-text').value);showToast('Скопировано!','success');});
document.getElementById('btn-telegram-share')?.addEventListener('click',()=>{window.open('https://t.me/share/url?url=danikfield.app&text='+encodeURIComponent(document.getElementById('share-text').value));});

// Pro modal with Stripe
import { initStripe, handlePayment } from './stripe.js';
let stripeInit = false;
document.getElementById('modal-close-pro')?.addEventListener('click',()=>{document.getElementById('pro-modal').style.display='none';});
document.getElementById('btn-pay')?.addEventListener('click', async ()=>{
  const btn = document.getElementById('btn-pay');
  const btnText = document.getElementById('btn-pay-text');
  btn.disabled = true;
  if (btnText) btnText.textContent = 'Обработка...';
  const result = await handlePayment('year');
  if (result.success) {
    showToast('PRO активирован! Спасибо!','success');
    document.getElementById('pro-modal').style.display='none';
    const s = loadData('mf_stats',{}); s.isPro = true; saveData('mf_stats', s);
  } else {
    const err = document.getElementById('stripe-error');
    if(err){err.textContent=result.error||'Ошибка';err.style.display='block';}
  }
  btn.disabled = false;
  if (btnText) btnText.textContent = 'Оплатить $19.99';
});
// Init Stripe when modal opens
const origOpen = document.getElementById('btn-upgrade-pro');
if (origOpen) {
  origOpen.addEventListener('click', () => {
    if(!stripeInit){try{const r=initStripe();if(r)stripeInit=true;document.getElementById('btn-pay').disabled=false;}catch(e){document.getElementById('btn-pay').disabled=false;}}
    if(window.lucide)window.lucide.createIcons();
  });
}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';}));

newGame();
showToast('Добро пожаловать в DanikField!', 'info');
