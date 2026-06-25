# Impulso Learning - Supabase Nível 3

Projeto de vitrine/e-commerce para produtos digitais afiliados, com layout minimalista, painel administrativo e Supabase.

## Recursos

- Layout branco, minimalista e responsivo.
- Logo profissional em SVG: `assets/logo.svg`.
- Produtos separados por categorias.
- Descrição visível em cada produto.
- Botão **Comprar agora** redirecionando para o link de afiliado.
- Painel admin com login Supabase Auth.
- Cadastro, edição e remoção de categorias.
- Cadastro, edição e remoção de produtos.
- Upload e troca de imagem usando Supabase Storage.
- Dashboard com:
  - total de produtos;
  - total de categorias;
  - visitantes registrados;
  - cliques no botão comprar;
  - visitantes por cidade;
  - origem dos acessos/referrer/UTM;
  - produtos mais clicados.

## Configuração

1. Crie um projeto no Supabase.
2. Abra `supabase/schema.sql` e execute todo o SQL no **SQL Editor**.
3. Crie um usuário em **Authentication > Users** e confirme o e-mail.
4. Edite `assets/config.js`:

```js
window.SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
window.SUPABASE_ANON_KEY = 'SUA_ANON_PUBLIC_KEY';
```

5. Envie o projeto para o GitHub e faça deploy no Cloudflare Pages.

## Cloudflare Pages

Como o projeto é HTML, CSS e JavaScript puro:

- Framework preset: None / Nenhum
- Build command: vazio
- Build output directory: `/` ou vazio
- Root directory: use a pasta do projeto se o `index.html` não estiver na raiz do repositório

## Observação sobre visitantes

A cidade do visitante é estimada por IP usando uma consulta pública no navegador. Em alguns casos pode aparecer como “Não identificado”, dependendo da rede, VPN, bloqueios de privacidade ou falha do serviço externo.


## Atualização visual e conversão

- Cards dos produtos ajustados para mostrar a descrição completa, sem cortar o texto.
- Adicionados gatilhos mentais de segurança, clareza, evolução, acesso digital e compra na página oficial.
- Criada faixa de conversão antes da vitrine e chamada final para incentivar a escolha do produto.
- Grade ajustada para 3 produtos por linha no desktop, deixando mais espaço para leitura.

## Atualização visual v2.0

Esta versão foi refinada com a marca **Impulso Learning**, nova logomarca em SVG, seções adicionais de copywriting, gatilhos de confiança e cards de produto com descrição completa visível.

Principais ajustes:
- Novo nome da marca: Impulso Learning.
- Logomarca vetorial exclusiva em `assets/logo.svg`.
- Hero com copy principal: “Aprenda hoje. Evolua para sempre.”
- Seção “Por que escolher a Impulso Learning?”.
- Cards de produto com descrição completa, sem corte.
- Rodapé limpo, sem redes sociais ou contatos não utilizados.
- Layout branco, minimalista, com efeitos suaves e foco em conversão.
