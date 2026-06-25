/* ════════════════════════════════════════════════════════════
   AÇAÍ TRUFADO — Admin Panel JS
   Pedidos: API Next.js em /api/orders
   Cardápio: localStorage (offline, sem depender de backend)
════════════════════════════════════════════════════════════ */

const API_BASE = 'https://acai-trufado-api.onrender.com';
const ORDERS_KEY = 'acai_orders';
const CONFIG_KEY = 'acai_config';

const DEFAULT_PAYMENTS = [
  { key: 'pix',      name: 'PIX',               note: 'Ativo',        locked: true  },
  { key: 'dinheiro', name: 'Dinheiro / Espécie', note: 'Em breve...', locked: false },
  { key: 'cartao',   name: 'Cartão de Crédito',  note: 'Em breve...', locked: false },
];

function getOrders()      { try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch { return []; } }
function saveOrders(list) { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); }
function getConfig()      { try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch { return {}; } }
function saveConfig(cfg)  { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }

/* ── Status dos pedidos ──────────────────────────────────────── */
const STATUS_LABEL = {
  aguardando_pix:    'Aguard. PIX',
  pago:              'PIX Pago',
  preparando:        'Preparando',
  pronto:            'Pronto',
  motoboy_a_caminho: '🛵 A Caminho',
  concluido:         'Entregue',
  cancelado:         'Cancelado',
};

const STATUS_BADGE_CLASS = {
  aguardando_pix:    'badge-aguardando-pix',
  pago:              'badge-pago',
  preparando:        'badge-preparando',
  pronto:            'badge-pronto',
  motoboy_a_caminho: 'badge-motoboy',
  concluido:         'badge-concluido',
};

// Filtro ativo da lista de pedidos
let filtroAtivo = 'ativos'; // 'ativos' | 'historico'

const DELIVERY_LABEL = {
  retirada: '🏠 Retirada',
  motoboy:  '🛵 Motoboy',
};

/* ── Estado global ───────────────────────────────────────────── */
let pin          = '';
let pollInterval = null;
let openGpsId    = null;

/* ── Elementos de tela ───────────────────────────────────────── */
const screenLogin    = document.getElementById('screen-login');
const screenMain     = document.getElementById('screen-main');
const _pinInputLegacy = document.getElementById('pin-input');
const pinError       = document.getElementById('pin-error');
const btnLogin       = document.getElementById('btn-login');
const btnRefresh     = document.getElementById('btn-refresh');
const btnLogout      = document.getElementById('btn-logout');
const fabRefresh     = document.getElementById('fab-refresh');
const ordersList     = document.getElementById('orders-list');
const emptyMsg       = document.getElementById('empty-msg');
const toastEl        = document.getElementById('toast');
const tplOrder       = document.getElementById('tpl-order');
const panelOrders    = ordersList;
const panelMenu      = document.getElementById('menu-list');
const panelConfig    = document.getElementById('config-panel');
const adminTitle     = document.getElementById('admin-title');

// Sidebar
const sidebar          = document.getElementById('sidebar');
const sidebarOverlay   = document.getElementById('sidebar-overlay');
const btnSidebarOpen   = document.getElementById('btn-sidebar-open');
const btnSidebarClose  = document.getElementById('btn-sidebar-close');
const snavOrders       = document.getElementById('snav-orders');
const snavMenu         = document.getElementById('snav-menu');
const snavConfig       = document.getElementById('snav-config');

/* ════════════════════════════════════════════════════════════
   LOGIN — e-mail + senha via /api/auth
════════════════════════════════════════════════════════════ */
const emailInput = document.getElementById('login-email');
const passInput  = document.getElementById('login-password');
const pinInput   = passInput; // alias para compatibilidade com código que usa pinInput

// Restaura sessão salva — mas VALIDA o token antes de confiar nele
const savedSession = sessionStorage.getItem('acai_admin_session');
if (savedSession) {
  pin = savedSession;
  // Testa a sessão: se o servidor recusar (401), a sessão é velha → volta pro login
  fetch(`${API_BASE}/api/orders`, { headers: { 'x-admin-token': savedSession } })
    .then(r => {
      if (r.status === 401) {
        sessionStorage.removeItem('acai_admin_session');
        pin = '';
        showLogin();
      } else {
        showMain();
      }
    })
    .catch(() => showMain()); // servidor offline — confia na sessão por ora
} else {
  showLogin();
}

// Toggle mostrar/ocultar senha
document.getElementById('btn-toggle-pass')?.addEventListener('click', () => {
  const isPass = passInput.type === 'password';
  passInput.type = isPass ? 'text' : 'password';
  document.getElementById('eye-icon').innerHTML = isPass
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

btnLogin.addEventListener('click', doLogin);
[emailInput, passInput].forEach(el => el?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));

async function doLogin() {
  const email    = emailInput?.value.trim().toLowerCase();
  const password = passInput?.value;

  if (!email || !password) {
    pinError.textContent = 'Preencha e-mail e senha.';
    pinError.classList.remove('hidden');
    return;
  }

  btnLogin.textContent = 'Entrando…';
  btnLogin.disabled    = true;
  pinError.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const { token } = await res.json();
      pin = token;
      sessionStorage.setItem('acai_admin_session', token);
      showMain();
    } else {
      pinError.textContent = 'E-mail ou senha incorretos.';
      pinError.classList.remove('hidden');
      passInput.value = '';
      passInput.focus();
    }
  } catch {
    // Backend offline: modo local (só em desenvolvimento)
    pinError.textContent = 'Sem conexão com o servidor.';
    pinError.classList.remove('hidden');
  } finally {
    btnLogin.textContent = 'Entrar →';
    btnLogin.disabled    = false;
  }
}

