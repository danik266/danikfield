// Skin & Theme system — applies visual changes to the game
import { loadData } from './layout.js';

const SKIN_STYLES = {
  default: {},
  neon: {
    cell: 'background:rgba(0,255,136,.05);border-color:rgba(0,255,136,.3)',
    cellHover: 'background:rgba(0,255,136,.15);border-color:#00ff88;box-shadow:0 0 8px rgba(0,255,136,.3)',
    revealed: 'background:#0a1a10',
    flagged: 'background:rgba(0,255,136,.1);border-color:rgba(0,255,136,.4)',
    numbers: ['','#00ff88','#00ccff','#ff6600','#cc00ff','#ff0066','#00ffcc','#ffcc00','#888'],
  },
  ocean: {
    cell: 'background:rgba(30,80,140,.2);border-color:rgba(60,130,200,.3)',
    cellHover: 'background:rgba(30,80,140,.35);border-color:#3c82c8;box-shadow:0 0 8px rgba(60,130,200,.3)',
    revealed: 'background:#0a1520',
    flagged: 'background:rgba(60,130,200,.15);border-color:rgba(60,130,200,.4)',
    numbers: ['','#4ea8de','#62b6cb','#1b9aaa','#5e60ce','#48bfe3','#56cfe1','#64dfdf','#888'],
  },
  fire: {
    cell: 'background:rgba(200,60,20,.08);border-color:rgba(230,100,30,.3)',
    cellHover: 'background:rgba(200,60,20,.2);border-color:#e6641e;box-shadow:0 0 8px rgba(230,100,30,.3)',
    revealed: 'background:#1a0d08',
    flagged: 'background:rgba(230,100,30,.15);border-color:rgba(230,100,30,.4)',
    numbers: ['','#ff6b35','#ffd166','#ef476f','#f77f00','#d62828','#fcbf49','#e09f3e','#888'],
  },
  gold: {
    cell: 'background:rgba(212,167,44,.08);border-color:rgba(212,167,44,.35)',
    cellHover: 'background:rgba(212,167,44,.18);border-color:#d4a72c;box-shadow:0 0 10px rgba(212,167,44,.25)',
    revealed: 'background:#141008',
    flagged: 'background:rgba(212,167,44,.15);border-color:rgba(212,167,44,.5)',
    numbers: ['','#f0d060','#e0a030','#d08020','#c06010','#b04010','#a03010','#d4a72c','#888'],
  },
  diamond: {
    cell: 'background:rgba(140,180,255,.06);border-color:rgba(140,180,255,.25)',
    cellHover: 'background:rgba(140,180,255,.15);border-color:#8cb4ff;box-shadow:0 0 12px rgba(140,180,255,.2)',
    revealed: 'background:#0c0e18',
    flagged: 'background:rgba(140,180,255,.1);border-color:rgba(140,180,255,.4)',
    numbers: ['','#a0c4ff','#bdb2ff','#ffc6ff','#caffbf','#9bf6ff','#ffd6a5','#fdffb6','#aaa'],
  },
  matrix: {
    cell: 'background:rgba(0,200,0,.04);border-color:rgba(0,180,0,.25)',
    cellHover: 'background:rgba(0,200,0,.12);border-color:#00c800;box-shadow:0 0 8px rgba(0,200,0,.25)',
    revealed: 'background:#050a05',
    flagged: 'background:rgba(0,200,0,.1);border-color:rgba(0,200,0,.4)',
    numbers: ['','#00ff00','#00cc00','#00aa00','#008800','#40ff40','#80ff80','#00ff00','#555'],
    font: "'Courier New', monospace",
  },
  cyber: {
    cell: 'background:rgba(255,0,100,.05);border-color:rgba(255,0,100,.25)',
    cellHover: 'background:rgba(255,0,100,.15);border-color:#ff0064;box-shadow:0 0 10px rgba(255,0,100,.3)',
    revealed: 'background:#0d0810',
    flagged: 'background:rgba(0,200,255,.1);border-color:rgba(0,200,255,.4)',
    numbers: ['','#00d4ff','#ff0064','#b000ff','#00ff88','#ff6600','#ffcc00','#ff0064','#666'],
  },
};

