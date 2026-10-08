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


## Mailing territorial — extensão + administrador
1. No e-SUS PEC, abra **Acompanhamento do território**.
2. Clique na extensão e selecione a equipe/microáreas desejadas.
3. Use **Gerar mailing das microáreas selecionadas**.
4. No Inquérito, entre em **Administração → Mailing territorial**.
5. Clique em **Importar mailing da extensão**, revise a composição por equipe/microárea e crie a campanha.
6. O servidor grava a população da campanha no D1 e deduplica os registros pelo link/identificador externo.

A extensão mantém temporariamente o mailing no `chrome.storage.local`. A importação para o servidor ocorre somente quando o administrador solicita na tela do Inquérito.

## Extensão 2.2 — varredura completa do território
A extensão agora tenta, nesta ordem:
1. selecionar cada microárea marcada;
2. aguardar carregamento dinâmico da listagem;
3. aumentar automaticamente a quantidade de itens por página quando o controle estiver disponível;
4. percorrer paginação até a última página, evitando loops por assinatura repetida;
5. fazer rolagem para carregar listas virtualizadas/infinite scroll;
6. capturar links de cidadão/paciente/família/domicílio/imóvel e dados presentes na linha;
7. observar respostas JSON carregadas pelo próprio PEC durante a navegação, quando disponíveis, para localizar registros de cidadãos que não estejam diretamente expostos como links no DOM;
8. deduplicar por chave externa antes de salvar o mailing.

A extensão não altera o PEC nem envia dados para fora do navegador durante a coleta. Os dados ficam no armazenamento local da extensão até serem importados para uma campanha.

### Limitação importante
A estrutura do PEC pode mudar e diferentes telas podem usar endpoints/rotas diferentes. Por isso a extensão mantém uma camada híbrida DOM + respostas JSON. A confirmação de 100% da população deve ser feita comparando o total exibido pelo próprio PEC para cada microárea com o total coletado pela extensão.
