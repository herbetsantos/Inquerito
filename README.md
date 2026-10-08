# Inquérito ACS

Cloudflare Pages + Pages Functions + D1.

## Rodar localmente
```bash
cp .dev.vars.example .dev.vars   # defina JWT_SECRET (string longa e aleatória)
npx wrangler d1 execute inquerito-db --local --file=database/schema.sql
npx wrangler d1 execute inquerito-db --local --file=database/seeds.sql
npx wrangler pages dev web-app --d1 DB=<database_id do wrangler.toml>
```
Usuários de teste (senha `123456`): admin `11122233344`, operador `55566677788`, gestor `22233344455`, auditor `33344455566`.

## Produção
```bash
npx wrangler d1 execute inquerito-db --remote --file=database/schema.sql
npx wrangler pages secret put JWT_SECRET
```
Crie os usuários reais gerando o hash: `node scripts/hash.mjs "senha"` e inserindo em `profissionais`.
**Não use os seeds de teste em produção.**

## Segurança
- Senhas: PBKDF2-SHA256. Sessão: JWT HS256 em cookie `HttpOnly; SameSite=Strict; Secure` (8 h).
- Limite de 5 tentativas erradas / 15 min por CPF + IP.
- Dados do paciente trafegam da extensão para o app no fragmento da URL (`#`), que não vai ao servidor.
- A extensão só lê a página do e-SUS quando o usuário clica no ícone (permissão `activeTab`).