const THEME_VARS = {
  dark: {},
  midnight: {
    '--bg': '#0d1b2a', '--surface': '#1b2838', '--surface2': '#223344', '--surface3': '#2a3a4d',
    '--border': '#2d4055', '--primary': '#1b9aaa', '--primary-dim': 'rgba(27,154,170,.12)',
    '--primary-hover': '#22b0c0', '--accent': '#62b6cb', '--accent-dim': 'rgba(98,182,203,.1)',
    '--gold': '#64dfdf',
  },
  sunset: {
    '--bg': '#1a0a1a', '--surface': '#2a1428', '--surface2': '#351a32', '--surface3': '#40203c',
    '--border': '#4a2848', '--primary': '#e74c6c', '--primary-dim': 'rgba(231,76,108,.12)',
    '--primary-hover': '#f05c7c', '--accent': '#ffd93d', '--accent-dim': 'rgba(255,217,61,.1)',
    '--gold': '#ffd93d',
  },
  forest: {
    '--bg': '#0a1a0a', '--surface': '#142814', '--surface2': '#1e3520', '--surface3': '#28422a',
    '--border': '#305035', '--primary': '#2d6a4f', '--primary-dim': 'rgba(45,106,79,.12)',
    '--primary-hover': '#40916c', '--accent': '#95d5b2', '--accent-dim': 'rgba(149,213,178,.1)',
    '--gold': '#95d5b2',
  },
  sakura: {
    '--bg': '#1a0a14', '--surface': '#281420', '--surface2': '#351a2a', '--surface3': '#422034',
    '--border': '#4a2840', '--primary': '#c77dba', '--primary-dim': 'rgba(199,125,186,.12)',
    '--primary-hover': '#d88dca', '--accent': '#ffb7c5', '--accent-dim': 'rgba(255,183,197,.1)',
    '--gold': '#ffb7c5',
  },
};

export function applySkin(skinId) {
  const skin = SKIN_STYLES[skinId] || SKIN_STYLES.default;
  const root = document.documentElement;

  // Create/update a dynamic style tag for skin overrides
  let style = document.getElementById('skin-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'skin-style';
    document.head.appendChild(style);
  }

  if (!skinId || skinId === 'default') {
    style.textContent = '';
    return;
  }

  const s = skin;
  style.textContent = `
    .cell { ${s.cell || ''} }
    .cell:hover:not(.revealed):not(.flagged) { ${s.cellHover || ''} }
    .cell.revealed { ${s.revealed ? s.revealed + ';' : ''} }
    .cell.flagged { ${s.flagged || ''} }
    ${s.font ? `.cell, .board-container { font-family: ${s.font}; }` : ''}
    ${s.numbers ? s.numbers.map((c, i) => i > 0 ? `.n${i} { color: ${c} !important; }` : '').join('\n') : ''}
  `;
}

export function applyTheme(themeId) {
  const vars = THEME_VARS[themeId] || {};
  const root = document.documentElement;

  // Reset to default first
  const defaults = {
    '--bg': '#111215', '--surface': '#1a1d23', '--surface2': '#22262e', '--surface3': '#2a2f38',
    '--border': '#303540', '--primary': '#d08c40', '--primary-dim': 'rgba(208,140,64,.12)',
    '--primary-hover': '#e09a4e', '--accent': '#2ec4b6', '--accent-dim': 'rgba(46,196,182,.1)',
    '--gold': '#d4a72c',
  };

  const merged = { ...defaults, ...vars };
  for (const [k, v] of Object.entries(merged)) {
    root.style.setProperty(k, v);
  }
}

export function loadAndApplyCustomization() {
  const skin = loadData('mf_active_skin', 'default');
  const theme = loadData('mf_active_theme', 'dark');
  applySkin(skin);
  applyTheme(theme);
}
