import './style.css';
import { initLayout, showToast, loadData, saveData } from './layout.js';
import { SKINS, THEMES } from './data.js';
import { initStripe, handlePayment } from './stripe.js';
import { applySkin, applyTheme, loadAndApplyCustomization } from './skins.js';

initLayout('shop');
loadAndApplyCustomization();

let selectedPlan = 'year';

function getState() {
  return {
    isPro: loadData('mf_stats', {}).isPro || false,
    ownedSkins: loadData('mf_owned_skins', ['default']),
    ownedThemes: loadData('mf_owned_themes', ['dark']),
    activeSkin: loadData('mf_active_skin', 'default'),
    activeTheme: loadData('mf_active_theme', 'dark'),
    xp: loadData('mf_stats', {}).totalXP || 0,
  };
}

function renderSkins() {
  const { isPro, ownedSkins, activeSkin, xp } = getState();
  document.getElementById('skins-grid').innerHTML = SKINS.map(s => {
    const owned = s.owned || ownedSkins.includes(s.id) || isPro;
    const active = s.id === activeSkin;
    const canBuy = !owned && s.cost && xp >= s.cost;
    const locked = !owned && !canBuy;

    return `<div class="skin-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}" data-skin="${s.id}" data-cost="${s.cost || 0}" data-pro="${s.pro || false}">
      <div class="skin-preview"><i data-lucide="${s.preview}" style="width:32px;height:32px"></i></div>
      <div class="skin-name">${s.name}</div>
      <div class="skin-price">${owned ? (active ? 'Выбрано' : 'Выбрать') : s.price}</div>
    </div>`;
  }).join('');

  // Click handlers
  document.querySelectorAll('.skin-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.skin;
      const cost = parseInt(card.dataset.cost) || 0;
      const isPro2 = card.dataset.pro === 'true';
      const st = getState();
      const owned = SKINS.find(s => s.id === id)?.owned || st.ownedSkins.includes(id) || st.isPro;

      if (owned) {
        saveData('mf_active_skin', id);
        applySkin(id);
        showToast(`Скин "${SKINS.find(s=>s.id===id)?.name}" активирован`, 'success');
        renderSkins();
      } else if (isPro2 && !st.isPro) {
        openProModal();
      } else if (cost > 0 && st.xp >= cost) {
        // Buy with XP
        const stats = loadData('mf_stats', {});
        stats.totalXP = (stats.totalXP || 0) - cost;
        saveData('mf_stats', stats);
        const skins = loadData('mf_owned_skins', ['default']);
        skins.push(id);
        saveData('mf_owned_skins', skins);
        saveData('mf_active_skin', id);
        applySkin(id);
        showToast(`Скин "${SKINS.find(s=>s.id===id)?.name}" куплен за ${cost} XP!`, 'success');
        renderSkins();
        renderThemes();
      } else if (cost > 0) {
        showToast(`Нужно ${cost} XP. У тебя ${st.xp} XP`, 'error');
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

function renderThemes() {
  const { isPro, ownedThemes, activeTheme, xp } = getState();
  document.getElementById('themes-grid').innerHTML = THEMES.map(t => {
    const owned = t.owned || ownedThemes.includes(t.id) || isPro;
    const active = t.id === activeTheme;
    const canBuy = !owned && t.cost && xp >= t.cost;
    const locked = !owned && !canBuy;

    return `<div class="theme-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}" data-theme="${t.id}" data-cost="${t.cost || 0}" data-pro="${t.pro || false}">
      <div class="theme-preview" style="background:linear-gradient(135deg,${t.colors.join(',')})"></div>
      <div class="theme-name">${t.name}</div>
      <div class="theme-price">${owned ? (active ? 'Выбрано' : 'Выбрать') : (t.price || 'Бесплатно')}</div>
    </div>`;
  }).join('');

  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.theme;
      const cost = parseInt(card.dataset.cost) || 0;
      const isPro2 = card.dataset.pro === 'true';
      const st = getState();
      const owned = THEMES.find(t => t.id === id)?.owned || st.ownedThemes.includes(id) || st.isPro;

      if (owned) {
        saveData('mf_active_theme', id);
        applyTheme(id);
        showToast(`Тема "${THEMES.find(t=>t.id===id)?.name}" активирована`, 'success');
        renderThemes();
      } else if (isPro2 && !st.isPro) {
        openProModal();
      } else if (cost > 0 && st.xp >= cost) {
        const stats = loadData('mf_stats', {});
        stats.totalXP = (stats.totalXP || 0) - cost;
        saveData('mf_stats', stats);
        const themes = loadData('mf_owned_themes', ['dark']);
        themes.push(id);
        saveData('mf_owned_themes', themes);
        saveData('mf_active_theme', id);
        applyTheme(id);
        showToast(`Тема "${THEMES.find(t=>t.id===id)?.name}" куплена за ${cost} XP!`, 'success');
        renderSkins();
        renderThemes();
      } else if (cost > 0) {
        showToast(`Нужно ${cost} XP. У тебя ${st.xp} XP`, 'error');
      }
    });
  });
}

