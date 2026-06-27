const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
let categories = [];
let products = [];

function safe(text = '') { return String(text).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m])); }
function fileExt(name){ return (name.split('.').pop() || 'jpg').toLowerCase(); }
function originLabel(v){
  if(v.origin_type) return v.origin_type;
  if(v.utm_source) return `${v.utm_source}${v.utm_campaign ? ' / ' + v.utm_campaign : ''}`;
  if(!v.referrer || v.referrer === 'Acesso direto') return 'Acesso direto';
  try { return new URL(v.referrer).hostname.replace('www.',''); } catch { return v.referrer; }
}
function countBy(list, fn){
  const map = new Map();
  list.forEach(item => { const key = fn(item) || 'Não identificado'; map.set(key, (map.get(key) || 0) + 1); });
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
}
function uniqueCount(list, key){
  return new Set(list.map(item => item?.[key]).filter(Boolean)).size;
}
function isToday(value){
  if(!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function daysAgo(value, days){
  if(!value) return false;
  const d = new Date(value).getTime();
  return d >= Date.now() - (days * 24 * 60 * 60 * 1000);
}
function renderMetric(el, rows){
  $(el).innerHTML = rows.length ? rows.map(([label,total]) => `<div class="metric"><span>${safe(label)}</span><b>${total}</b></div>`).join('') : '<p class="empty small">Sem dados ainda.</p>';
}

async function checkSession(){
  const { data } = await sb.auth.getSession();
  if(data.session){ $('loginView').classList.add('hidden'); $('adminView').classList.remove('hidden'); await loadAll(); }
  else { $('loginView').classList.remove('hidden'); $('adminView').classList.add('hidden'); }
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('loginMsg').textContent = 'Entrando...';
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value, password: $('password').value });
  if(error){ $('loginMsg').textContent = 'Erro: ' + error.message; return; }
  $('loginMsg').textContent = ''; await checkSession();
});
$('logoutBtn').onclick = async () => { await sb.auth.signOut(); await checkSession(); };

async function loadAll(){ await Promise.all([loadCategories(), loadProducts()]); await loadAnalytics(); }
async function loadCategories(){
  const { data, error } = await sb.from('categories').select('*').order('created_at', { ascending: true });
  if(error){ alert('Erro nas categorias: ' + error.message); return; }
  categories = data || []; renderCategories(); renderCategorySelect(); $('statCategories').textContent = categories.length;
}
async function loadProducts(){
  const { data, error } = await sb.from('products').select('*, categories(name)').order('created_at', { ascending: false });
  if(error){ alert('Erro nos produtos: ' + error.message); return; }
  products = data || []; renderProducts(); $('statProducts').textContent = products.length;
}
async function loadAnalytics(){
  const [{ data: visits, error: visitsError }, { data: clicks, error: clicksError }] = await Promise.all([
    sb.from('site_visits').select('*').order('created_at', { ascending: false }).limit(5000),
    sb.from('product_clicks').select('*').order('created_at', { ascending: false }).limit(5000)
  ]);
  if(visitsError || clicksError){
    ['citiesList','referrersList','clicksList','devicesList','browsersList','osList','pagesList','recentVisitsList'].forEach(id => $(id) && renderMetric(id, []));
    $('analyticsError').textContent = `Erro ao carregar analytics: ${visitsError?.message || clicksError?.message || 'verifique as políticas RLS no Supabase.'}`;
    return;
  }
  $('analyticsError').textContent = '';
  const allVisits = visits || [], c = clicks || [];
  const v = allVisits.filter(x => !x.event_type || x.event_type === 'page_view');
  const uniqueVisitors = uniqueCount(v, 'visitor_key') || v.length;
  const uniqueSessions = uniqueCount(v, 'session_id') || v.length;
  $('statVisitors').textContent = uniqueVisitors;
  $('statPageViews').textContent = v.length;
  $('statToday').textContent = v.filter(x => isToday(x.created_at)).length;
  $('stat7Days').textContent = v.filter(x => daysAgo(x.created_at, 7)).length;
  $('statClicks').textContent = c.length;
  if($('statSessions')) $('statSessions').textContent = uniqueSessions;
  if($('statConversion')) $('statConversion').textContent = v.length ? `${Math.round((c.length / v.length) * 100)}%` : '0%';
  renderMetric('citiesList', countBy(v, x => [x.city, x.region, x.country].filter(Boolean).join(' - ')));
  renderMetric('referrersList', countBy(v, originLabel));
  renderMetric('clicksList', countBy(c, x => x.product_title));
  renderMetric('devicesList', countBy(v, x => x.device_type));
  renderMetric('browsersList', countBy(v, x => x.browser));
  if($('osList')) renderMetric('osList', countBy(v, x => x.os));
  if($('pagesList')) renderMetric('pagesList', countBy(v, x => x.page || x.full_url));
  if($('recentVisitsList')){
    $('recentVisitsList').innerHTML = v.slice(0,8).map(x => `<div class="metric"><span>${safe(new Date(x.created_at).toLocaleString('pt-BR'))}<br><small>${safe(x.page || '/')} • ${safe(x.device_type || 'Não identificado')} • ${safe(originLabel(x))}</small></span><b>${safe(x.city || x.country || '—')}</b></div>`).join('') || '<p class="empty small">Sem dados ainda.</p>';
  }
}
function renderCategorySelect(){
  $('categorySelect').innerHTML = '<option value="">Selecione</option>' + categories.map(c => `<option value="${c.id}">${safe(c.name)}</option>`).join('');
}
function renderCategories(){
  $('categoriesList').innerHTML = categories.map(c => `
    <div class="item" style="grid-template-columns:1fr auto">
      <div><h4>${safe(c.name)}</h4><p>${c.id}</p></div>
      <div class="actions"><button class="ghost" onclick="editCategory('${c.id}')">Editar</button><button class="danger" onclick="deleteCategory('${c.id}')">Remover</button></div>
    </div>`).join('') || '<p class="empty">Nenhuma categoria cadastrada.</p>';
}
window.editCategory = id => { const c = categories.find(x => x.id === id); if(!c) return; $('categoryId').value = c.id; $('categoryName').value = c.name; };
window.deleteCategory = async id => {
  if(!confirm('Remover esta categoria? Produtos vinculados podem ficar sem categoria.')) return;
  const { error } = await sb.from('categories').delete().eq('id', id);
  if(error) return alert('Erro: ' + error.message);
  await loadAll();
};
$('categoryForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('categoryId').value;
  const payload = { name: $('categoryName').value.trim() };
  const op = id ? sb.from('categories').update(payload).eq('id', id) : sb.from('categories').insert(payload);
  const { error } = await op;
  if(error) return alert('Erro: ' + error.message);
  $('categoryForm').reset(); $('categoryId').value = ''; await loadCategories();
});