function showMain() {
  screenLogin.classList.remove('active');
  screenMain.classList.add('active');
  switchTab('orders');
  updateResumoHoje();
  initLojaControl();
}

function showLogin() {
  stopPolling();
  screenMain.classList.remove('active');
  screenLogin.classList.add('active');
  if (passInput) passInput.value = '';
}

/* ════════════════════════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════════════════════════ */
function openSidebar() {
  sidebar.classList.remove('sidebar-closed');
  sidebar.classList.add('sidebar-open');
  sidebarOverlay.classList.remove('hidden');
  updateResumoHoje();
}

function closeSidebar() {
  sidebar.classList.remove('sidebar-open');
  sidebar.classList.add('sidebar-closed');
  sidebarOverlay.classList.add('hidden');
}

btnSidebarOpen.addEventListener('click', openSidebar);
btnSidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

snavOrders.addEventListener('click', () => { switchTab('orders'); closeSidebar(); });
snavMenu.addEventListener('click',   () => { switchTab('menu');   closeSidebar(); });
snavConfig.addEventListener('click', () => { switchTab('config'); closeSidebar(); });

/* ════════════════════════════════════════════════════════════
   RESUMO HOJE
════════════════════════════════════════════════════════════ */
function updateResumoHoje() {
  const hoje = new Date().toDateString();
  const orders = getOrders().filter(o => new Date(o.createdAt).toDateString() === hoje);
  const fat = orders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById('resumo-pedidos').textContent = orders.length;
  document.getElementById('resumo-fat').textContent = 'R$ ' + fat.toFixed(2).replace('.', ',');
}

document.getElementById('btn-relatorio').addEventListener('click', () => {
  const hoje = new Date().toDateString();
  const orders = getOrders().filter(o => new Date(o.createdAt).toDateString() === hoje);
  const fat = orders.reduce((s, o) => s + (o.total || 0), 0);
  const por_status = {};
  orders.forEach(o => { por_status[o.status] = (por_status[o.status] || 0) + 1; });

  const statusLabel = { aguardando_pix: 'Aguard. PIX', preparando: 'Preparando', pronto: 'Pronto', concluido: 'Concluído', cancelado: 'Cancelado' };
  let rows = '';
  Object.entries(por_status).forEach(([s, n]) => {
    rows += `<div class="rel-row"><span>${statusLabel[s] || s}</span><strong>${n} pedido${n>1?'s':''}</strong></div>`;
  });
  if (!orders.length) rows = '<div class="rel-row" style="justify-content:center;opacity:.5">Sem pedidos hoje</div>';
  document.getElementById('relatorio-content').innerHTML = `
    ${rows}
    <div class="rel-total">Total do dia: R$ ${fat.toFixed(2).replace('.', ',')}</div>`;

  document.getElementById('modal-relatorio').classList.remove('hidden');
  closeSidebar();
});

document.getElementById('btn-close-relatorio').addEventListener('click', () => {
  document.getElementById('modal-relatorio').classList.add('hidden');
});

/* ════════════════════════════════════════════════════════════
   CONTROLE DA LOJA
════════════════════════════════════════════════════════════ */
const LOJA_KEY = 'acai_loja_config';

function getLojaConfig() {
  try { return JSON.parse(localStorage.getItem(LOJA_KEY)) || { modo: 'fechado', dias: [], horaIni: '14:00', horaFim: '22:00' }; }
  catch { return { modo: 'fechado', dias: [], horaIni: '14:00', horaFim: '22:00' }; }
}

function salvarLojaConfig(cfg) { localStorage.setItem(LOJA_KEY, JSON.stringify(cfg)); }

function initLojaControl() {
  const cfg = getLojaConfig();
  setLojaModo(cfg.modo, false);

  // Dias
  document.querySelectorAll('.loja-dia-btn').forEach(btn => {
    const dia = +btn.dataset.dia;
    if (cfg.dias.includes(dia)) btn.classList.add('dia-ativo');
    btn.addEventListener('click', () => btn.classList.toggle('dia-ativo'));
  });

  // Horários
  document.getElementById('loja-hora-ini').value = cfg.horaIni || '14:00';
  document.getElementById('loja-hora-fim').value = cfg.horaFim || '22:00';

  // Botões de modo
  document.getElementById('loja-btn-auto').addEventListener('click',    () => setLojaModo('auto'));
  document.getElementById('loja-btn-aberto').addEventListener('click',  () => setLojaModo('aberto'));
  document.getElementById('loja-btn-fechado').addEventListener('click', () => setLojaModo('fechado'));

  // Salvar
  document.getElementById('btn-salvar-loja').addEventListener('click', () => {
    const modo = document.querySelector('.loja-btn[class*="loja-active"]')?.id?.replace('loja-btn-', '') || 'fechado';
    const dias = [...document.querySelectorAll('.loja-dia-btn.dia-ativo')].map(b => +b.dataset.dia);
    const horaIni = document.getElementById('loja-hora-ini').value;
    const horaFim = document.getElementById('loja-hora-fim').value;
    salvarLojaConfig({ modo, dias, horaIni, horaFim });
    atualizarStatusBadge(modo);
    showToast('✅ Configuração salva!');
  });

  atualizarStatusBadge(cfg.modo);
}

