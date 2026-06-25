/* ════════════════════════════════════════════════════════════
   AÇAÍ TRUFADO — script.js
   Framer Motion (Motion 11) via CDN + toda a lógica da página
════════════════════════════════════════════════════════════ */
const API_BASE = 'https://acai-trufado-api.onrender.com';

import { animate, stagger, inView, spring }
  from 'https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm';

/* ════════════════════════════════════════════════════════════
   NAVBAR — scroll + menu mobile
════════════════════════════════════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

const burger = document.getElementById('burger');
const mMenu  = document.getElementById('mobile-menu');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  mMenu.classList.toggle('open');
});

// Exposto globalmente — chamado pelos onclick do HTML
window.closeMenu = function () {
  burger.classList.remove('open');
  mMenu.classList.remove('open');
};

/* ════════════════════════════════════════════════════════════
   PARALLAX HERO — scroll nativo (mais simples e confiável)
════════════════════════════════════════════════════════════ */
const heroContent = document.getElementById('hero-content');
window.addEventListener('scroll', () => {
  heroContent.style.transform = `translateY(${window.scrollY * 0.18}px)`;
}, { passive: true });

/* ════════════════════════════════════════════════════════════
   CARROSSEL 3D DO AÇAÍ — busca produtos da API
════════════════════════════════════════════════════════════ */
let activeProducts = [];
let acaiImages = [];
let currentIndex = 0;
const imgEl  = document.getElementById('acai-3d-img');
const nameEl = document.getElementById('acai-name');
const btnPrev = document.getElementById('prev-acai');
const btnNext = document.getElementById('next-acai');

function setCarouselItem(idx) {
  const item = acaiImages[idx];
  if (!item) return;
  if (item.src) {
    imgEl.src = item.src;
    imgEl.style.display = '';
  } else {
    imgEl.src = '';
    imgEl.style.display = 'none';
  }
  nameEl.textContent = item.name;
}

async function changeProduct(direction) {
  if (!acaiImages || acaiImages.length < 2) return;
  btnPrev.disabled = true;
  btnNext.disabled = true;

  await animate(imgEl,
    { x: direction * -80, opacity: 0, rotate: direction * -15 },
    { duration: 0.2, easing: 'ease-in' }
  );

  currentIndex = (currentIndex + direction + acaiImages.length) % acaiImages.length;
  setCarouselItem(currentIndex);
  imgEl.style.transform = `translateX(${direction * 80}px) rotate(${direction * 15}deg)`;

  await animate(imgEl,
    { x: 0, opacity: 1, rotate: 0 },
    { duration: 0.4, easing: 'ease-out' }
  );

  btnPrev.disabled = false;
  btnNext.disabled = false;
}

async function loadCarousel() {
  try {
    const res = await fetch('https://acai-trufado-api.onrender.com/api/products');
    if (res.ok) {
      const products = await res.json();
      if (products.length > 0) {
        activeProducts = products.map(p => ({
          id: p.id, name: p.name, desc: p.description,
          imageBase64: p.image_base64, active: p.active, groups: p.groups || []
        }));
        acaiImages = products.map(p => ({ src: p.image_base64 || null, name: p.name }));
        currentIndex = 0;
        setCarouselItem(0);
        if (acaiImages.length < 2) {
          btnPrev.style.display = 'none';
          btnNext.style.display = 'none';
        }
        renderCremes();
        return;
      }
    }
  } catch { /* sem conexão */ }
  imgEl.style.display = 'none';
  nameEl.textContent = 'Açaí Trufado';
  btnPrev.style.display = 'none';
  btnNext.style.display = 'none';
  renderCremes();
}

loadCarousel();

btnPrev.addEventListener('click', () => changeProduct(-1));
btnNext.addEventListener('click', () => changeProduct(1));

/* ════════════════════════════════════════════════════════════
   ANIMAÇÃO DE ENTRADA DO HERO — stagger em cascata
════════════════════════════════════════════════════════════ */
const heroSequence = [
  ['.eyebrow',    0.1 ],
  ['.hero-h1',    0.22],
  ['.hero-h2',    0.38],
  ['.hero-sub',   0.52],
  ['.hero-glass', 0.64],
  ['.cta-group',  0.76],
  ['.scroll-cue', 0.92],
];

heroSequence.forEach(([sel, delay]) => {
  const el = document.querySelector(sel);
  if (!el) return;
  animate(
    el,
    { opacity: [0, 1], y: [28, 0] },
    { duration: 0.65, delay, easing: [0.22, 1, 0.36, 1] }
  );
});

/* ════════════════════════════════════════════════════════════
   HOVER DOS BOTÕES — spring physics
════════════════════════════════════════════════════════════ */
document.querySelectorAll('.btn-primary, .btn-cta').forEach(btn => {
  btn.addEventListener('mouseenter', () =>
    animate(btn, { scale: 1.05 }, { easing: spring({ stiffness: 400, damping: 20 }) }));
  btn.addEventListener('mouseleave', () =>
    animate(btn, { scale: 1 }, { easing: spring({ stiffness: 300, damping: 22 }) }));
  btn.addEventListener('mousedown', () =>
    animate(btn, { scale: 0.96 }, { duration: 0.08 }));
  btn.addEventListener('mouseup', () =>
    animate(btn, { scale: 1.05 }, { duration: 0.12 }));
});

