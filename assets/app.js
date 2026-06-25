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

async function getGeoInfo(){
  try{
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if(!res.ok) return {};
    const data = await res.json();
    return { city: data.city || null, region: data.region || null, country: data.country_name || null };
  }catch{ return {}; }
}

function getUtm(){
  const p = new URLSearchParams(location.search);
  return { utm_source: p.get('utm_source'), utm_medium: p.get('utm_medium'), utm_campaign: p.get('utm_campaign') };
}

async function trackVisit(){
  try{
    const currentSession = sessionStorage.getItem('impulso_visit_id');
    if(currentSession){ visitId = currentSession; return; }
    const geo = await getGeoInfo();
    const payload = {
      page: location.pathname,
      referrer: document.referrer || 'Acesso direto',
      language: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      user_agent: navigator.userAgent || null,
      ...getUtm(),
      ...geo
    };
    const { data, error } = await supabaseClient.from('site_visits').insert(payload).select('id').single();
    if(!error && data?.id){ visitId = data.id; sessionStorage.setItem('impulso_visit_id', data.id); }
  }catch(err){ console.warn('Analytics indisponível:', err.message); }
}

async function trackProductClick(product){
  try{
    await supabaseClient.from('product_clicks').insert({
      product_id: product.id,
      product_title: product.title,
      visit_id: visitId,
      referrer: document.referrer || 'Acesso direto',
      ...getUtm()
    });
  }catch(err){ console.warn('Clique não registrado:', err.message); }
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
