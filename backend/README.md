# VYBET Backend — Fase 1 (demo)

Backend inicial para conectar o frontend VYBET ao Supabase. Esta fase mantém saldo, odds e apostas como demonstração; não inclui depósito, saque ou dinheiro real.

## Endpoints
- GET `/api/health`
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET/PATCH `/api/profile` (Bearer token)
- GET `/api/football/matches`
- GET/POST `/api/bets` (Bearer token, apostas demo)

## Configuração
1. Crie um projeto no Supabase.
2. Rode `supabase/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local` e preencha as variáveis.
4. Rode `npm install`.
5. Para Vercel, configure as mesmas variáveis no projeto e faça deploy.

## Segurança
Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend. Ela pertence apenas ao servidor. Em produção, restrinja `ALLOWED_ORIGIN` ao domínio real do VYBET e adicione rate limiting, logs/auditoria e validação mais rígida.

## Próxima integração
No frontend, substituir `localStorage` de login/perfil/apostas pelos endpoints acima e trocar `js/data.js` por `/api/football/matches` progressivamente.
