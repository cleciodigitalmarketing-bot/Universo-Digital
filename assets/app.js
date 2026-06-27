const supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const productsGrid = document.getElementById('productsGrid');
const categoryFilters = document.getElementById('categoryFilters');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const productModal = document.getElementById('productModal');
const modalContent = document.getElementById('modalContent');
let categories = [];
let products = [];
let selectedCategory = 'all';
let visitId = null;

function escapeHtml(text = '') {
  return String(text).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));
}

function getOrCreateStorageValue(storage, key){
  let value = storage.getItem(key);
  if(!value){
    value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    storage.setItem(key, value);
  }
  return value;
}

function getDeviceType(){
  const ua = navigator.userAgent || '';
  if(/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
  if(/mobi|android|iphone|ipod/i.test(ua)) return 'Celular';
  return 'Computador';
}

function getBrowserName(){
  const ua = navigator.userAgent || '';
  if(/Edg\//.test(ua)) return 'Edge';
  if(/OPR\//.test(ua)) return 'Opera';
  if(/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if(/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if(/Firefox\//.test(ua)) return 'Firefox';
  return 'Outro';
}

async function getGeoInfo(){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try{
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store', signal: controller.signal });
    if(!res.ok) return {};
    const data = await res.json();
    return {
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || null,
      ip_provider: 'ipapi.co'
    };
  }catch{ return {}; }
  finally{ clearTimeout(timeout); }
}

function getUtm(){
  const p = new URLSearchParams(location.search);
  return { utm_source: p.get('utm_source'), utm_medium: p.get('utm_medium'), utm_campaign: p.get('utm_campaign') };
}

function getOriginType(referrer){
  const source = (new URLSearchParams(location.search).get('utm_source') || '').toLowerCase();
  const ref = (referrer || '').toLowerCase();
  const text = `${source} ${ref}`;
  if(!referrer && !source) return 'Acesso direto';
  if(text.includes('google')) return 'Google';
  if(text.includes('instagram')) return 'Instagram';
  if(text.includes('facebook') || text.includes('fb.')) return 'Facebook';
  if(text.includes('whatsapp') || text.includes('wa.me')) return 'WhatsApp';
  if(text.includes('pinterest')) return 'Pinterest';
  if(text.includes('youtube')) return 'YouTube';
  if(source) return source;
  try { return new URL(referrer).hostname.replace('www.',''); } catch { return 'Outro'; }
}


function getOSName(){
  const ua = navigator.userAgent || '';
  if(/Windows NT/i.test(ua)) return 'Windows';
  if(/Android/i.test(ua)) return 'Android';
  if(/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if(/Mac OS X/i.test(ua)) return 'macOS';
  if(/Linux/i.test(ua)) return 'Linux';
  return 'Outro';
}

function buildVisitPayload(extra = {}){
  const visitorKey = getOrCreateStorageValue(localStorage, 'evoluahub_visitor_key');
  const sessionId = getOrCreateStorageValue(sessionStorage, 'evoluahub_session_id');
  const referrer = document.referrer || '';
  return {
    visitor_key: visitorKey,
    session_id: sessionId,
    event_type: 'page_view',
    page: location.pathname || '/',
    full_url: location.href,
    page_title: document.title || null,
    referrer: referrer || 'Acesso direto',
    origin_type: getOriginType(referrer),
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    user_agent: navigator.userAgent || null,
    device_type: getDeviceType(),
    browser: getBrowserName(),
    os: getOSName(),
    screen_size: `${screen.width}x${screen.height}`,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    ...getUtm(),
    ...extra
  };
}

async function sendSupabaseInsert(table, payload){
  // Importante: não usamos .select() aqui. Usuário anônimo pode INSERIR,
  // mas não pode LER analytics por segurança; .select() fazia o registro falhar.
  const { error } = await supabaseClient.from(table).insert(payload);
  if(error) throw error;
}

function sendRestFallback(table, payload){
  try{
    const url = `${window.SUPABASE_URL}/rest/v1/${table}`;
    const body = JSON.stringify(payload);
    const headers = {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    };
    // keepalive ajuda a não perder o registro quando a página muda/fecha.
    return fetch(url, { method: 'POST', headers, body, keepalive: true }).catch(() => null);
  }catch{ return null; }
}

async function safeInsert(table, payload){
  try{
    await sendSupabaseInsert(table, payload);
    return true;
  }catch(err){
    console.warn(`Falha pelo cliente Supabase em ${table}; tentando fallback REST:`, err.message || err);
    await sendRestFallback(table, payload);
    return false;
  }
}

async function trackVisit(){
  // Pega cidade/país somente se responder rápido; se falhar, a visita é registrada mesmo assim.
  const quickGeo = await Promise.race([
    getGeoInfo(),
    new Promise(resolve => setTimeout(() => resolve({}), 700))
  ]);
  await safeInsert('site_visits', buildVisitPayload(quickGeo || {}));
}

async function trackProductClick(product){
  try{
    const payload = {
      product_id: product.id,
      product_title: product.title,
      visit_id: visitId,
      visitor_key: localStorage.getItem('evoluahub_visitor_key'),
      session_id: sessionStorage.getItem('evoluahub_session_id'),
      page: location.pathname || '/',
      referrer: document.referrer || 'Acesso direto',
      origin_type: getOriginType(document.referrer || ''),
      device_type: getDeviceType(),
      browser: getBrowserName(),
      os: getOSName(),
      ...getUtm()
    };
    await safeInsert('product_clicks', payload);
  }catch(err){ console.warn('Clique não registrado:', err.message || err); }
}

async function loadData() {
  const [{ data: cats, error: catError }, { data: prods, error: prodError }] = await Promise.all([
    supabaseClient.from('categories').select('*').order('created_at', { ascending: true }),
    supabaseClient.from('products').select('*, categories(name)').order('created_at', { ascending: false })
  ]);
  if (catError || prodError) {
    productsGrid.innerHTML = '<div class="empty">Erro ao carregar produtos. Verifique o arquivo assets/config.js e execute o SQL atualizado no Supabase.</div>';
    return;
  }
  categories = cats || [];
  products = prods || [];
  renderCategories();
  renderProducts();
}

function renderCategories() {
  const all = `<button class="chip active" data-id="all">Todos os produtos</button>`;
  categoryFilters.innerHTML = all + categories.map(c => `<button class="chip" data-id="${c.id}">${escapeHtml(c.name)}</button>`).join('');
  categoryFilters.querySelectorAll('.chip').forEach(btn => {
    btn.onclick = () => {
      selectedCategory = btn.dataset.id;
      categoryFilters.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts();
    };
  });
}

function renderProducts() {
  const term = (searchInput.value || '').toLowerCase().trim();
  const filtered = products.filter(p => {
    const categoryOk = selectedCategory === 'all' || p.category_id === selectedCategory;
    const text = `${p.title} ${p.description || ''} ${p.categories?.name || ''}`.toLowerCase();
    return categoryOk && text.includes(term);
  });
  emptyState.classList.toggle('hidden', filtered.length > 0);
  productsGrid.innerHTML = filtered.map(p => `
    <article class="product-card full-desc">
      <div class="image-wrap">
        ${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : ''}
        <img src="${escapeHtml(p.image_url || '')}" alt="${escapeHtml(p.title)}" loading="lazy" />
      </div>
      <div class="product-body">
        <small>${escapeHtml(p.categories?.name || 'Produto digital')}</small>
        <h3>${escapeHtml(p.title)}</h3>
        <p class="product-desc ${p.description ? '' : 'empty-desc'}">${escapeHtml(p.description || 'Descrição completa será exibida aqui quando cadastrada no painel.')}</p>
        <button class="details-btn" type="button" data-details-id="${p.id}">Ver detalhes e descrição completa</button>
        <div class="trust-marker"><span>✅ Página oficial</span><span>⚡ Acesso digital</span><span>🔒 Compra segura</span></div>
        <a class="buy-btn" data-product-id="${p.id}" href="${escapeHtml(p.affiliate_url)}" target="_blank" rel="noopener sponsored">Comprar agora</a>
      </div>
    </article>
  `).join('');
  productsGrid.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = products.find(p => p.id === btn.dataset.productId);
      if(product) trackProductClick(product);
    });
  });
  productsGrid.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = products.find(p => p.id === btn.dataset.detailsId);
      if(product) openProductModal(product);
    });
  });
}