/* ════════════════════════════════════════════════════════════
   CARD TILT 3D — Motion spring no enter/leave
════════════════════════════════════════════════════════════ */
function addTilt(card) {
  card.addEventListener('mousemove', e => {
    const r  = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * 6;
    const ry = -((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * 6;
    animate(card, { rotateX: rx, rotateY: ry, scale: 1.03 }, { duration: 0.15 });
  });
  card.addEventListener('mouseleave', () => {
    animate(card, { rotateX: 0, rotateY: 0, scale: 1 },
      { easing: spring({ stiffness: 260, damping: 22 }) });
  });
}

/* ════════════════════════════════════════════════════════════
   CREMES — produtos da API ou fallback estático
════════════════════════════════════════════════════════════ */
const CREMES_STATIC = [
  { emoji: '🍫', name: 'Chocolate Belga',  desc: 'Creme escuro intenso feito com chocolate premium',  bar: 'linear-gradient(90deg,#c8702a,#5c2d0a)' },
  { emoji: '🤍', name: 'Chocolate Branco', desc: 'Creme suave e cremoso de chocolate branco',          bar: 'linear-gradient(90deg,#f5e6c8,#3d2060)' },
  { emoji: '🍓', name: 'Morango Trufado',  desc: 'Creme rosado com sabor intenso de morango',          bar: 'linear-gradient(90deg,#f9a8d4,#6b0a35)' },
  { emoji: '✨', name: 'Combinados',        desc: 'Dois cremes juntos no mesmo pote',                   bar: 'linear-gradient(90deg,#f5a623,#2e0a55)' },
];

const cremesGrid = document.getElementById('cremes-grid');

function renderCremes() {
  cremesGrid.innerHTML = '';
  if (activeProducts.length > 0) {
    activeProducts.forEach(p => {
      const d = document.createElement('div');
      d.className = 'glass-card card';
      d.innerHTML = `
        ${p.imageBase64
          ? `<div class="card-product-img"><img src="${p.imageBase64}" alt="${p.name}" /></div>`
          : `<div class="card-emoji">🍧</div>`}
        <h3 class="card-title">${p.name}</h3>
        <p class="card-desc">${p.desc || ''}</p>
        <div class="card-bar" style="background:linear-gradient(90deg,var(--primary),var(--gold))"></div>
        <button type="button" class="card-order-btn" data-order-id="${p.id}">🍫 Montar esse pote</button>`;
      cremesGrid.appendChild(d);
      addTilt(d);
    });
  } else {
    CREMES_STATIC.forEach(c => {
      const d = document.createElement('div');
      d.className = 'glass-card card';
      d.innerHTML = `
        <div class="card-emoji">${c.emoji}</div>
        <h3 class="card-title">${c.name}</h3>
        <p class="card-desc">${c.desc}</p>
        <div class="card-bar" style="background:${c.bar}"></div>`;
      cremesGrid.appendChild(d);
      addTilt(d);
    });
  }
}

renderCremes();

/* ════════════════════════════════════════════════════════════
   ETAPAS — dados + injeção no DOM
════════════════════════════════════════════════════════════ */
const ETAPAS = [
  { icon: '🥤', tag: '01 — TAMANHO', title: 'Escolha o Tamanho', desc: '250ml R$13 · 350ml R$15 · 400ml R$20 · 500ml R$25',        detail: 'Do copo individual ao pote família.' },
  { icon: '🍦', tag: '02 — CREME',   title: 'Creme Trufado',     desc: 'Açaí tradicional · Creme de ninho · Creme de ovomaltine',  detail: 'O segredo está no creme artesanal.' },
  { icon: '🍫', tag: '03 — RECHEIO', title: 'Recheio',           desc: 'Nutella · Brigadeiro de amendoim · Morango',               detail: 'Camada extra de sabor no meio do pote.' },
  { icon: '✨', tag: '04 — ADICIONAIS', title: 'Adicionais & Caldas', desc: 'Ovomaltine · Chocoball · Paçoca · Amendoim · Leite condensado · Calda de morango', detail: 'Finalize do seu jeito.' },
];

const etapasGrid = document.getElementById('etapas-grid');
ETAPAS.forEach((item, i) => {
  const d = document.createElement('div');
  d.className = 'glass-card card';
  d.innerHTML = `
    <div class="card-num">0${i + 1}</div>
    <div class="card-emoji">${item.icon}</div>
    <div class="card-tag">${item.tag}</div>
    <h3 class="card-title">${item.title}</h3>
    <p class="card-desc">${item.desc}</p>
    <p class="card-detail">${item.detail}</p>`;
  etapasGrid.appendChild(d);
  addTilt(d);
});

/* ════════════════════════════════════════════════════════════
   SCROLL REVEALS com inView
   ⚠ Registrado APÓS injeção dos cards no DOM
════════════════════════════════════════════════════════════ */

// Stats — fade up
inView('#stats .stat-item', entry => {
  animate(entry.target, { opacity: [0, 1], y: [20, 0] },
    { duration: 0.6, easing: [0.22, 1, 0.36, 1] });
});

// Stats — contador numérico
inView('#stats', () => {
  document.querySelectorAll('.stat-value').forEach(el => {
    const raw    = el.textContent.replace(/[^0-9.]/g, '');
    const target = parseFloat(raw);
    if (isNaN(target)) return;
    const suffix = el.textContent.replace(raw, '');
    animate(0, target, {
      duration: 1.8,
      easing: [0.22, 1, 0.36, 1],
      onUpdate: v => {
        el.textContent = (Number.isInteger(target) ? Math.round(v) : v.toFixed(1)) + suffix;
      },
    });
  });
}, { amount: 0.4 });

// Título seção cremes
inView('#cremes .section-header-center', entry => {
  animate(entry.target, { opacity: [0, 1], y: [20, 0] },
    { duration: 0.55, easing: [0.22, 1, 0.36, 1] });
}, { amount: 0.5 });

// Cards de cremes — stagger
inView('#cremes', () => {
  const cards = document.querySelectorAll('#cremes .glass-card');
  if (!cards.length) return;
  animate(cards, { opacity: [0, 1], y: [32, 0], scale: [0.96, 1] },
    { delay: stagger(0.1), duration: 0.55, easing: [0.22, 1, 0.36, 1] });
}, { amount: 0.1 });

// Título seção etapas
inView('#etapas .section-header', entry => {
  animate(entry.target, { opacity: [0, 1], y: [20, 0] },
    { duration: 0.55, easing: [0.22, 1, 0.36, 1] });
}, { amount: 0.5 });

// Cards de etapas — stagger com slide da esquerda
inView('#etapas', () => {
  const cards = document.querySelectorAll('#etapas .glass-card');
  if (!cards.length) return;
  animate(cards, { opacity: [0, 1], x: [-24, 0] },
    { delay: stagger(0.1), duration: 0.5, easing: [0.22, 1, 0.36, 1] });
}, { amount: 0.1 });

// Terrain
inView('#terrain-wrap', entry => {
  animate(entry.target, { opacity: [0, 1], scaleY: [0.85, 1] },
    { duration: 0.9, easing: [0.22, 1, 0.36, 1] });
}, { amount: 0.3 });

// Seção "sobre" — cards de storytelling
inView('#sobre .glass-card', entry => {
  animate(entry.target, { opacity: [0, 1], y: [24, 0] },
    { duration: 0.6, easing: [0.22, 1, 0.36, 1] });
});

// CTA final — pop-in
inView('#cta .cta-inner', entry => {
  animate(entry.target, { opacity: [0, 1], scale: [0.88, 1] },
    { duration: 0.6, easing: [0.34, 1.56, 0.64, 1] });
}, { amount: 0.35 });

// Footer
inView('footer', entry => {
  animate(entry.target, { opacity: [0, 1] }, { duration: 0.8 });
}, { amount: 0.3 });

/* ════════════════════════════════════════════════════════════
   PARTICLE CANVAS — partículas rosa, douradas e brancas
════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H;
  const particles = [];
  const mouse     = { x: -999, y: -999 };
  const COUNT     = window.innerWidth < 768 ? 55 : 130;

  const COLS = [
    a => `rgba(233,30,140,${a})`,
    a => `rgba(245,166,35,${a})`,
    a => `rgba(255,220,240,${a})`,
  ];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function mkParticle() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r:  Math.random() * 1.6 + .3,
      op: Math.random() * .55 + .15,
      ps: Math.random() * .018 + .004,
      po: Math.random() * Math.PI * 2,
      type: [0, 0, 1, 1, 2][Math.floor(Math.random() * 5)],
    };
  }
  for (let i = 0; i < COUNT; i++) particles.push(mkParticle());

  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('touchmove', e => {
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
  }, { passive: true });

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    // conexões entre partículas rosa
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].type !== 0) continue;
      for (let j = i + 1; j < particles.length; j++) {
        if (particles[j].type !== 0) continue;
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(233,30,140,${.07 * (1 - d / 90)})`;
          ctx.lineWidth = .4;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      const pulse = Math.sin(ts * .001 * p.ps * 18 + p.po) * .3 + .7;
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 160 && dist > 0) {
        const f = (160 - dist) / 160;
        p.vx += (dx / dist) * f * .012;
        p.vy += (dy / dist) * f * .012;
      }
      p.vx *= .98; p.vy *= .98;
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      const col = COLS[p.type];
      const r   = p.r * pulse;

      if (p.type > 0 && p.r > 1) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = col(p.op * pulse * .8);
        ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(-r * 2.5, 0); ctx.lineTo(r * 2.5, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -r * 2.5); ctx.lineTo(0, r * 2.5); ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = col(p.op * pulse);
      ctx.fill();

      if (p.r > 1) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col(.025 * pulse);
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ════════════════════════════════════════════════════════════
   WIREFRAME TERRAIN — ruído Perlin-like animado
════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('terrain-canvas');
  const ctx    = canvas.getContext('2d');
  let offset   = 0;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();

  const COLS = 28, ROWS = 14;
  const noise = (x, y, t) =>
    Math.sin(x * .4 + t * .8) * .5 +
    Math.sin(y * .6 + t * .5) * .3 +
    Math.sin((x + y) * .3 + t * .6) * .2;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    offset += .012;
    const t     = offset;
    const cellW = canvas.width  / (COLS - 1);
    const cellH = canvas.height / (ROWS - 1);
    const amp   = canvas.height * .22;
    const baseY = canvas.height * .6;

    ctx.lineWidth = .6;

    for (let row = 0; row < ROWS; row++) {
      ctx.beginPath();
      const depth = row / ROWS;
      const r = Math.round(100 + depth * 133);
      const g = Math.round(10  + depth * 20);
      const b = Math.round(180 - depth * 40);
      ctx.strokeStyle = `rgba(${r},${g},${b},${.06 + depth * .22})`;
      for (let col = 0; col < COLS; col++) {
        const x = col * cellW;
        const y = baseY - row * cellH * .35 + noise(col * .5, row * .5, t) * amp * depth;
        col === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    for (let col = 0; col < COLS; col++) {
      ctx.beginPath();
      for (let row = 0; row < ROWS; row++) {
        const x     = col * cellW;
        const depth = row / ROWS;
        const y     = baseY - row * cellH * .35 + noise(col * .5, row * .5, t) * amp * depth;
        ctx.strokeStyle = `rgba(233,30,140,${.03 + depth * .09})`;
        row === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ════════════════════════════════════════════════════════════
   MODAL DE PERSONALIZAÇÃO DO PEDIDO
════════════════════════════════════════════════════════════ */
/* ── Referências dos modais ───────────────────────────────── */
const orderOverlay   = document.getElementById('order-overlay');
const orderHeroImg   = document.getElementById('order-hero-img');
const orderHeroEmoji = document.getElementById('order-hero-emoji');
const orderName      = document.getElementById('order-product-name');
const orderDesc      = document.getElementById('order-product-desc');
const orderBody      = document.getElementById('order-body');
const orderTotalVal  = document.getElementById('order-total-val');
const orderConfirm   = document.getElementById('order-confirm');
const orderClose     = document.getElementById('order-close');

const deliveryOverlay = document.getElementById('delivery-overlay');
const pixOverlay      = document.getElementById('pix-overlay');
const trackingOverlay = document.getElementById('tracking-overlay');

/* ── Estado do pedido ────────────────────────────────────── */
let orderSelections  = {};
let orderProduct     = null;
let selectedDelivery = null;
let activeOrderId    = null;
let pixTimerInterval = null;
let pollInterval     = null;

/* ── Abre o modal com o produto ───────────────────────────── */
function openOrderModal(product) {
  if (!product) return;
  orderProduct = product;
  orderSelections = {};

  // Inicializa selections com 0 pra cada opção
  (product.groups || []).forEach(g => {
    orderSelections[g.id] = {};
    (g.options || []).forEach(o => { orderSelections[g.id][o.name] = 0; });
  });

  // Hero: imagem ou emoji
  if (product.imageBase64) {
    orderHeroImg.src    = product.imageBase64;
    orderHeroImg.classList.remove('hidden');
    orderHeroEmoji.style.display = 'none';
  } else {
    orderHeroImg.classList.add('hidden');
    orderHeroEmoji.style.display = 'flex';
  }

  orderName.textContent = product.name;
  orderDesc.textContent = product.desc || '';

  renderOrderGroups();
  updateOrderTotal();

  orderOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeOrderModal() {
  orderOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

/* ── Renderiza grupos e opções ────────────────────────────── */
function renderOrderGroups() {
  orderBody.innerHTML = '';
  const groups = orderProduct?.groups || [];

  if (!groups.length) {
    orderBody.innerHTML = '<p class="order-empty">Nenhum acompanhamento configurado para este produto.</p>';
    return;
  }

  groups.forEach(group => {
    const isRadio = group.required && group.max == 1;
    const min = Number(group.min) || 0;
    const max = Number(group.max) || 99;

    const subLabel = group.required
      ? (min === max ? `Escolha exatamente ${min}` : `Escolha de ${min} a ${max}`)
      : `Opcional · até ${max} ${max === 1 ? 'item' : 'itens'}`;

    const section = document.createElement('div');
    section.className = 'order-group';
    section.innerHTML = `
      <div class="order-group-header">
        <span class="order-group-name">${escHtml(group.name)}</span>
        <span class="order-group-badge ${group.required ? 'badge-required' : 'badge-optional'}">
          ${group.required ? 'Obrigatório' : 'Opcional'}
        </span>
      </div>
      <p class="order-group-sub">${subLabel}</p>
      <div class="order-options-list"></div>`;

    const optsList = section.querySelector('.order-options-list');
    const opts = group.options || [];

    if (isRadio) {
      // Seleção única — estilo rádio visual
      opts.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'radio-option-label';
        const priceStr = opt.price > 0 ? `+R$ ${Number(opt.price).toFixed(2).replace('.', ',')}` : 'Grátis';
        label.innerHTML = `
          <input type="radio" name="grp-${group.id}" value="${escHtml(opt.name)}" class="radio-input" />
          <span class="radio-circle"></span>
          <span class="opt-name">${escHtml(opt.name)}</span>
          <span class="opt-price">${priceStr}</span>`;
        label.querySelector('.radio-input').addEventListener('change', () => {
          orderSelections[group.id] = {};
          opts.forEach(o => { orderSelections[group.id][o.name] = 0; });
          orderSelections[group.id][opt.name] = 1;
          updateOrderTotal();
        });
        optsList.appendChild(label);
      });
    } else {
      // Múltipla quantidade — contadores +/−
      opts.forEach(opt => {
        const row = document.createElement('div');
        row.className = 'order-option';
        const qty = orderSelections[group.id]?.[opt.name] || 0;
        const priceStr = opt.price > 0 ? `+R$ ${Number(opt.price).toFixed(2).replace('.', ',')}` : 'Grátis';
        row.innerHTML = `
          <span class="opt-name">${escHtml(opt.name)}</span>
          <span class="opt-price">${priceStr}</span>
          <div class="opt-counter">
            <button type="button" class="counter-btn minus" ${qty === 0 ? 'disabled' : ''}>−</button>
            <span class="counter-val">${qty}</span>
            <button type="button" class="counter-btn plus">+</button>
          </div>`;

        const counterWrap = row.querySelector('.opt-counter');
        const valEl  = row.querySelector('.counter-val');
        const minBtn = row.querySelector('.minus');
        const plusBtn= row.querySelector('.plus');

        minBtn.addEventListener('click', () => {
          const cur = orderSelections[group.id][opt.name] || 0;
          if (cur <= 0) return;
          orderSelections[group.id][opt.name] = cur - 1;
          valEl.textContent = cur - 1;
          minBtn.disabled = (cur - 1) === 0;
          updateOrderTotal();
        });

        plusBtn.addEventListener('click', () => {
          const cur   = orderSelections[group.id][opt.name] || 0;
          const total = Object.values(orderSelections[group.id]).reduce((a, b) => a + b, 0);
          if (total >= max) {
            counterWrap.classList.add('maxed');
            setTimeout(() => counterWrap.classList.remove('maxed'), 350);
            return;
          }
          orderSelections[group.id][opt.name] = cur + 1;
          valEl.textContent = cur + 1;
          minBtn.disabled = false;
          updateOrderTotal();
        });

        optsList.appendChild(row);
      });
    }

    orderBody.appendChild(section);
  });
}

/* ── Calcula e exibe o total ──────────────────────────────── */
function updateOrderTotal() {
  let total = 0;
  (orderProduct?.groups || []).forEach(g => {
    (g.options || []).forEach(o => {
      total += (orderSelections[g.id]?.[o.name] || 0) * (Number(o.price) || 0);
    });
  });
  orderTotalVal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  return total;
}

/* ── Valida obrigatórios ──────────────────────────────────── */
function validateOrder() {
  for (const group of (orderProduct?.groups || [])) {
    if (!group.required) continue;
    const min = Number(group.min) || 1;
    const total = Object.values(orderSelections[group.id] || {}).reduce((a, b) => a + b, 0);
    if (total < min) return group.name;
  }
  return null;
}

/* ════════════════════════════════════════════════════════════
   ETAPA 2 — ENTREGA + DADOS DO CLIENTE
════════════════════════════════════════════════════════════ */
function openDeliveryStep() {
  const missing = validateOrder();
  if (missing) {
    orderBody.querySelectorAll('.order-group').forEach(g => {
      if (g.querySelector('.order-group-name')?.textContent.trim() === missing) {
        animate(g, { x: [-5, 5, -4, 4, 0] }, { duration: 0.35 });
        const nm = g.querySelector('.order-group-name');
        nm.style.color = '#e91e8c';
        setTimeout(() => { nm.style.color = ''; }, 1100);
      }
    });
    return;
  }
  document.getElementById('delivery-total-val').textContent = orderTotalVal.textContent;
  orderOverlay.classList.add('hidden');
  deliveryOverlay.classList.remove('hidden');
}

// Seleção de método de entrega
deliveryOverlay.querySelectorAll('.delivery-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    deliveryOverlay.querySelectorAll('.delivery-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedDelivery = btn.dataset.method;
  });
});

