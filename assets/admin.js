const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
let categories = [];
let products = [];

function safe(text = '') { return String(text).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m])); }
function fileExt(name){ return (name.split('.').pop() || 'jpg').toLowerCase(); }

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

async function loadAll(){ await Promise.all([loadCategories(), loadProducts()]); }
async function loadCategories(){
  const { data, error } = await sb.from('categories').select('*').order('created_at', { ascending: true });
  if(error){ alert('Erro nas categorias: ' + error.message); return; }
  categories = data || []; renderCategories(); renderCategorySelect();
}
async function loadProducts(){
  const { data, error } = await sb.from('products').select('*, categories(name)').order('created_at', { ascending: false });
  if(error){ alert('Erro nos produtos: ' + error.message); return; }
  products = data || []; renderProducts();
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
  $('productsList').innerHTML = products.map(p => `
    <div class="item">
      <img src="${safe(p.image_url || '')}" alt="">
      <div><h4>${safe(p.title)}</h4><p>${safe(p.categories?.name || 'Sem categoria')} • ${safe(p.badge || 'Sem selo')}</p></div>
      <div class="actions"><button class="ghost" onclick="editProduct('${p.id}')">Editar</button><button class="danger" onclick="deleteProduct('${p.id}')">Remover</button></div>
    </div>`).join('') || '<p class="empty">Nenhum produto cadastrado.</p>';
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
