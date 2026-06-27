# EvoluaHub - versão atualizada

Atualização aplicada:

- Analytics mais confiável.
- Registro de cada acesso real ao site.
- Visitante único por navegador.
- Sessão do visitante.
- Página acessada.
- Origem do acesso: direto, Google, Instagram, Facebook, WhatsApp, Pinterest, YouTube etc.
- Dispositivo: celular, tablet ou computador.
- Navegador: Chrome, Edge, Safari, Firefox, Opera ou outro.
- Cliques em comprar com vínculo ao visitante/sessão.
- Dashboard com visitantes únicos, visualizações, visitas de hoje, últimos 7 dias e cliques.

## Passo obrigatório no Supabase

Antes de publicar ou depois de publicar, execute o arquivo:

`supabase/schema.sql`

no SQL Editor do Supabase.

Esse SQL é seguro para atualizar o banco existente porque usa:

- `create table if not exists`
- `alter table add column if not exists`
- `create index if not exists`

Ou seja, ele não apaga os produtos, categorias ou visitas antigas.

## Como publicar na Cloudflare Pages

1. Suba estes arquivos atualizados no GitHub.
2. Aguarde o deploy automático da Cloudflare Pages.
3. Abra o site em uma aba anônima ou no celular.
4. Depois entre no `/admin/` e clique em atualizar a página.
5. O dashboard deve começar a registrar as novas visitas.

## Observação importante

Visitas antigas que não foram gravadas antes da correção não podem ser recuperadas pelo site, porque elas nunca chegaram ao Supabase. A partir desta versão, os novos acessos passam a ser registrados com mais informações.