document.getElementById('delivery-back').addEventListener('click', () => {
  deliveryOverlay.classList.add('hidden');
  orderOverlay.classList.remove('hidden');
});

document.getElementById('delivery-close').addEventListener('click', closeAllModals);

let submittingOrder = false; // 🔒 trava contra duplo clique

document.getElementById('delivery-next').addEventListener('click', async () => {
  if (submittingOrder) return; // já está processando — ignora cliques extras

  const btn   = document.getElementById('delivery-next');
  const name  = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const errEl = document.getElementById('delivery-error');

  if (!name || !phone || !selectedDelivery) {
    errEl.classList.remove('hidden');
    animate(errEl, { x: [-4, 4, -3, 3, 0] }, { duration: 0.3 });
    return;
  }
  errEl.classList.add('hidden');

  // Trava o botão durante a geração do PIX
  submittingOrder = true;
  btn.disabled = true;
  const txtOriginal = btn.textContent;
  btn.textContent = 'Gerando PIX…';

  try {
    await openPixStep(name, phone);
  } finally {
    submittingOrder = false;
    btn.disabled = false;
    btn.textContent = txtOriginal;
  }
});

/* ════════════════════════════════════════════════════════════
   ETAPA 3 — PAGAMENTO PIX
════════════════════════════════════════════════════════════ */
const ORDERS_KEY = 'acai_orders';

