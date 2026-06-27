-- SQL atualizado do EvoluaHub.
-- Pode executar no Supabase SQL Editor sem apagar produtos, categorias ou visitas já registradas.
-- Ele cria o que não existir e adiciona as novas colunas do Analytics.

create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text not null,
  image_url text not null,
  affiliate_url text not null,
  badge text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  city text,
  region text,
  country text,
  language text,
  timezone text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Novas colunas para Analytics mais confiável.
alter table public.site_visits add column if not exists visitor_key text;
alter table public.site_visits add column if not exists session_id text;
alter table public.site_visits add column if not exists page_title text;
alter table public.site_visits add column if not exists origin_type text;
alter table public.site_visits add column if not exists device_type text;
alter table public.site_visits add column if not exists browser text;
alter table public.site_visits add column if not exists screen_size text;
alter table public.site_visits add column if not exists ip_provider text;

create table if not exists public.product_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_title text,
  visit_id uuid references public.site_visits(id) on delete set null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

alter table public.product_clicks add column if not exists visitor_key text;
alter table public.product_clicks add column if not exists session_id text;
alter table public.product_clicks add column if not exists page text;
alter table public.product_clicks add column if not exists origin_type text;
alter table public.product_clicks add column if not exists device_type text;
alter table public.product_clicks add column if not exists browser text;

create index if not exists idx_site_visits_created_at on public.site_visits(created_at desc);
create index if not exists idx_site_visits_visitor_key on public.site_visits(visitor_key);
create index if not exists idx_site_visits_session_id on public.site_visits(session_id);
create index if not exists idx_product_clicks_created_at on public.product_clicks(created_at desc);
create index if not exists idx_product_clicks_product_id on public.product_clicks(product_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.site_visits enable row level security;
alter table public.product_clicks enable row level security;

-- Leitura pública para a vitrine do site.
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories" on public.categories for select using (true);

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products for select using (true);

-- Administração de categorias e produtos somente com login no Supabase Auth.
drop policy if exists "Authenticated can insert categories" on public.categories;
create policy "Authenticated can insert categories" on public.categories for insert to authenticated with check (true);

drop policy if exists "Authenticated can update categories" on public.categories;
create policy "Authenticated can update categories" on public.categories for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete categories" on public.categories;
create policy "Authenticated can delete categories" on public.categories for delete to authenticated using (true);

drop policy if exists "Authenticated can insert products" on public.products;
create policy "Authenticated can insert products" on public.products for insert to authenticated with check (true);

drop policy if exists "Authenticated can update products" on public.products;
create policy "Authenticated can update products" on public.products for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete products" on public.products;
create policy "Authenticated can delete products" on public.products for delete to authenticated using (true);

-- Analytics: visitante anônimo grava acesso/clique; só usuário logado lê no painel.
drop policy if exists "Public can insert site visits" on public.site_visits;
create policy "Public can insert site visits" on public.site_visits for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated can read site visits" on public.site_visits;
create policy "Authenticated can read site visits" on public.site_visits for select to authenticated using (true);

drop policy if exists "Public can insert product clicks" on public.product_clicks;
create policy "Public can insert product clicks" on public.product_clicks for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated can read product clicks" on public.product_clicks;
create policy "Authenticated can read product clicks" on public.product_clicks for select to authenticated using (true);

-- Bucket público para imagens dos produtos.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Políticas do Storage.
drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images" on storage.objects for select using (bucket_id = 'product-images');

drop policy if exists "Authenticated can upload product images" on storage.objects;
create policy "Authenticated can upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "Authenticated can update product images" on storage.objects;
create policy "Authenticated can update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images') with check (bucket_id = 'product-images');

drop policy if exists "Authenticated can delete product images" on storage.objects;
create policy "Authenticated can delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images');

-- Categorias iniciais opcionais. Não duplica por causa do filtro where not exists.
insert into public.categories (name)
select v.name
from (values
('🔥 Mais vendidos'),
('❤️ Queridinhos'),
('🚀 Em alta'),
('💼 Negócios e Marketing'),
('🎓 Cursos Profissionais')
) as v(name)
where not exists (select 1 from public.categories c where c.name = v.name);

-- Analytics 2.0 - colunas extras para registro robusto de acessos.
alter table public.site_visits add column if not exists event_type text default 'page_view';
alter table public.site_visits add column if not exists full_url text;
alter table public.site_visits add column if not exists viewport_size text;
alter table public.site_visits add column if not exists os text;

alter table public.product_clicks add column if not exists os text;

create index if not exists idx_site_visits_event_type on public.site_visits(event_type);
create index if not exists idx_site_visits_page on public.site_visits(page);
create index if not exists idx_site_visits_origin_type on public.site_visits(origin_type);
create index if not exists idx_site_visits_device_type on public.site_visits(device_type);
