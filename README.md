# Impulso Digital — Hotmart Afiliados Nível 3

Projeto completo com Cloudflare Pages + Supabase Database + Supabase Storage + Supabase Auth.

## Recursos

- Vitrine pública de produtos digitais.
- Categorias dinâmicas.
- Botão Comprar agora com link de afiliado Hotmart.
- Painel Admin protegido por login Supabase.
- Cadastro, edição e remoção de produtos.
- Upload de imagem no cadastro.
- Substituição de imagem na edição.
- Remoção da imagem antiga do Storage ao trocar/remover produto.

## Como configurar o Supabase

1. Crie um projeto no Supabase.
2. Abra SQL Editor.
3. Execute o arquivo `supabase/schema.sql`.
4. Vá em Authentication > Users.
5. Clique em Add user e crie seu e-mail e senha de administrador.
6. Vá em Project Settings > API.
7. Copie:
   - Project URL
   - anon public key
8. Abra `assets/config.js` e cole os dados.

## Deploy no Cloudflare Pages

Como é HTML, CSS e JS puro:

- Framework preset: None / Nenhum
- Build command: deixe vazio
- Build output directory: `/` ou deixe vazio
- Root directory: deixe vazio se o `index.html` estiver na raiz do repositório

## Acesso

- Site: `/`
- Painel Admin: `/admin/`

## Importante

Não coloque `service_role_key` no frontend. Use somente a `anon public key`.