function getOrders()        { try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch { return []; } }
function saveOrders(list)   { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); }

function uid() { return 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

function buildSelectionsSummary() {
  return (orderProduct?.groups || []).map(g => ({
    groupName: g.name,
    options: (g.options || [])
      .filter(o => (orderSelections[g.id]?.[o.name] || 0) > 0)
      .map(o => ({ name: o.name, qty: orderSelections[g.id][o.name], price: Number(o.price) || 0 }))
  })).filter(g => g.options.length > 0);
}

function calcTotal() {
  let t = 0;
  (orderProduct?.groups || []).forEach(g =>
    (g.options || []).forEach(o => {
      t += (orderSelections[g.id]?.[o.name] || 0) * (Number(o.price) || 0);
    })
  );
  return t;
}

/* Gera um código PIX EMV simplificado (mock — substitua pela resposta do Mercado Pago) */
function mockPixCode(amount, orderId) {
  const amt     = amount.toFixed(2);
  const key     = '11999999999'; // substitua pela chave PIX real
  const name    = 'ACAI TRUFADO';
  const city    = 'SAO PAULO';
  const txid    = orderId.replace(/[^A-Z0-9]/gi, '').slice(0, 25).toUpperCase();
  const payload =
    `000201` +
    `26${String(14 + key.length + 3).padStart(2,'0')}0014BR.GOV.BCB.PIX01${String(key.length).padStart(2,'0')}${key}` +
    `52040000` +
    `5303986` +
    `54${String(amt.length).padStart(2,'0')}${amt}` +
    `5802BR` +
    `59${String(name.length).padStart(2,'0')}${name}` +
    `60${String(city.length).padStart(2,'0')}${city}` +
    `62${String(txid.length+4).padStart(2,'0')}0503${txid}`;
  const crc = crc16(payload + '6304');
  return payload + '6304' + crc;
}

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return ((crc & 0xFFFF).toString(16).toUpperCase().padStart(4,'0'));
}

