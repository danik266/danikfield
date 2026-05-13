import './style.css';
import { MinesweeperEngine } from './engine.js';
import { initLayout, showToast, formatTime, playSound, loadData, saveData, getDailyDate, getDailySeed } from './layout.js';
import { DAILY_DIFFICULTY } from './data.js';
import { loadAndApplyCustomization } from './skins.js';

initLayout('daily');
loadAndApplyCustomization();

const months = ['Января','Февраля','Марта','Апреля','Мая','Июня','Июля','Августа','Сентября','Октября','Ноября','Декабря'];
const d = new Date();
document.getElementById('daily-date').textContent = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

let engine = null, timerInterval = null;

function updateCountdown() {
  const now = new Date(), tom = new Date(now); tom.setDate(tom.getDate()+1); tom.setHours(0,0,0,0);
  const diff = tom - now;
  document.getElementById('countdown-time').textContent =
    `${Math.floor(diff/3600000).toString().padStart(2,'0')}:${Math.floor((diff%3600000)/60000).toString().padStart(2,'0')}:${Math.floor((diff%60000)/1000).toString().padStart(2,'0')}`;
}
setInterval(updateCountdown, 1000); updateCountdown();

function renderBoard() {
  const c = document.getElementById('daily-board-container');
  c.innerHTML = ''; c.style.gridTemplateColumns = `repeat(${engine.cols}, var(--cell-size))`;
  for (let r=0;r<engine.rows;r++) for (let col=0;col<engine.cols;col++) {
    const cell = document.createElement('div'); cell.className = 'cell';
    cell.addEventListener('click', () => handleReveal(r, col));
    cell.addEventListener('contextmenu', e => { e.preventDefault(); handleFlag(r, col); });
    c.appendChild(cell);
  }
}

function updateCell(r, c) {
  const cell = document.getElementById('daily-board-container').children[r*engine.cols+c];
  if (!cell) return; cell.className = 'cell';
  if (engine.revealed[r][c]) {
    cell.classList.add('revealed','cell-reveal');
    if (engine.board[r][c]===-1) { cell.innerHTML='<i data-lucide="bomb" style="width:16px;height:16px;color:var(--danger)"></i>'; cell.classList.add('mine'); }
    else if (engine.board[r][c]>0) cell.innerHTML=`<span class="n${engine.board[r][c]}">${engine.board[r][c]}</span>`;
    else cell.innerHTML='';
  } else if (engine.flagged[r][c]) { cell.classList.add('flagged'); cell.innerHTML='<i data-lucide="flag" class="flag-icon"></i>'; }
  else cell.innerHTML='';
  if(window.lucide) window.lucide.createIcons();
}

function handleReveal(r,c) {
  if(!engine||engine.gameOver) return;
  const res = engine.reveal(r,c);
  for (const cl of res.cells) updateCell(cl.r,cl.c);
  playSound(res.exploded?'explode':'reveal');
  const acc = Math.round((1 - engine.wrongFlags/Math.max(1,engine.moves))*100);
  document.getElementById('daily-accuracy').textContent = acc+'%';
  if (res.exploded) { engine.getAllMines().forEach(m=>updateCell(m.r,m.c)); showResult(false); }
  else if (engine.gameWon) showResult(true);
}

function handleFlag(r,c) {
  if(!engine||engine.gameOver) return;
  engine.toggleFlag(r,c); updateCell(r,c);
  document.getElementById('daily-mines').textContent = engine.minesLeft;
  playSound('flag');
}

function showResult(won) {
  clearInterval(timerInterval);
  const o = document.getElementById('daily-overlay'); o.style.display = 'flex';
  document.getElementById('daily-overlay-title').textContent = won ? 'Daily Complete!' : 'Попробуйте завтра';
  const t = engine.getElapsedTime(), acc = Math.round((1-engine.wrongFlags/Math.max(1,engine.moves))*100);
  document.getElementById('daily-overlay-stats').innerHTML = `
    <div class="overlay-stat"><div class="overlay-stat-value">${formatTime(t)}</div><div class="overlay-stat-label">Время</div></div>
    <div class="overlay-stat"><div class="overlay-stat-value">${acc}%</div><div class="overlay-stat-label">Точность</div></div>`;
  
  // Save result whether won or lost to prevent retries
  saveData('mf_daily_result',{date:getDailyDate(),time:t,accuracy:acc,won:won});
  
  if(won) {
    const s = loadData('mf_stats',{}); s.dailyCompleted=(s.dailyCompleted||0)+1; if(acc===100)s.perfectDaily=true; saveData('mf_stats',s);
  }
  
  // Disable start button
  checkIfPlayed();
  renderDailyLB();
  if(window.lucide) window.lucide.createIcons();
}

function renderDailyLB() {
  const players = [
    {name:'ProSweeper',time:'02:34',accuracy:'96%'},{name:'MineMaster',time:'03:12',accuracy:'92%'},
    {name:'SafeClick',time:'03:45',accuracy:'100%'},{name:'BoomSlayer',time:'04:01',accuracy:'88%'},
  ];
  const saved = loadData('mf_daily_result',null);
  if(saved&&saved.date===getDailyDate()) players.push({name:'Вы',time:formatTime(saved.time),accuracy:saved.accuracy+'%'});
  document.getElementById('daily-leaderboard-list').innerHTML = players.map((p,i) =>
    `<div class="lb-entry"><span class="lb-rank">${i+1}</span><span class="lb-name">${p.name}</span><span class="lb-score">${p.time} · ${p.accuracy}</span></div>`).join('');
}

function checkIfPlayed() {
  const saved = loadData('mf_daily_result', null);
  const btn = document.getElementById('btn-start-daily');
  if (saved && saved.date === getDailyDate() && btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px"></i> Уже сыграно';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    
    // Update HUD with saved stats
    document.getElementById('daily-mines').textContent = saved.won ? '0' : '--';
    document.getElementById('daily-timer').textContent = formatTime(saved.time);
    document.getElementById('daily-accuracy').textContent = saved.accuracy + '%';
    document.getElementById('daily-timer').style.color = saved.won ? 'var(--success)' : 'var(--danger)';
    
    if(window.lucide) window.lucide.createIcons();
    return true;
  }
  return false;
}

function startDaily() {
  if (checkIfPlayed()) return; // Prevent starting again
  clearInterval(timerInterval);
  document.getElementById('daily-overlay').style.display = 'none';
  engine = new MinesweeperEngine(DAILY_DIFFICULTY.rows, DAILY_DIFFICULTY.cols, DAILY_DIFFICULTY.mines, getDailySeed());
  document.getElementById('daily-mines').textContent = DAILY_DIFFICULTY.mines;
  document.getElementById('daily-timer').textContent = '00:00';
  document.getElementById('daily-accuracy').textContent = '100%';
  renderBoard();
  timerInterval = setInterval(()=>{if(engine?.startTime&&!engine.gameOver)document.getElementById('daily-timer').textContent=formatTime(engine.getElapsedTime());},200);
}

document.getElementById('btn-start-daily').addEventListener('click', startDaily);
document.getElementById('btn-daily-share')?.addEventListener('click',()=>{showToast('Результат скопирован!','success');});
document.getElementById('modal-close-pro')?.addEventListener('click',()=>{document.getElementById('pro-modal').style.display='none';});
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';}));
renderDailyLB();
checkIfPlayed();