function openProductModal(p){
  modalContent.innerHTML = `
    <div class="modal-product">
      <div class="modal-image"><img src="${escapeHtml(p.image_url || '')}" alt="${escapeHtml(p.title)}"></div>
      <div class="modal-info">
        <small>${escapeHtml(p.categories?.name || 'Produto digital')}</small>
        <h2>${escapeHtml(p.title)}</h2>
        <div class="modal-trust"><span>✅ Página oficial</span><span>⚡ Acesso digital</span><span>🔒 Compra segura</span></div>
        <p class="modal-desc">${escapeHtml(p.description || 'Descrição completa será exibida aqui quando cadastrada no painel.')}</p>
        <a class="modal-buy" data-product-id="${p.id}" href="${escapeHtml(p.affiliate_url)}" target="_blank" rel="noopener sponsored">Comprar agora</a>
      </div>
    </div>
  `;
  productModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const buy = modalContent.querySelector('.modal-buy');
  buy.addEventListener('click', () => trackProductClick(p));
}

function closeProductModal(){
  productModal.classList.add('hidden');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeProductModal));
document.addEventListener('keydown', e => { if(e.key === 'Escape' && !productModal.classList.contains('hidden')) closeProductModal(); });

searchInput.addEventListener('input', renderProducts);
trackVisit();
loadData();