/* QR Code REAL via biblioteca QRious (carregada no index.html) */
function drawQR(canvas, text) {
  if (!window.QRious || !text) {
    console.error('QRious não carregou ou texto vazio');
    return;
  }
  new window.QRious({
    element: canvas,
    value:   text,
    size:    canvas.width,
    level:   'M',
    background: '#ffffff',
    foreground: '#000000',
  });
}

async function openPixStep(customerName, customerPhone) {
  const total   = calcTotal();
  const orderId = uid();
  activeOrderId = orderId;
  localStorage.setItem('acai_active_order', orderId);

  // Cria o pedido no localStorage
  const order = {
    id: orderId,
    createdAt: Date.now(),
    product: { id: orderProduct.id, name: orderProduct.name },
    summary: buildSelectionsSummary(),
    deliveryMethod: selectedDelivery,
    customerName,
    customerPhone,
    paymentMethod: 'pix',
    total,
    status: 'aguardando_pix',
    pixExpiry: Date.now() + 10 * 60 * 1000,
  };

  // Tenta chamar backend Mercado Pago (Next.js em :3000)
  let pixCode;
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName:   order.customerName,
        customerPhone:  order.customerPhone,
        productName:    order.product?.name ?? order.productName ?? '',
        summary:        order.summary,
        deliveryMethod: order.deliveryMethod,
        total:          order.total,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      pixCode = data.pixCode || mockPixCode(total, orderId);
      order.id = data.id || orderId;
      activeOrderId = order.id;
      localStorage.setItem('acai_active_order', order.id);
    } else { pixCode = mockPixCode(total, orderId); }
  } catch {
    pixCode = mockPixCode(total, orderId);
  }

  order.pixCode = pixCode;
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  // Solicita permissão e registra push após pedido criado
  subscribePush(order.customerPhone || order.phone || '');

  // Renderiza tela PIX
  document.getElementById('pix-total-display').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  const codeEl = document.getElementById('pix-code-text');
  codeEl.textContent = pixCode;

  const canvas = document.getElementById('pix-qr-canvas');
  drawQR(canvas, pixCode);

  // Timer 10min
  clearInterval(pixTimerInterval);
  const expiry = order.pixExpiry;
  function updateTimer() {
    const left = Math.max(0, expiry - Date.now());
    const m = String(Math.floor(left / 60000)).padStart(2, '0');
    const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
    const el = document.getElementById('pix-timer');
    if (el) el.textContent = `${m}:${s}`;
    if (left <= 0) clearInterval(pixTimerInterval);
  }
  updateTimer();
  pixTimerInterval = setInterval(updateTimer, 1000);

  deliveryOverlay.classList.add('hidden');
  pixOverlay.classList.remove('hidden');

  // Começa a checar status a cada 5s
  startPolling(order.id);
}