function setLojaModo(modo, comCss = true) {
  ['auto', 'aberto', 'fechado'].forEach(m => {
    document.getElementById(`loja-btn-${m}`)?.classList.remove(`loja-active-${m}`);
  });
  document.getElementById(`loja-btn-${modo}`)?.classList.add(`loja-active-${modo}`);
  const autoPanel = document.getElementById('loja-auto-panel');
  if (autoPanel) autoPanel.classList.toggle('hidden', modo !== 'auto');
  if (comCss) atualizarStatusBadge(modo);
}

function atualizarStatusBadge(modo) {
  const dot = document.getElementById('loja-status-dot');
  const txt = document.getElementById('loja-status-txt');
  if (!dot || !txt) return;

  if (modo === 'aberto') {
    dot.className = 'loja-status-dot dot-aberto';
    txt.textContent = 'Loja aberta';
  } else if (modo === 'auto') {
    const cfg = getLojaConfig();
    const agora = new Date();
    const diaAtual = agora.getDay();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    const [hIni, mIni] = (cfg.horaIni || '14:00').split(':').map(Number);
    const [hFim, mFim] = (cfg.horaFim || '22:00').split(':').map(Number);
    const aberta = cfg.dias.includes(diaAtual) && horaAtual >= hIni*60+mIni && horaAtual < hFim*60+mFim;
    dot.className = `loja-status-dot ${aberta ? 'dot-aberto' : 'dot-fechado'}`;
    txt.textContent = aberta ? 'Aberta agora (Auto)' : 'Fechada agora (Auto)';
  } else {
    dot.className = 'loja-status-dot dot-fechado';
    txt.textContent = 'Loja fechada';
  }
}

/* ════════════════════════════════════════════════════════════
   LOGOUT
════════════════════════════════════════════════════════════ */
btnLogout.addEventListener('click', () => {
  if (!confirm('Sair do painel?')) return;
  stopPolling();
  sessionStorage.removeItem('acai_admin_session');
  pin = '';
  screenMain.classList.remove('active');
  screenLogin.classList.add('active');
  pinInput.value = '';
});

/* ════════════════════════════════════════════════════════════
   NAVEGAÇÃO — sidebar nav items
════════════════════════════════════════════════════════════ */
function switchTab(tab) {
  [snavOrders, snavMenu, snavConfig].forEach(b => b?.classList.remove('active'));
  [panelOrders, panelMenu, panelConfig].forEach(p => {
    p.classList.remove('panel-active');
    p.classList.add('hidden');
  });
  fabRefresh.style.display = 'none';

  if (tab === 'orders') {
    snavOrders?.classList.add('active');
    panelOrders.classList.remove('hidden');
    panelOrders.classList.add('panel-active');
    adminTitle.textContent = 'Pedidos';
    fabRefresh.style.display = '';
    loadOrders();
    startPolling();
  } else if (tab === 'menu') {
    snavMenu?.classList.add('active');
    panelMenu.classList.remove('hidden');
    panelMenu.classList.add('panel-active');
    adminTitle.textContent = 'Cardápio';
    stopPolling();
    renderProducts();
    loadProductsFromAPI();
  } else {
    snavConfig?.classList.add('active');
    panelConfig.classList.remove('hidden');
    panelConfig.classList.add('panel-active');
    adminTitle.textContent = 'Configurações';
    stopPolling();
    renderConfig();
  }
}

/* ════════════════════════════════════════════════════════════
   POLLING — atualiza pedidos a cada 5 s
════════════════════════════════════════════════════════════ */
function startPolling() {
  stopPolling();
  pollInterval = setInterval(loadOrders, 5000);
}
function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

btnRefresh.addEventListener('click', loadOrders);
fabRefresh.addEventListener('click', loadOrders);

/* ════════════════════════════════════════════════════════════
   PEDIDOS — carregar do localStorage + fallback API
════════════════════════════════════════════════════════════ */
// Converte um pedido vindo do servidor (Supabase) para o formato dos cards
function mapServerOrder(o) {
  return {
    id:             o.id,
    createdAt:      o.created_at,
    product:        { name: o.product_name },
    summary:        o.summary || [],
    deliveryMethod: o.delivery_method,
    customerName:   o.customer_name,
    customerPhone:  o.customer_phone,
    total:          o.total,
    status:         o.status,
    pixCode:        o.pix_code,
  };
}

async function loadOrders() {
  // Tenta o servidor primeiro — é a fonte de verdade (pedidos dos clientes)
  let serverOrders = null;
  try {
    const res = await apiFetch('GET', '/api/orders');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) serverOrders = data.map(mapServerOrder);
    }
  } catch { /* offline ou 401 — apiFetch já trata o 401 (mostra login) */ }

  if (serverOrders) {
    // O endpoint /api/orders já retorna só os ativos (sem concluído/cancelado).
    // Para o histórico, usamos o localStorage como complemento.
    if (filtroAtivo === 'historico') {
      const todos = getOrders();
      renderOrders(todos.filter(o => ['concluido','cancelado'].includes(o.status)));
    } else {
      renderOrders(serverOrders);
    }
    return;
  }

  // Fallback: servidor não respondeu — usa localStorage
  const todos = getOrders();
  const localOrders = filtroAtivo === 'historico'
    ? todos.filter(o => ['concluido','cancelado'].includes(o.status))
    : todos.filter(o => !['concluido','cancelado'].includes(o.status));
  renderOrders(localOrders);
}