// Plan selection
const planLabels = { month: '$2.99/мес', year: '$19.99/год', lifetime: '$49.99 навсегда' };
const planAmounts = { month: '$2.99', year: '$19.99', lifetime: '$49.99' };

document.querySelectorAll('.plan-card').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.plan-card').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedPlan = opt.dataset.plan;
    const label = document.querySelector('.stripe-modal-plan');
    if (label) label.textContent = `Подписка — ${planLabels[selectedPlan]}`;
    const btnText = document.getElementById('btn-pay-text');
    if (btnText) btnText.textContent = `Оплатить ${planAmounts[selectedPlan]}`;
  });
});

// Stripe modal
let stripeInitialized = false;
function openProModal() {
  const modal = document.getElementById('pro-modal');
  modal.style.display = 'flex';
  if (!stripeInitialized) {
    try {
      const result = initStripe();
      stripeInitialized = true;
      document.getElementById('btn-pay').disabled = false;
    } catch (e) {
      document.getElementById('btn-pay').disabled = false;
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

document.getElementById('btn-upgrade-main')?.addEventListener('click', openProModal);

// Pay button
document.getElementById('btn-pay')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-pay');
  const btnText = document.getElementById('btn-pay-text');
  const errorEl = document.getElementById('stripe-error');

  btn.disabled = true;
  if (btnText) btnText.textContent = 'Обработка...';
  if (errorEl) errorEl.style.display = 'none';

  const result = await handlePayment(selectedPlan);

  if (result.success) {
    // Activate PRO
    const stats = loadData('mf_stats', {});
    stats.isPro = true;
    saveData('mf_stats', stats);

    showToast('PRO активирован! Все скины и темы разблокированы!', 'success');
    document.getElementById('pro-modal').style.display = 'none';

    // Re-render to show unlocked items
    renderSkins();
    renderThemes();
    updateProBanner();

    if (!result.demo) {
      console.log('Real Stripe PaymentMethod:', result.paymentMethodId);
    }
  } else {
    if (errorEl) { errorEl.textContent = result.error || 'Ошибка оплаты'; errorEl.style.display = 'block'; }
  }

  btn.disabled = false;
  if (btnText) btnText.textContent = `Оплатить ${planAmounts[selectedPlan]}`;
});

function updateProBanner() {
  const { isPro } = getState();
  if (isPro) {
    const section = document.querySelector('.pro-hero');
    if (section) section.style.borderColor = 'var(--success)';
    const btn = document.getElementById('btn-upgrade-main');
    if (btn) {
      btn.innerHTML = '<i data-lucide="check-circle" style="width:15px;height:15px"></i> PRO Активен';
      btn.style.background = 'var(--success)';
      btn.disabled = true;
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

// Modal close
document.getElementById('modal-close-pro')?.addEventListener('click', () => {
  document.getElementById('pro-modal').style.display = 'none';
});
document.querySelectorAll('.modal-overlay').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; })
);

// Initial render
renderSkins();
renderThemes();
updateProBanner();
if (window.lucide) window.lucide.createIcons();