// Botão copiar PIX
document.getElementById('pix-copy-btn').addEventListener('click', () => {
  const code = document.getElementById('pix-code-text').textContent;
  navigator.clipboard?.writeText(code).catch(() => {});
  const btn = document.getElementById('pix-copy-btn');
  btn.textContent = '✓ Copiado!';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = '📋 Copiar'; btn.classList.remove('copied'); }, 2200);
});

document.getElementById('pix-back').addEventListener('click', () => {
  clearInterval(pixTimerInterval);
  clearInterval(pollInterval);
  pixOverlay.classList.add('hidden');
  deliveryOverlay.classList.remove('hidden');
});

/* ════════════════════════════════════════════════════════════
   POLLING — verifica pagamento no localStorage / backend
════════════════════════════════════════════════════════════ */
function startPolling(orderId) {
  clearInterval(pollInterval);
  pollInterval = setInterval(() => checkPayment(orderId), 4000);
}

async function checkPayment(orderId) {
  let status;
  // Tenta backend primeiro
  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) { const d = await res.json(); status = d.status; }
  } catch { /* usa localStorage */ }

  if (!status) {
    const orders = getOrders();
    const o = orders.find(x => x.id === orderId);
    status = o?.status;
  }

  if (status && status !== 'aguardando_pix') {
    clearInterval(pollInterval);
    clearInterval(pixTimerInterval);
    pixOverlay.classList.add('hidden');
    openTracking(orderId);
  }
}

/* ════════════════════════════════════════════════════════════
   ETAPA 4 — ACOMPANHAR PEDIDO
════════════════════════════════════════════════════════════ */
// Steps variam por método de entrega — montados dinamicamente em openTracking()
const TRACKING_STEPS_RETIRADA = [
  { key: 'aguardando_pix', icon: '💳', label: 'PIX'        },
  { key: 'preparando',     icon: '🍧', label: 'Preparando' },
  { key: 'pronto',         icon: '🎉', label: 'Pronto'     },
];

const TRACKING_STEPS_MOTOBOY = [
  { key: 'aguardando_pix',    icon: '💳', label: 'PIX'        },
  { key: 'preparando',        icon: '🍧', label: 'Preparando' },
  { key: 'pronto',            icon: '📦', label: 'Pronto'     },
  { key: 'motoboy_a_caminho', icon: '🛵', label: 'A Caminho'  },
];

function getTrackingSteps(order) {
  return order.deliveryMethod === 'motoboy' ? TRACKING_STEPS_MOTOBOY : TRACKING_STEPS_RETIRADA;
}

// pago é tratado como preparando no stepper (mesmo passo visual)
function trackingStatusKey(status) {
  return status === 'pago' ? 'preparando' : status;
}

const STATUS_DISPLAY = {
  aguardando_pix:    { icon: '⏳', msg: 'Aguardando Pagamento',         sub: 'Conclua o pagamento via PIX para confirmar.',           cls: 'status-aguardando' },
  pago:              { icon: '✅', msg: 'Pagamento Confirmado!',         sub: 'Seu pedido entrou na fila — já vai começar!',            cls: 'status-preparando' },
  preparando:        { icon: '🍧', msg: 'Preparando seu Açaí!',          sub: 'Já estamos fazendo com carinho pra você.',               cls: 'status-preparando' },
  pronto:            { icon: '🎉', msg: 'Pronto para retirar!',          sub: 'Pode vir buscar ou chamar o motoboy.',                   cls: 'status-pronto'     },
  motoboy_a_caminho: { icon: '🛵', msg: 'Motoboy a caminho!',            sub: 'Seu açaí está com o motoboy e já está indo até você!',   cls: 'status-motoboy'    },
  concluido:         { icon: '💜', msg: 'Pedido Entregue!',              sub: 'Obrigada pela preferência! Até a próxima 🍧',            cls: 'status-concluido'  },
};