function renderOrders(orders) {
  Array.from(ordersList.querySelectorAll('.order-card, .orders-filter-bar')).forEach(c => c.remove());

  // Barra de filtro
  const filterBar = document.createElement('div');
  filterBar.className = 'orders-filter-bar';
  filterBar.innerHTML = `
    <button class="filter-btn ${filtroAtivo === 'ativos' ? 'filter-active' : ''}" data-filtro="ativos">📦 Ativos</button>
    <button class="filter-btn ${filtroAtivo === 'historico' ? 'filter-active' : ''}" data-filtro="historico">📋 Histórico</button>
  `;
  filterBar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroAtivo = btn.dataset.filtro;
      loadOrders();
    });
  });
  ordersList.insertBefore(filterBar, emptyMsg);

  if (orders.length === 0) {
    emptyMsg.classList.remove('hidden');
    emptyMsg.querySelector('p').textContent = filtroAtivo === 'historico'
      ? 'Nenhum pedido entregue ainda hoje.'
      : 'Nenhum pedido ativo no momento.';
    return;
  }
  emptyMsg.classList.add('hidden');

  // Ordena
  orders.sort((a, b) => {
    if (filtroAtivo === 'historico') return new Date(b.createdAt) - new Date(a.createdAt);
    const priority = { aguardando_pix: 0, pago: 1, preparando: 2, pronto: 3, motoboy_a_caminho: 4 };
    return (priority[a.status] ?? 9) - (priority[b.status] ?? 9) || new Date(b.createdAt) - new Date(a.createdAt);
  });

  orders.forEach(order => ordersList.appendChild(buildCard(order)));
}

function buildCard(order) {
  const frag = tplOrder.content.cloneNode(true);
  const card = frag.querySelector('.order-card');

  card.dataset.id     = order.id;
  card.dataset.status = order.status;

  // Tarja colorida de status
  const tarja = { aguardando_pix: '#f59e0b', pago: '#10b981', preparando: '#8b5cf6', pronto: '#e91e8c', motoboy_a_caminho: '#3b82f6', concluido: '#10b981', cancelado: '#555' };
  card.style.setProperty('--tarja', tarja[order.status] || '#555');
  card.style.borderTop = `3px solid ${tarja[order.status] || '#555'}`;

  // Cabeçalho
  card.querySelector('.order-id').textContent       = '#' + order.id.slice(-6).toUpperCase();
  card.querySelector('.order-customer').textContent = order.customerName || '—';
  card.querySelector('.order-time').textContent     = formatTime(order.createdAt);

  const badge = card.querySelector('.order-badge');
  badge.textContent  = STATUS_LABEL[order.status] || order.status;
  badge.className    = 'order-badge ' + (STATUS_BADGE_CLASS[order.status] || '');

  // Produto + entrega
  card.querySelector('.order-product-name').textContent    = order.product?.name || '—';
  card.querySelector('.order-delivery-badge').textContent  = DELIVERY_LABEL[order.deliveryMethod] || order.deliveryMethod || '—';

  // Seleções
  const selList = card.querySelector('.order-sel-list');
  (order.summary || []).forEach(g => {
    if (!g.options?.length) return;
    const line = document.createElement('div');
    line.className = 'order-sel-line';
    line.innerHTML = `<strong>${escHtml(g.groupName)}:</strong> ${g.options.map(o => (o.qty > 1 ? o.qty + '× ' : '') + o.name).join(', ')}`;
    selList.appendChild(line);
  });

  // Total
  card.querySelector('.order-total').textContent = `R$ ${Number(order.total).toFixed(2).replace('.', ',')}`;

  // Botões de ação baseados no status
  const btnPix   = card.querySelector('.btn-confirm-pix');
  const btnReady = card.querySelector('.btn-mark-ready');
  const btnConc  = card.querySelector('.btn-conclude');
  const btnCanc  = card.querySelector('.btn-cancel');

  if (order.status === 'aguardando_pix') {
    btnPix.classList.remove('hidden');
    btnPix.addEventListener('click', () => changeOrderStatus(order.id, 'preparando'));
  }
  if (order.status === 'preparando') {
    btnReady.classList.remove('hidden');
    btnReady.textContent = order.deliveryMethod === 'motoboy' ? '🎉 Pronto p/ Motoboy' : '🎉 Pronto p/ Retirar';
    btnReady.addEventListener('click', () => changeOrderStatus(order.id, 'pronto'));
  }
  if (order.status === 'pronto' && order.deliveryMethod === 'motoboy') {
    // Motoboy: próximo passo é "motoboy saiu"
    btnReady.classList.remove('hidden');
    btnReady.textContent = '🛵 Motoboy Saiu!';
    btnReady.style.background = '#3b82f6';
    btnReady.addEventListener('click', () => {
      if (confirm('Confirmar que o motoboy saiu com o pedido?')) changeOrderStatus(order.id, 'motoboy_a_caminho');
    });
  } else if (order.status === 'pronto' && order.deliveryMethod !== 'motoboy') {
    // Retirada: conclui direto
    btnConc.classList.remove('hidden');
    btnConc.textContent = '✓ Cliente Retirou';
    btnConc.addEventListener('click', () => changeOrderStatus(order.id, 'concluido'));
  }
  if (order.status === 'motoboy_a_caminho') {
    btnConc.classList.remove('hidden');
    btnConc.textContent = '✓ Entregue';
    btnConc.addEventListener('click', () => changeOrderStatus(order.id, 'concluido'));
  }
  if (['concluido','cancelado'].includes(order.status)) {
    btnCanc.remove();
  } else {
    btnCanc.addEventListener('click', () => {
      if (confirm('Recusar/cancelar este pedido?')) changeOrderStatus(order.id, 'cancelado');
    });
  }

  // Botão WhatsApp — aparece em preparando e pronto
  const waRow  = card.querySelector('.order-whatsapp-row');
  const waBtn  = card.querySelector('.btn-whatsapp-notify');
  const waTxt  = card.querySelector('.btn-wa-txt');

  if (order.status === 'preparando') {
    waRow.classList.remove('hidden');
    waTxt.textContent = 'Avisar: PIX confirmado';
    waBtn.addEventListener('click', () => abrirWhatsApp(order, 'pix_confirmado'));
  } else if (order.status === 'pronto') {
    waRow.classList.remove('hidden');
    waTxt.textContent = order.deliveryMethod === 'motoboy' ? 'Avisar: pode solicitar motoboy' : 'Avisar: pode vir retirar';
    waBtn.addEventListener('click', () => abrirWhatsApp(order, 'pronto'));
  }

  return frag;
}