async function uploadImage(file){
  const path = `produtos/${Date.now()}-${crypto.randomUUID()}.${fileExt(file.name)}`;
  const { error } = await sb.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if(error) throw error;
  const { data } = sb.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
async function removeImageByUrl(url){
  if(!url) return;
  const marker = '/storage/v1/object/public/product-images/';
  const idx = url.indexOf(marker);
  if(idx === -1) return;
  const path = decodeURIComponent(url.substring(idx + marker.length));
  await sb.storage.from('product-images').remove([path]);
}

$('productForm').addEventListener('submit', async e => {
  e.preventDefault(); $('productMsg').textContent = 'Salvando...';
  try{
    const id = $('productId').value;
    let imageUrl = $('currentImageUrl').value;
    const file = $('imageFile').files[0];
    if(!id && !file) throw new Error('Envie uma imagem para cadastrar o produto.');
    if(file){
      const oldUrl = imageUrl;
      imageUrl = await uploadImage(file);
      if(id && oldUrl) await removeImageByUrl(oldUrl);
    }
    const payload = {
      title: $('title').value.trim(),
      description: $('description').value.trim(),
      affiliate_url: $('affiliateUrl').value.trim(),
      category_id: $('categorySelect').value || null,
      image_url: imageUrl,
      badge: $('badge').value.trim() || null
    };
    const op = id ? sb.from('products').update(payload).eq('id', id) : sb.from('products').insert(payload);
    const { error } = await op;
    if(error) throw error;
    resetProductForm(); $('productMsg').textContent = 'Produto salvo com sucesso ✅'; await loadProducts();
  }catch(err){ $('productMsg').textContent = 'Erro: ' + err.message; }
});
function resetProductForm(){ $('productForm').reset(); $('productId').value=''; $('currentImageUrl').value=''; $('productFormTitle').textContent='Cadastrar produto'; }
$('cancelEditBtn').onclick = resetProductForm;

function renderProducts(){
  if(!products.length){
    $('productsList').innerHTML = '<p class="empty">Nenhum produto cadastrado.</p>';
    return;
  }

  const grouped = new Map();
  products.forEach(p => {
    const categoryName = p.categories?.name || 'Sem categoria';
    if(!grouped.has(categoryName)) grouped.set(categoryName, []);
    grouped.get(categoryName).push(p);
  });

  const sortedGroups = [...grouped.entries()].sort(([a], [b]) => {
    if(a === 'Sem categoria') return 1;
    if(b === 'Sem categoria') return -1;
    return a.localeCompare(b, 'pt-BR');
  });

  $('productsList').innerHTML = sortedGroups.map(([categoryName, items]) => `
    <div class="category-group">
      <div class="category-group-header">
        <h3>${safe(categoryName)}</h3>
        <span>${items.length} produto${items.length === 1 ? '' : 's'}</span>
      </div>
      <div class="category-product-list">
        ${items.map(p => `
          <div class="item product-admin-item">
            <img src="${safe(p.image_url || '')}" alt="${safe(p.title || 'Produto')}">
            <div>
              <h4>${safe(p.title)}</h4>
              <p>${safe(p.badge || '')}${p.badge ? ' • ' : ''}${safe(p.description || '').slice(0,160)}${(p.description || '').length > 160 ? '...' : ''}</p>
            </div>
            <div class="actions">
              <button class="ghost" onclick="editProduct('${p.id}')">Editar</button>
              <button class="danger" onclick="deleteProduct('${p.id}')">Remover</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}
window.editProduct = id => {
  const p = products.find(x => x.id === id); if(!p) return;
  $('productFormTitle').textContent = 'Editar produto';
  $('productId').value = p.id; $('currentImageUrl').value = p.image_url || '';
  $('title').value = p.title || ''; $('description').value = p.description || ''; $('affiliateUrl').value = p.affiliate_url || '';
  $('categorySelect').value = p.category_id || ''; $('badge').value = p.badge || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.deleteProduct = async id => {
  const p = products.find(x => x.id === id);
  if(!confirm('Remover este produto?')) return;
  const { error } = await sb.from('products').delete().eq('id', id);
  if(error) return alert('Erro: ' + error.message);
  if(p?.image_url) await removeImageByUrl(p.image_url);
  await loadProducts();
};
checkSession();
