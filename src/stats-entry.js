import './style.css';
import { initLayout, formatTime, loadData } from './layout.js';
import { ACHIEVEMENTS } from './data.js';
import { loadAndApplyCustomization } from './skins.js';

initLayout('stats');
loadAndApplyCustomization();

const s = loadData('mf_stats', { totalGames:0,wins:0,bestTime:0,streak:0,maxStreak:0,totalXP:0 });
document.getElementById('stat-total-games').textContent = s.totalGames;
document.getElementById('stat-wins').textContent = s.wins||0;
document.getElementById('stat-winrate').textContent = s.totalGames ? Math.round((s.wins||0)/s.totalGames*100)+'%' : '0%';
document.getElementById('stat-best-time').textContent = s.bestTime ? formatTime(s.bestTime) : '--:--';
document.getElementById('stat-streak').textContent = s.streak||0;
document.getElementById('stat-total-xp').textContent = s.totalXP||0;

// Activity heatmap
const heatmap = document.getElementById('activity-heatmap');
const activity = loadData('mf_activity', []);
for (let i = 0; i < 30; i++) {
  const d = document.createElement('div'); d.className = 'activity-cell';
  const v = activity[i]||0;
  if(v>=5) d.classList.add('l4'); else if(v>=3) d.classList.add('l3'); else if(v>=2) d.classList.add('l2'); else if(v>=1) d.classList.add('l1');
  heatmap.appendChild(d);
}

// Achievements
document.getElementById('achievements-grid').innerHTML = ACHIEVEMENTS.map(a => {
  const unlocked = a.check(s);
  return `<div class="achievement ${unlocked?'':'locked'}"><i data-lucide="${a.icon}" class="achievement-icon"></i><div class="achievement-name">${a.name}</div><div class="achievement-desc">${a.desc}</div></div>`;
}).join('');

document.getElementById('modal-close-pro')?.addEventListener('click',()=>{document.getElementById('pro-modal').style.display='none';});
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';}));
if(window.lucide) window.lucide.createIcons();