/* ════════════════════════════════════════════════════════════
   WHATSAPP — monta mensagem e abre wa.me
════════════════════════════════════════════════════════════ */
const SITE_URL = 'https://acai-trufado-eduarda.vercel.app';

function abrirWhatsApp(order, tipo) {
  const phone = (order.customerPhone || '').replace(/\D/g, '');
  if (!phone) { showToast('⚠ Número do cliente não informado'); return; }

  const nome    = order.customerName?.split(' ')[0] || 'cliente';
  const idCurto = '#' + order.id.slice(-6).toUpperCase();
  const produto  = order.product?.name || 'Açaí Trufado';

  // Monta lista de seleções
  let itens = '';
  (order.summary || []).forEach(g => {
    if (g.options?.length) {
      itens += `${g.groupName}: ${g.options.map(o => o.name).join(', ')}\n`;
    }
  });
  const total = `R$ ${Number(order.total).toFixed(2).replace('.', ',')}`;

  let msg = '';

  if (tipo === 'pix_confirmado') {
    msg = `✅ *Olá ${nome}, seu pagamento foi confirmado!*\n\n` +
          `Pedido: *${idCurto}*\n` +
          `---------------------------------------\n` +
          `🍧 *${produto}*\n` +
          (itens ? itens : '') +
          `---------------------------------------\n` +
          `💰 Total: *${total}*\n\n` +
          `Já estamos preparando seu açaí com carinho! 🍫\n\n` +
          `📍 Acompanhe em tempo real:\n${SITE_URL}`;
  } else if (tipo === 'pronto') {
    const retiradaOuMotoboy = order.deliveryMethod === 'motoboy'
      ? `🛵 Pode solicitar o motoboy agora!\n📍 Nosso endereço: Tv. Lauro Bezerra, 144 - Potengi, Natal - RN`
      : `🏠 Pode vir buscar agora!\n📍 Tv. Lauro Bezerra, 144 - Potengi, Natal - RN`;

    msg = `🎉 *Olá ${nome}, seu pedido está pronto!*\n\n` +
          `Pedido: *${idCurto}*\n` +
          `---------------------------------------\n` +
          `🍧 *${produto}*\n` +
          (itens ? itens : '') +
          `---------------------------------------\n` +
          `💰 Total: *${total}*\n\n` +
          `${retiradaOuMotoboy}\n\n` +
          `📱 Acompanhe em tempo real:\n${SITE_URL}`;
  }

  const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function changeOrderStatus(id, newStatus) {
  // Atualiza localStorage
  const orders = getOrders();
  const idx    = orders.findIndex(o => o.id === id);
  if (idx !== -1) {
    orders[idx].status = newStatus;
    if (newStatus === 'pago') orders[idx].paidAt = Date.now();
    saveOrders(orders);
  }

  // Tenta atualizar backend também
  apiFetch('PATCH', `/api/orders/${id}/status`, { status: newStatus }).catch(() => {});

  showToast(`✓ ${STATUS_LABEL[newStatus] || newStatus}`);
  loadOrders();
}

async function updateStatus(id, status, extra = {}) {
  changeOrderStatus(id, status);
}

/* ════════════════════════════════════════════════════════════
   CARDÁPIO — localStorage
   Estrutura: { id, name, desc, imageBase64, active, groups[] }
   Cada grupo: { id, name, required, min, max, options[{name,price}] }
════════════════════════════════════════════════════════════ */
const PRODUCTS_KEY = 'acai_products';
let editingId = null;
let groups    = [];

function getProducts() {
  try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || []; }
  catch { return []; }
}

function saveProducts(list) {
  // Salva no servidor (fonte de verdade)
  fetch(`${API_BASE}/api/products`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': pin },
    body: JSON.stringify(list),
  }).catch(() => {/* ignora falha de rede */});

  // Cache local sem imagens (evita QuotaExceededError com base64 grandes)
  try {
    const semImagem = list.map(p => ({ ...p, imageBase64: null }));
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(semImagem));
  } catch { localStorage.removeItem(PRODUCTS_KEY); }
}

async function loadProductsFromAPI() {
  try {
    // Busca todos os produtos (ativos e pausados) via GET com token
    const res = await fetch(`${API_BASE}/api/products`, {
      headers: { 'x-admin-token': pin },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.length > 0) {
      // Converte formato API → formato local
      const local = data.map(p => ({
        id:          p.id,
        name:        p.name,
        desc:        p.description,
        imageBase64: p.image_base64,
        active:      p.active,
        groups:      p.groups || [],
      }));
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(local));
      renderProducts();
    }
  } catch { /* ignora */ }
}