function openTracking(orderId) {
  const orders = getOrders();
  const order  = orders.find(x => x.id === orderId);
  if (!order) return;

  document.getElementById('tracking-id-num').textContent = '#' + orderId.slice(-6).toUpperCase();

  // Stepper — steps dinâmicos por método de entrega
  const stepper = document.getElementById('tracking-stepper');
  stepper.innerHTML = '';
  const steps = getTrackingSteps(order);
  const statusIdx = steps.findIndex(s => s.key === trackingStatusKey(order.status));

  steps.forEach((step, i) => {
    if (i > 0) {
      const line = document.createElement('div');
      line.className = 'ts-line' + (i <= statusIdx ? ' done-line' : '');
      if (i <= statusIdx) line.style.background = '#10b981';
      stepper.appendChild(line);
    }
    const stepEl = document.createElement('div');
    const cls = i < statusIdx ? 'done' : i === statusIdx ? 'active' : '';
    stepEl.className = `ts-step ${cls}`;
    stepEl.innerHTML = `<div class="ts-icon">${step.icon}</div><div class="ts-label">${step.label}</div>`;
    stepper.appendChild(stepEl);
  });

  // Status card
  const sd = STATUS_DISPLAY[order.status] || STATUS_DISPLAY.aguardando_pix;
  const card = document.getElementById('tracking-status-card');
  card.className = 'tracking-status-card ' + sd.cls;
  document.getElementById('tracking-status-msg').textContent = sd.msg;
  document.getElementById('tracking-status-sub').textContent = sd.sub;

  // Mostra pote animado em preparando, emoji nos demais status
  const isPreparando = order.status === 'preparando' || order.status === 'pago';
  const iconEl  = document.getElementById('tracking-status-icon');
  const poteEl  = document.getElementById('pote-anim');
  if (isPreparando) {
    iconEl.style.display = 'none';
    poteEl.classList.remove('hidden');
  } else {
    iconEl.style.display = '';
    iconEl.textContent = sd.icon;
    poteEl.classList.add('hidden');
  }

  // Resumo
  document.getElementById('tracking-prod-name').textContent = order.product?.name || '';
  const selList = document.getElementById('tracking-sel-list');
  selList.innerHTML = (order.summary || []).map(g => {
    if (g.options) {
      return `<div class="tracking-sel-line"><strong>${escHtml(g.groupName)}:</strong> ${g.options.map(o => (o.qty > 1 ? o.qty + '× ' : '') + o.name).join(', ')}</div>`;
    }
    return `<div class="tracking-sel-line"><strong>${escHtml(g.label || g.groupName || '')}:</strong> ${escHtml(g.value || '')}</div>`;
  }).join('');

  const STORE_ADDRESS = 'Tv. Lauro Bezerra, 144 - Potengi, Natal - RN, 59127-270';
  const isMotoboy = order.deliveryMethod === 'motoboy';
  const delivLabel = isMotoboy ? '🛵 Solicitar Motoboy' : '🏠 Retirar no Local';
  document.getElementById('tracking-meta').innerHTML = `
    <span class="tracking-delivery-badge">${delivLabel}</span>
    <span class="tracking-total-val">R$ ${Number(order.total).toFixed(2).replace('.', ',')}</span>`;

  // Bloco de endereço para motoboy
  let addrBlock = document.getElementById('tracking-address-block');
  if (!addrBlock) {
    addrBlock = document.createElement('div');
    addrBlock.id = 'tracking-address-block';
    document.getElementById('tracking-meta').after(addrBlock);
  }
  if (isMotoboy) {
    addrBlock.innerHTML = `
      <div class="tracking-address-box">
        <div class="tracking-address-label">📍 Endereço para o motoboy buscar:</div>
        <div class="tracking-address-text">${STORE_ADDRESS}</div>
        <button class="tracking-copy-addr" id="tracking-copy-addr">📋 Copiar Endereço</button>
      </div>`;
    document.getElementById('tracking-copy-addr').addEventListener('click', function() {
      navigator.clipboard.writeText(STORE_ADDRESS).then(() => {
        this.textContent = '✅ Copiado!';
        setTimeout(() => { this.textContent = '📋 Copiar Endereço'; }, 2000);
      });
    });
  } else {
    addrBlock.innerHTML = '';
  }

  // Botão ver PIX se ainda aguardando
  const pixBtn = document.getElementById('tracking-show-pix');
  pixBtn.style.display = order.status === 'aguardando_pix' ? '' : 'none';

  trackingOverlay.classList.remove('hidden');
  document.getElementById('order-fab')?.classList.add('hidden');

  // Polling de atualização de status
  if (!['pronto', 'concluido'].includes(order.status)) {
    startTrackingPoll(orderId);
  }
}

function startTrackingPoll(orderId) {
  clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    let status;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) { const d = await res.json(); status = d.status; }
    } catch { /* usa localStorage */ }

    if (!status) {
      const o = getOrders().find(x => x.id === orderId);
      status = o?.status;
    }

    const sd = STATUS_DISPLAY[status];
    if (sd) {
      const card = document.getElementById('tracking-status-card');
      if (card) {
        card.className = 'tracking-status-card ' + sd.cls;
        document.getElementById('tracking-status-icon').textContent = sd.icon;
        document.getElementById('tracking-status-msg').textContent  = sd.msg;
        document.getElementById('tracking-status-sub').textContent  = sd.sub;
      }
    }

    // Atualiza bolinha se o tracking estiver fechado
    const fab = document.getElementById('order-fab');
    if (fab && !fab.classList.contains('hidden')) {
      if (typeof showFab === 'function') showFab(status);
    }

    if (['pronto', 'concluido'].includes(status)) {
      clearInterval(pollInterval);
      openTracking(orderId);
    }
  }, 5000);
}

document.getElementById('tracking-close').addEventListener('click', () => {
  clearInterval(pollInterval);
  trackingOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  // Mostra bolinha se pedido ainda ativo
  const savedId = activeOrderId || localStorage.getItem('acai_active_order');
  if (savedId) {
    const order = getOrders().find(o => o.id === savedId);
    if (order && !['concluido', 'cancelado'].includes(order.status)) showFab(order.status);
  }
});

document.getElementById('tracking-new-order').addEventListener('click', () => {
  const savedId = activeOrderId || localStorage.getItem('acai_active_order');
  const order   = savedId ? getOrders().find(o => o.id === savedId) : null;
  const emAndamento = order && !['pronto', 'concluido', 'cancelado'].includes(order.status);

  if (emAndamento) {
    showNewOrderWarning(order);
    return;
  }

  // Pedido já concluído/pronto: pode fazer novo sem aviso
  clearInterval(pollInterval);
  localStorage.removeItem('acai_active_order');
  activeOrderId = null;
  closeAllModals();
});

document.getElementById('tracking-show-pix').addEventListener('click', () => {
  trackingOverlay.classList.add('hidden');
  pixOverlay.classList.remove('hidden');
  startPolling(activeOrderId);
});

/* ── FAB (bolinha flutuante do pedido ativo) ─────────────── */
const orderFab      = document.getElementById('order-fab');
const orderFabEmoji = document.getElementById('order-fab-emoji');
const orderFabTxt   = document.getElementById('order-fab-txt');

