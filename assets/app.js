const supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const productsGrid = document.getElementById('productsGrid');
const categoryFilters = document.getElementById('categoryFilters');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
let categories = [];
let products = [];
let selectedCategory = 'all';

function escapeHtml(text = '') {
  return String(text).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));
}

async function loadData() {
  const [{ data: cats, error: catError }, { data: prods, error: prodError }] = await Promise.all([
    supabaseClient.from('categories').select('*').order('created_at', { ascending: true }),
    supabaseClient.from('products').select('*, categories(name)').order('created_at', { ascending: false })
  ]);
  if (catError || prodError) {
    productsGrid.innerHTML = '<div class="empty">Erro ao carregar produtos. Verifique o arquivo assets/config.js e o SQL do Supabase.</div>';
    return;
  }
  categories = cats || [];
  products = prods || [];
  renderCategories();
  renderProducts();
}

function renderCategories() {
  const all = `<button class="chip active" data-id="all">Todos</button>`;
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
    <article class="product-card">
      <div class="image-wrap">
        ${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : ''}
        <img src="${escapeHtml(p.image_url || '')}" alt="${escapeHtml(p.title)}" loading="lazy" />
      </div>
      <div class="product-body">
        <small>${escapeHtml(p.categories?.name || 'Produto digital')}</small>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.description || '')}</p>
        <a class="buy-btn" href="${escapeHtml(p.affiliate_url)}" target="_blank" rel="noopener sponsored">Comprar agora</a>
      </div>
    </article>
  `).join('');
}

searchInput.addEventListener('input', renderProducts);
loadData();