/* ── Renderiza grid ──────────────────────────────────────────── */
function renderProducts() {
  const grid     = document.getElementById('products-grid');
  const products = getProducts();
  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="min-height:28vh">
        <span class="empty-icon">🍧</span>
        <p>Nenhum sabor cadastrado ainda</p>
        <button id="btn-seed-products" style="margin-top:1rem;padding:.7rem 1.2rem;background:var(--primary);color:#fff;border:none;border-radius:10px;font-size:.9rem;font-weight:700;cursor:pointer;">
          ✨ Carregar cardápio padrão
        </button>
      </div>`;
    document.getElementById('btn-seed-products')?.addEventListener('click', seedDefaultProducts);
    return;
  }

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = `product-card${p.active === false ? ' paused' : ''}`;

    const totalOpts = (p.groups || []).reduce((s, g) => s + (g.options?.length || 0), 0);
    const groupSummary = p.groups?.length
      ? `<div class="pc-accomp">
           ${p.groups.map(g => `<span class="accomp-chip">${escHtml(g.name)} (${g.options?.length || 0})</span>`).join('')}
         </div>`
      : '';

    card.innerHTML = `
      <div class="pc-main">
        <div class="pc-image-wrap">
          ${p.imageBase64
            ? `<img src="${p.imageBase64}" alt="${escHtml(p.name)}" class="pc-img" />`
            : `<div class="pc-img-placeholder">🍧</div>`}
          <span class="pc-badge ${p.active !== false ? 'badge-on' : 'badge-off'}">
            ${p.active !== false ? 'Ativo' : 'Pausado'}
          </span>
        </div>
        <div class="pc-body">
          <h3 class="pc-name">${escHtml(p.name)}</h3>
          ${p.desc ? `<p class="pc-desc">${escHtml(p.desc)}</p>` : ''}
          ${groupSummary}
        </div>
        <div class="pc-actions">
          <button class="pc-btn-toggle ${p.active !== false ? 'toggle-on' : 'toggle-off'}"
            title="${p.active !== false ? 'Pausar' : 'Ativar'}">
            ${p.active !== false ? '⏸' : '▶'}
          </button>
          <button class="pc-btn-edit" title="Editar">✏️</button>
        </div>
      </div>`;

    card.querySelector('.pc-btn-toggle').addEventListener('click', () => toggleProduct(p.id));
    card.querySelector('.pc-btn-edit').addEventListener('click',   () => openModal(p.id));
    grid.appendChild(card);
  });
}

/* ── Cardápio padrão da Eduarda ──────────────────────────────── */
function seedDefaultProducts() {
  const GRUPOS_BASE = [
    {
      id: uid(), name: 'Tamanho', required: true, min: 1, max: 1,
      options: [
        { id: uid(), name: '250ml — Copo',  price: 13 },
        { id: uid(), name: '350ml — Pote',  price: 15 },
        { id: uid(), name: '400ml — Copo',  price: 20 },
        { id: uid(), name: '500ml — Pote',  price: 25 },
      ],
    },
    {
      id: uid(), name: 'Creme', required: true, min: 1, max: 1,
      options: [
        { id: uid(), name: 'Açaí tradicional',    price: 0 },
        { id: uid(), name: 'Creme de ninho',      price: 0 },
        { id: uid(), name: 'Creme de ovomaltine', price: 0 },
      ],
    },
    {
      id: uid(), name: 'Recheio', required: true, min: 1, max: 1,
      options: [
        { id: uid(), name: 'Nutella',               price: 0 },
        { id: uid(), name: 'Brigadeiro de amendoim', price: 0 },
        { id: uid(), name: 'Morango',               price: 0 },
      ],
    },
    {
      id: uid(), name: 'Adicionais', required: false, min: 0, max: 7,
      options: [
        { id: uid(), name: 'Ovomaltine',             price: 0 },
        { id: uid(), name: 'Leite em pó',            price: 0 },
        { id: uid(), name: 'Chocoball',              price: 0 },
        { id: uid(), name: 'Farinha láctea',         price: 0 },
        { id: uid(), name: 'Amendoim',               price: 0 },
        { id: uid(), name: 'Paçoca',                 price: 0 },
        { id: uid(), name: 'Canudinho de chocolate', price: 0 },
      ],
    },
    {
      id: uid(), name: 'Calda', required: false, min: 0, max: 2,
      options: [
        { id: uid(), name: 'Leite condensado', price: 0 },
        { id: uid(), name: 'Calda de morango', price: 0 },
      ],
    },
  ];

  // Clona grupos com novos IDs para cada produto
  function clonaGrupos() {
    return GRUPOS_BASE.map(g => ({
      ...g,
      id: uid(),
      options: g.options.map(o => ({ ...o, id: uid() })),
    }));
  }

  const defaults = [
    {
      id:           uid(),
      name:         'Açaí Trufado com Chocolate Belga',
      desc:         'Cremes trufados artesanais · Pote na medida certa',
      imageBase64:  null,
      active:       true,
      groups:       clonaGrupos(),
    },
    {
      id:           uid(),
      name:         'Açaí Trufado Brigadeiro De Amendoim',
      desc:         'Cremes trufados artesanais · Pote na medida certa',
      imageBase64:  null,
      active:       true,
      groups:       clonaGrupos(),
    },
  ];

  saveProducts(defaults);
  renderProducts();
  showToast('✅ Cardápio padrão carregado!');
}

function toggleProduct(id) {
  const products = getProducts();
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.active = p.active === false ? true : false;
  saveProducts(products);
  renderProducts();
  showToast(p.active ? '✅ Sabor ativado' : '⏸ Sabor pausado');
}

/* ── Elementos do modal ──────────────────────────────────────── */
const modalEl        = document.getElementById('modal-product');
const btnNew         = document.getElementById('btn-new-product');
const btnCloseModal  = document.getElementById('btn-close-modal');
const btnSave        = document.getElementById('btn-save-product');
const btnDelete      = document.getElementById('btn-delete-product');
const inputName      = document.getElementById('prod-name');
const inputDesc      = document.getElementById('prod-desc');
const inputFile      = document.getElementById('prod-image');
const inputActive    = document.getElementById('prod-active');
const imgPicker      = document.getElementById('img-picker');
const imgPreview     = document.getElementById('prod-preview');
const imgPlaceholder = document.getElementById('img-placeholder');
const groupsContainer = document.getElementById('groups-container');
const btnAddGroup    = document.getElementById('btn-add-group');

btnNew.addEventListener('click',        () => openModal(null));
btnCloseModal.addEventListener('click', closeModal);
modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });

imgPicker.addEventListener('click', () => inputFile.click());
imgPicker.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') inputFile.click(); });

inputFile.addEventListener('change', () => {
  const file = inputFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    imgPreview.src = ev.target.result;
    imgPreview.classList.remove('hidden');
    imgPlaceholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);
});

/* ── Grupos de acompanhamentos ───────────────────────────────── */
btnAddGroup.addEventListener('click', () => {
  groups.push({
    id:       Date.now().toString(),
    name:     '',
    required: false,
    min:      0,
    max:      5,
    options:  [{ id: uid(), name: '', price: 0 }],
  });
  renderGroups();
  // scroll até o novo grupo
  const cards = groupsContainer.querySelectorAll('.accomp-group');
  cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

function renderGroups() {
  if (groups.length === 0) {
    groupsContainer.innerHTML = `<p class="groups-empty">Nenhum grupo ainda.<br>Clique em "+ Criar grupo" para começar.</p>`;
    return;
  }

  groupsContainer.innerHTML = '';

  groups.forEach((group, gi) => {
    const div = document.createElement('div');
    div.className = 'accomp-group';

    div.innerHTML = `
      <div class="group-top">
        <input type="text" class="group-name" placeholder="Nome do grupo (ex: Acompanhamentos)"
          value="${escHtml(group.name)}" />
        <button type="button" class="btn-remove-group" title="Remover grupo">×</button>
      </div>

      <div class="group-settings">
        <select class="group-type field-input">
          <option value="optional" ${!group.required ? 'selected' : ''}>📝 Opcional</option>
          <option value="required" ${group.required  ? 'selected' : ''}>⚠️ Obrigatório</option>
        </select>
        <div class="group-minmax">
          <div class="group-minmax-wrap">
            <input type="number" class="group-min field-input" value="${group.min}" min="0" />
            <span class="group-min-label">mín</span>
          </div>
          <div class="group-minmax-wrap">
            <input type="number" class="group-max field-input" value="${group.max}" min="1" />
            <span class="group-max-label">máx</span>
          </div>
        </div>
      </div>

      <div class="group-options-list">
        ${group.options.map((opt, oi) => `
          <div class="group-option">
            <input type="text"   class="option-name  field-input" data-oi="${oi}" value="${escHtml(opt.name)}" placeholder="Nome do item" />
            <input type="number" class="option-price field-input" data-oi="${oi}" value="${opt.price}" min="0" step="0.50" placeholder="R$" />
            <button type="button" class="btn-remove-option" data-oi="${oi}">×</button>
          </div>`).join('')}
      </div>
      <button type="button" class="btn-add-option">+ opção</button>`;

    /* ── listeners do grupo ── */
    div.querySelector('.group-name').addEventListener('input', e => {
      groups[gi].name = e.target.value;
    });
    div.querySelector('.group-type').addEventListener('change', e => {
      groups[gi].required = e.target.value === 'required';
    });
    div.querySelector('.group-min').addEventListener('input', e => {
      groups[gi].min = parseInt(e.target.value) || 0;
    });
    div.querySelector('.group-max').addEventListener('input', e => {
      groups[gi].max = parseInt(e.target.value) || 1;
    });
    div.querySelector('.btn-remove-group').addEventListener('click', () => {
      if (groups[gi].options.some(o => o.name) && !confirm('Remover este grupo?')) return;
      groups.splice(gi, 1);
      renderGroups();
    });
    div.querySelector('.btn-add-option').addEventListener('click', () => {
      groups[gi].options.push({ id: uid(), name: '', price: 0 });
      renderGroups();
      // foca no novo input
      const opts = groupsContainer.querySelectorAll('.accomp-group')[gi]
        ?.querySelectorAll('.option-name');
      opts?.[opts.length - 1]?.focus();
    });

    /* ── listeners das opções ── */
    div.querySelectorAll('.option-name').forEach(inp => {
      inp.addEventListener('input', e => {
        groups[gi].options[+e.target.dataset.oi].name = e.target.value;
      });
      // Enter → próxima opção ou adiciona nova
      inp.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const oi = +inp.dataset.oi;
        if (oi < groups[gi].options.length - 1) {
          div.querySelectorAll('.option-name')[oi + 1]?.focus();
        } else {
          groups[gi].options.push({ id: uid(), name: '', price: 0 });
          renderGroups();
          const opts = groupsContainer.querySelectorAll('.accomp-group')[gi]
            ?.querySelectorAll('.option-name');
          opts?.[opts.length - 1]?.focus();
        }
      });
    });
    div.querySelectorAll('.option-price').forEach(inp => {
      inp.addEventListener('input', e => {
        groups[gi].options[+e.target.dataset.oi].price = parseFloat(e.target.value) || 0;
      });
    });
    div.querySelectorAll('.btn-remove-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const oi = +btn.dataset.oi;
        if (groups[gi].options.length === 1) { showToast('Mínimo 1 opção por grupo'); return; }
        groups[gi].options.splice(oi, 1);
        renderGroups();
      });
    });

    groupsContainer.appendChild(div);
  });
}

/* ── Abrir / fechar modal ────────────────────────────────────── */
function openModal(id) {
  editingId = id;
  groups    = [];

  const modalTitle = document.getElementById('modal-title');

  if (id) {
    const p = getProducts().find(x => x.id === id);
    if (!p) return;
    modalTitle.textContent = 'Editar Sabor';
    inputName.value        = p.name  || '';
    inputDesc.value        = p.desc  || '';
    inputActive.checked    = p.active !== false;
    groups = JSON.parse(JSON.stringify(p.groups || [])); // deep copy
    if (p.imageBase64) {
      imgPreview.src = p.imageBase64;
      imgPreview.classList.remove('hidden');
      imgPlaceholder.classList.add('hidden');
    } else {
      imgPreview.src = '';
      imgPreview.classList.add('hidden');
      imgPlaceholder.classList.remove('hidden');
    }
    btnDelete.classList.remove('hidden');
  } else {
    modalTitle.textContent = 'Novo Sabor';
    inputName.value        = '';
    inputDesc.value        = '';
    inputActive.checked    = true;
    inputFile.value        = '';
    imgPreview.src         = '';
    imgPreview.classList.add('hidden');
    imgPlaceholder.classList.remove('hidden');
    btnDelete.classList.add('hidden');
  }

  renderGroups();
  modalEl.classList.remove('hidden');
  setTimeout(() => inputName.focus(), 320);
}

function closeModal() {
  modalEl.classList.add('hidden');
  editingId = null;
  groups    = [];
}

/* ── Salvar ──────────────────────────────────────────────────── */
btnSave.addEventListener('click', () => {
  const name = inputName.value.trim();
  if (!name) { showToast('⚠ Informe o nome do sabor'); inputName.focus(); return; }

  const products   = getProducts();
  const currentImg = imgPreview.src && !imgPreview.classList.contains('hidden')
    ? imgPreview.src : null;

  // Limpa grupos: remove opções vazias, remove grupos sem nome
  const cleanGroups = groups
    .map(g => ({ ...g, options: g.options.filter(o => o.name.trim()) }))
    .filter(g => g.name.trim() || g.options.length);

  if (editingId) {
    const idx = products.findIndex(x => x.id === editingId);
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        name,
        desc:       inputDesc.value.trim(),
        imageBase64: currentImg ?? products[idx].imageBase64,
        active:     inputActive.checked,
        groups:     cleanGroups,
      };
    }
  } else {
    products.push({
      id:         uid(),
      name,
      desc:       inputDesc.value.trim(),
      imageBase64: currentImg,
      active:     inputActive.checked,
      groups:     cleanGroups,
    });
  }

  saveProducts(products);
  closeModal();
  renderProducts();
  showToast(editingId ? '✓ Sabor atualizado!' : '✓ Sabor adicionado!');
});

/* ── Excluir ─────────────────────────────────────────────────── */
btnDelete.addEventListener('click', () => {
  if (!editingId) return;
  if (!confirm('Excluir este sabor permanentemente?')) return;
  saveProducts(getProducts().filter(x => x.id !== editingId));
  closeModal();
  renderProducts();
  showToast('🗑 Sabor excluído');
});

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */
async function apiFetch(method, path, body = null, overridePin = null) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'x-admin-token': overridePin ?? pin,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    stopPolling();
    pin = null;
    sessionStorage.removeItem('acai_admin_session');
    showLogin();
    throw new Error('Sessão expirada');
  }
  return res;
}

function formatTime(ts) {
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

/* ════════════════════════════════════════════════════════════
   CONFIG — Formas de pagamento + Chave PIX
════════════════════════════════════════════════════════════ */

function renderConfig() {
  const cfg  = getConfig();
  const list = document.getElementById('config-payment-list');
  if (!list) return;
  list.innerHTML = '';

  DEFAULT_PAYMENTS.forEach(pm => {
    const enabled = pm.locked ? true : !!(cfg.payments?.[pm.key]);
    const row = document.createElement('div');
    row.className = 'config-payment-row' + (pm.locked || !enabled ? ' disabled' : '');
    row.innerHTML = `
      <div class="config-payment-info">
        <div class="config-payment-name">${pm.name}</div>
        <div class="config-payment-note${!pm.locked ? ' coming-soon' : ''}">${pm.note}</div>
      </div>
      <div class="toggle-wrap">
        <input type="checkbox" class="toggle-input" id="tog-${pm.key}" ${enabled ? 'checked' : ''} ${pm.locked ? 'disabled' : ''} />
        <label class="toggle-track" for="tog-${pm.key}"><span class="toggle-thumb"></span></label>
      </div>`;

    if (!pm.locked) {
      row.querySelector('.toggle-input').addEventListener('change', e => {
        const c = getConfig();
        if (!c.payments) c.payments = {};
        c.payments[pm.key] = e.target.checked;
        saveConfig(c);
        showToast(e.target.checked ? `${pm.name} ativado` : `${pm.name} desativado`);
      });
    }
    list.appendChild(row);
  });

  // Mercado Pago: configurado via variáveis de ambiente no servidor
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer = null;
function showToast(msg, duration = 3000) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), duration);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
