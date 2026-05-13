// Particles background
export function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize(); window.addEventListener('resize', resize);
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5, a: Math.random() * 0.5 + 0.1
    });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108,92,231,${p.a})`; ctx.fill();
    }
    // Lines between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(108,92,231,${0.1 * (1 - dist / 120)})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// Toast notifications
export function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; }, 2500);
  setTimeout(() => toast.remove(), 3000);
}

// Format time
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Storage helpers
export function loadData(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; }
}
export function saveData(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// Sound effects (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
export function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  gain.gain.value = 0.05;
  if (type === 'reveal') { osc.frequency.value = 600; osc.type = 'sine'; gain.gain.value = 0.03; }
  else if (type === 'flag') { osc.frequency.value = 800; osc.type = 'triangle'; }
  else if (type === 'explode') { osc.frequency.value = 150; osc.type = 'sawtooth'; gain.gain.value = 0.08; }
  else if (type === 'win') { osc.frequency.value = 880; osc.type = 'sine'; }
  else if (type === 'combo') { osc.frequency.value = 1000 + Math.random() * 500; osc.type = 'sine'; gain.gain.value = 0.02; }
  osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.stop(audioCtx.currentTime + 0.3);
}