const FAB_STATUS = {
  aguardando_pix:    { emoji: '💳', txt: 'Aguard. PIX',  cls: '' },
  pago:              { emoji: '✅', txt: 'Confirmado',   cls: 'status-preparando' },
  preparando:        { emoji: '🍧', txt: 'Preparando…',  cls: 'status-preparando' },
  pronto:            { emoji: '🎉', txt: 'Pronto!',      cls: 'status-pronto' },
  motoboy_a_caminho: { emoji: '🛵', txt: 'A caminho!',   cls: 'status-motoboy' },
};

function showFab(status) {
  const cfg = FAB_STATUS[status];
  if (!cfg) return;
  orderFabEmoji.textContent = cfg.emoji;
  orderFabTxt.textContent   = cfg.txt;
  orderFab.classList.remove('hidden', 'status-preparando', 'status-pronto');
  if (cfg.cls) orderFab.classList.add(cfg.cls);
}

orderFab.addEventListener('click', () => {
  const id = activeOrderId || localStorage.getItem('acai_active_order');
  if (!id) return;
  orderFab.classList.add('hidden');
  openTracking(id);
  startPolling(id);
});

/* ── Eventos dos modais ───────────────────────────────────── */
function closeAllModals() {
  [orderOverlay, deliveryOverlay, pixOverlay, trackingOverlay].forEach(el => el.classList.add('hidden'));
  clearInterval(pixTimerInterval);
  clearInterval(pollInterval);
  document.body.style.overflow = '';

  // Mostra bolinha se houver pedido ativo
  const savedId = activeOrderId || localStorage.getItem('acai_active_order');
  if (savedId) {
    const order = getOrders().find(o => o.id === savedId);
    if (order && !['concluido', 'cancelado'].includes(order.status)) {
      showFab(order.status);
    }
  }
}

orderClose.addEventListener('click', closeAllModals);
orderOverlay.addEventListener('click', e => { if (e.target === orderOverlay) closeAllModals(); });
orderConfirm.addEventListener('click', openDeliveryStep);

/* ── Botões "Montar Meu Pote" ─────────────────────────────── */
function triggerOrder() {
  if (!activeProducts.length) {
    document.getElementById('cremes')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  openOrderModal(activeProducts[currentIndex] || activeProducts[0]);
}

window.triggerOrder = triggerOrder; // exposto para onclick no HTML

document.getElementById('btn-montar-hero')?.addEventListener('click', triggerOrder);
document.getElementById('btn-montar-cta')?.addEventListener('click',  triggerOrder);

/* ── Botão "Montar Pote" nos cards do cardápio (delegation) ── */
document.getElementById('cremes-grid')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-order-id]');
  if (!btn) return;
  const p = activeProducts.find(x => x.id === btn.dataset.orderId);
  if (p) openOrderModal(p);
});

/* ── Fechar com ESC ───────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!confirmOverlay.classList.contains('hidden')) {
      confirmOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    } else if (!orderOverlay.classList.contains('hidden')) {
      closeOrderModal();
    }
  }
});

/* ── Modal de aviso "novo pedido com pedido em andamento" ─── */
function showNewOrderWarning(order) {
  const STATUS_NAMES = {
    aguardando_pix: 'aguardando pagamento PIX',
    pago:           'com pagamento confirmado',
    preparando:     'sendo preparado agora',
  };
  const statusTxt = STATUS_NAMES[order.status] || 'em andamento';

  let overlay = document.getElementById('new-order-warning-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'new-order-warning-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet warning-sheet">
        <div class="warning-icon">⚠️</div>
        <h3 class="warning-title">Pedido em andamento</h3>
        <p class="warning-body" id="warning-body-txt"></p>
        <div class="warning-actions">
          <button class="btn-warning-cancel">Voltar ao pedido</button>
          <button class="btn-warning-confirm">Fazer novo mesmo assim</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('.btn-warning-cancel').addEventListener('click', () => {
      overlay.classList.add('hidden');
    });

    overlay.querySelector('.btn-warning-confirm').addEventListener('click', () => {
      overlay.classList.add('hidden');
      clearInterval(pollInterval);
      localStorage.removeItem('acai_active_order');
      activeOrderId = null;
      closeAllModals();
    });
  }

  document.getElementById('warning-body-txt').textContent =
    `Seu pedido de "${order.product?.name || 'açaí'}" está ${statusTxt}. Se continuar, perderá o acompanhamento dele.`;

  overlay.classList.remove('hidden');
}

/* ── Utilitário de escape HTML (compartilhado) ────────────── */
function escHtml(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Auto-restore: reabre tracking se cliente recarregar página ── */
(async function restoreActiveOrder() {
  const savedId = localStorage.getItem('acai_active_order');
  if (!savedId) return;

  // Verifica status real no servidor
  try {
    const r = await fetch(`${API_BASE}/api/orders/${savedId}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) {
      // 404 = pedido não existe no servidor (ID local/mock ou já removido)
      localStorage.removeItem('acai_active_order');
      activeOrderId = null;
      return;
    }
    const serverOrder = await r.json();
    if (!serverOrder || ['concluido', 'cancelado', 'entregue'].includes(serverOrder.status)) {
      localStorage.removeItem('acai_active_order');
      activeOrderId = null;
      return;
    }
  } catch (_) {
    // Se API offline, checa localStorage como fallback
    const orders = getOrders();
    const order  = orders.find(o => o.id === savedId);
    if (!order || ['concluido', 'cancelado'].includes(order.status)) {
      localStorage.removeItem('acai_active_order');
      return;
    }
  }

  activeOrderId = savedId;
  setTimeout(() => {
    try {
      openTracking(savedId);
      startPolling(savedId);
    } catch(e) {
      console.warn('Restore tracking falhou:', e);
      localStorage.removeItem('acai_active_order');
    }
  }, 400);
})();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

async function subscribePush(userId) {
  if (!userId || !('Notification' in window) || !('serviceWorker' in navigator)) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;

    const keyRes = await fetch(`${API_BASE}/api/push/vapid-public-key`);
    const { key } = await keyRes.json();
    if (!key) return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: sub }),
    });
  } catch (e) {
    console.warn('Push subscribe falhou:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
