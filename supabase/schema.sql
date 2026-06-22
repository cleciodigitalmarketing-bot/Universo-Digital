-- Execute este SQL no Supabase SQL Editor.
-- Depois crie um usuário administrador em Authentication > Users.

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

alter table public.categories enable row level security;
alter table public.products enable row level security;

-- Leitura pública para a vitrine do site.
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories" on public.categories for select using (true);

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products for select using (true);

-- Somente usuários logados no Supabase Auth podem administrar.
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

-- Dados iniciais opcionais.
insert into public.categories (name) values
('🔥 Mais vendidos'),
('❤️ Queridinhos'),
('🚀 Em alta'),
('💼 Negócios e Marketing')
on conflict do nothing;
