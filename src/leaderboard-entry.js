import './style.css';
import { initLayout, formatTime, loadData } from './layout.js';
import { MOCK_PLAYERS, CITY_NAMES } from './data.js';
import { loadAndApplyCustomization } from './skins.js';

initLayout('leaderboard');
loadAndApplyCustomization();

function render(filter, city) {
  let players = [...MOCK_PLAYERS];
  const s = loadData('mf_stats', {});
  if (s.totalGames > 0) {
    players.push({ name: 'Вы', city: 'almaty', score: s.totalXP||0, games: s.totalGames||0,
      winrate: s.wins ? Math.round(s.wins/s.totalGames*100) : 0,
      best: s.bestTime ? formatTime(s.bestTime) : '--:--', isPlayer: true });
  }
  if (filter === 'city' && city) players = players.filter(p => p.city === city);
  players.sort((a,b) => b.score - a.score);

  for (let i = 0; i < 3; i++) {
    const p = players[i];
    if (p) {
      document.getElementById(`p${i+1}-name`).textContent = p.name;
      document.getElementById(`p${i+1}-score`).textContent = p.score.toLocaleString() + ' XP';
    }
  }
  document.getElementById('leaderboard-tbody').innerHTML = players.map((p,i) =>
    `<tr style="${p.isPlayer?'background:var(--primary-dim)':''}">
      <td>${i+1}</td>
      <td>${p.name}</td>
      <td class="hide-mobile">${CITY_NAMES[p.city]||p.city}</td>
      <td>${p.score.toLocaleString()}</td>
      <td class="hide-mobile">${p.games}</td>
      <td class="hide-mobile">${p.winrate}%</td>
      <td class="hide-mobile">${p.best}</td>
    </tr>`).join('');
}

document.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const f = b.dataset.filter;
  document.getElementById('city-selector').style.display = f==='city' ? 'block' : 'none';
  render(f, document.getElementById('city-select').value);
}));
document.getElementById('city-select').addEventListener('change', e => render('city', e.target.value));
document.getElementById('modal-close-pro')?.addEventListener('click',()=>{document.getElementById('pro-modal').style.display='none';});
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.style.display='none';}));

render('global');
