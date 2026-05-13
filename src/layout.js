// Shared layout — injects sidebar into each page
export function initLayout(activePage) {
  const sidebar = document.createElement('aside');
  sidebar.id = 'sidebar';
  const pages = [
    { id: 'play', href: '/', icon: 'crosshair', label: 'Играть' },
    { id: 'daily', href: '/daily.html', icon: 'calendar-days', label: 'Daily' },
    { id: 'leaderboard', href: '/leaderboard.html', icon: 'trophy', label: 'Рейтинг' },
    { id: 'stats', href: '/stats.html', icon: 'bar-chart-3', label: 'Статистика' },
    { id: 'shop', href: '/shop.html', icon: 'gem', label: 'Магазин' },
  ];
  const s = JSON.parse(localStorage.getItem('mf_stats') || '{}');
  const xp = s.totalXP || 0;
  const level = Math.floor(xp / 100) + 1;

  sidebar.innerHTML = `
    <a href="/" class="sidebar-logo" title="DanikField">
      <span class="logo-short">DF</span>
      <span class="logo-full">DanikField</span>
    </a>
    <nav class="sidebar-nav">
      ${pages.map(p => `
        <a href="${p.href}" class="sidebar-link ${p.id === activePage ? 'active' : ''}" title="${p.label}" id="nav-${p.id}">
          <div class="sidebar-icon-wrapper">
            <i data-lucide="${p.icon}" style="width:18px;height:18px"></i>
            ${p.id === 'daily' ? '<span class="sidebar-dot"></span>' : ''}
          </div>
          <span class="sidebar-text">${p.label}</span>
        </a>`).join('')}
    </nav>
    <div class="sidebar-bottom">
      <div class="sidebar-level" title="${xp} XP">
        <span class="level-badge">${level}</span>
        <span class="sidebar-text">${xp} XP</span>
      </div>
      <button class="sidebar-pro" id="btn-upgrade-pro" title="PRO">
        <div class="sidebar-icon-wrapper">
          <i data-lucide="crown" style="width:16px;height:16px"></i>
        </div>
        <span class="sidebar-text">Upgrade</span>
      </button>
    </div>`;

  const app = document.getElementById('app');
  document.body.insertBefore(sidebar, app);

  // Pro modal handler
  document.getElementById('btn-upgrade-pro').addEventListener('click', () => {
    const modal = document.getElementById('pro-modal');
    if (modal) modal.style.display = 'flex';
  });

  // Init Lucide icons
  if (window.lucide) window.lucide.createIcons();
}

// Toast
export function showToast(msg, type = 'info') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; }, 2500);
  setTimeout(() => t.remove(), 3000);
}

export function formatTime(sec) {
  return `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;
}

export function loadData(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } }
export function saveData(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
export function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  gain.gain.value = 0.04;
  const map = { reveal:[600,'sine',.03], flag:[800,'triangle',.04], explode:[150,'sawtooth',.07], win:[880,'sine',.05], combo:[1200,'sine',.02] };
  const [freq, wave, vol] = map[type] || [440,'sine',.03];
  osc.frequency.value = freq; osc.type = wave; gain.gain.value = vol;
  osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.stop(audioCtx.currentTime + 0.3);
}

export function getDailyDate() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}
export function getDailySeed() {
  const d = getDailyDate(); let h = 0;
  for (let i = 0; i < d.length; i++) { h = ((h << 5) - h) + d.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
