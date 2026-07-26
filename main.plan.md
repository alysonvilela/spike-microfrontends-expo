# Plano de arquitetura — shell Expo + frontends Next.js em WebView

Monorepo com um app nativo genérico (shell) que carrega N frontends web em WebView,
roteados por um manifest remoto, com Better Auth como servidor de sessão.

---

## 0. Decisão de auth: bearer resolve um eixo, não os dois

Existem **dois caminhos de autenticação diferentes** neste sistema, e eles têm
restrições opostas:

| Eixo | Quem autentica | Mecanismo |
|---|---|---|
| Expo nativo → API | código React Native | **Bearer** (`Authorization: Bearer <token>`) |
| WebView → Next.js (SSR/RSC) | o servidor do Next, durante o render | **Cookie** (`httpOnly`, via OTT) |

Motivo da separação: uma navegação de topo (`WebView.load(url)`) **não permite
anexar header `Authorization`**. Quando o Next renderiza a página no servidor, a
única credencial disponível no request é o cookie. Se a sessão só existir como
bearer token em memória JS, todo Server Component renderiza deslogado e você é
empurrado para `'use client'` em tudo — perdendo a razão de usar Next.

A doc do Better Auth é explícita: o plugin bearer é indicado para APIs que não
suportam cookies, e deve ser usado com cautela porque implementação incorreta
gera vulnerabilidade com facilidade.

### Fork honesto

**Opção A (escolhida): híbrido.** Bearer no eixo nativo↔API, cookie no eixo
WebView↔Next. Mantém SSR, primeiro paint rápido, token nunca toca `localStorage`.
Custo: precisa de subdomínios sob um mesmo domínio raiz e HTTPS em dev.

**Opção B: bearer puro.** Simplifica MUITO a infra — sem `crossSubDomainCookies`,
sem TLS local, sem ITP do Safari. Custo: os frontends viram SPA client-side.
Se for por esse caminho, **troque Next.js por Vite + React Router**, porque você
estará pagando o peso do Next sem usar nada do que ele oferece.

> Se em qualquer momento do dia 1 a Opção A travar por mais de 1h em cookie,
> caia para a Opção B com Vite. Não force.

### Onde bearer entra de fato

O `expoClient` já replica um cookie jar em `expo-secure-store` e anexa os headers
sozinho nas chamadas ao Better Auth. Ou seja: **bearer não é obrigatório** para
falar com o próprio backend. Ele vale a pena quando:

- Você quer um esquema header-based limpo nas suas rotas Elysia (`/api/*`)
- A API vai morar em outro serviço/host no futuro
- Você quer poder testar a API com `curl` sem lidar com cookie jar

`auth.api.getSession({ headers })` aceita os dois — cookie e `Authorization` —
então o handler do servidor é o mesmo nos dois casos.

---

## 1. Estrutura

```
monorepo/
├── apps/
│   ├── backend/            # Bun + Elysia: Better Auth, manifest, API
│   ├── app-clube/          # Next.js         (dia 1)
│   ├── app-ajuda/          # Next.js         (dia 2)
│   ├── app-pedidos/        # Next.js         (dia 2)
│   └── mobile/             # Expo (shell)
├── packages/
│   ├── auth/               # config Better Auth + getSession() p/ os Next
│   ├── manifest/           # manifest como código, por ambiente
│   ├── bridge/             # protocolo webview↔nativo, agnóstico de framework
│   ├── ui/
│   └── design-tokens/
├── infra/
│   ├── Caddyfile
│   └── Caddyfile.local
├── docker-compose.yml
├── docker-compose.local.yml
└── turbo.json
```

`packages/bridge` isolado desde o dia 1: é o que permite trocar Next por Astro
depois sem reescrever o cliente da ponte.

---

## 2. Domínios

Tudo sob **um registrable domain só**, porque subdomínios são *same-site* — isso
permite `sameSite: 'lax'` (em vez de `'none'`) e evita o ITP do Safari, que
bloqueia cookies quando a API está num domínio diferente do frontend.

| | Produção | Local |
|---|---|---|
| Backend | `auth.meuapp.com` | `auth.local.meuapp.com` |
| Clube | `clube.meuapp.com` | `clube.local.meuapp.com` |
| Ajuda | `ajuda.meuapp.com` | `ajuda.local.meuapp.com` |
| Pedidos | `pedidos.meuapp.com` | `pedidos.local.meuapp.com` |

Local: wildcard DNS `*.local.meuapp.com → 127.0.0.1` (ou `/etc/hosts`) + TLS
interno do Caddy. Cookie `secure` exige HTTPS mesmo em dev.

**Gotcha reservado:** o emulador Android precisa confiar na CA do Caddy
(`caddy trust`, depois push do root cert para o emulador). Reserve 20min.
No simulador iOS, instale o cert nas configurações.

---

## 3. Manifest: local e deployado

### Manifest como código, não JSON estático

```ts
// packages/manifest/src/index.ts
type Env = 'local' | 'staging' | 'production'

const HOSTS: Record<Env, string> = {
  local:      'https://{app}.local.meuapp.com',
  staging:    'https://{app}.stg.meuapp.com',
  production: 'https://{app}.meuapp.com',
}

export function resolveManifest(opts: {
  env: Env
  appVersion: string
  flags: Record<string, boolean>   // já resolvidas para ESTE usuário
}) {
  const host = (app: string) => HOSTS[opts.env].replace('{app}', app)

  const apps = {
    clube: {
      entry: host('clube'),
      min_app_version: '1.0.0',
      presentation: 'push',
      bridge: ['session.refresh', 'nav.close'],
      fallback: { type: 'native', route: '/clube-legacy' },
    },
    pedidos: {
      entry: host('pedidos'),
      min_app_version: '1.4.0',
      presentation: 'modal',
      bridge: ['session.refresh', 'nav.close', 'haptics'],
      fallback: { type: 'native', route: '/pedidos-legacy' },
      requires_flag: 'pedidos_webview',
    },
  }

  return {
    version: MANIFEST_VERSION,
    ttl: 300,
    env: opts.env,
    apps: filterByVersionAndFlags(apps, opts),
  }
}
```

Regras:

- **Resolvido no servidor, por usuário.** Flags e `min_app_version` são
  aplicados no backend, não no cliente. Se o app tiver que avaliar flag, você
  precisa de deploy nativo para mudar segmentação — que é exatamente o que o
  manifest deveria evitar.
- **`version` + `ttl`** permitem cache local e revalidação em foreground.
- **`bridge`** declara o contrato; o shell verifica se suporta tudo antes de
  abrir a rota, senão vai para `fallback`.

### Três origens de manifest, nesta ordem de precedência

1. **Override de dev** (só em `__DEV__`): URL colada num dev menu do app.
   Serve para apontar o shell para um preview de branch.
2. **Remoto**: `GET https://auth.<env>.meuapp.com/manifest` autenticado,
   com header `X-App-Version`. Cacheado em `AsyncStorage` com o `ttl`.
3. **Bundled**: `manifest.bundled.json` empacotado no binário, gerado no build
   por `turbo run manifest:snapshot`. Usado no cold start antes da rede
   responder e quando o device está offline.

O shell usa o bundled imediatamente, dispara o fetch em paralelo, e faz swap se
`remoto.version > cache.version`. Nunca bloqueie o cold start esperando rede.

### Seleção de ambiente no Expo

```json
// eas.json
{
  "build": {
    "development": { "env": { "EXPO_PUBLIC_ENV": "local" } },
    "preview":     { "env": { "EXPO_PUBLIC_ENV": "staging" } },
    "production":  { "env": { "EXPO_PUBLIC_ENV": "production" } }
  }
}
```

O shell monta a base URL a partir de `EXPO_PUBLIC_ENV`. Um build de produção
**não** deve conseguir apontar para local — o override de dev fica atrás de
`if (__DEV__)`.

---

## 4. Backend

```ts
// packages/auth/src/server.ts
import { betterAuth } from 'better-auth'
import { bearer, oneTimeToken } from 'better-auth/plugins'
import { expo } from '@better-auth/expo'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  emailAndPassword: { enabled: true },
  session: { cookieCache: { enabled: true, maxAge: 60 } },
  advanced: {
    crossSubDomainCookies: { enabled: true, domain: '.meuapp.com' },
    defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: 'lax' },
    useSecureCookies: true,
  },
  trustedOrigins: [
    'https://clube.meuapp.com',
    'https://ajuda.meuapp.com',
    'https://pedidos.meuapp.com',
    'meuapp://',
  ],
  plugins: [
    expo(),                                          // deep links + origin mobile
    bearer(),                                        // eixo nativo → API
    oneTimeToken({ expiresIn: 1, storeToken: 'hashed' }), // eixo webview
  ],
})
```

Notas de configuração:

- O ponto inicial em `.meuapp.com` no `crossSubDomainCookies` é obrigatório;
  sem ele o cookie não é compartilhado entre subdomínios.
- `sameSite: 'lax'` é suficiente aqui. Muitos exemplos na internet usam `'none'`
  — isso só é necessário para cross-*site* real, e enfraquece a proteção CSRF.
- O plugin `expo()` server-side não é opcional: ele faz override do header de
  origin em requests mobile e converte cookie em parâmetro de URL nos deep
  links de callback.
- Ambiente: `trustedOrigins` e `domain` mudam por env — leia de env var.

Mount no Elysia com `.mount(auth.handler)`, CORS com `credentials: true`,
e macro com `resolve` chamando `auth.api.getSession({ headers })` para injetar
`user`/`session` nas rotas.

---

## 5. O handshake da WebView

Quem troca o OTT por cookie é o **backend**, não o Next.js — assim a assinatura
de cookie fica num lugar só e o `crossSubDomainCookies` propaga para todos.

```
Expo (logado, sessão no SecureStore via expoClient)
  │
  ├─ authClient.oneTimeToken.generate()      → token (1 min, single-use, hashed)
  │
  └─ WebView.load(
       https://auth.meuapp.com/webview/enter?token=…&to=https://clube.meuapp.com/
     )
        │
        └─ backend: verifyOneTimeToken(token)
                    Set-Cookie no domínio .meuapp.com
                    302 → `to`
                        │
                        └─ clube.meuapp.com: SSR já autenticado
```

Regras não-negociáveis:

- **`to` passa por allowlist de hosts.** Sem isso você construiu um open
  redirect autenticado.
- **OTT é single-use e curto** (1 min). Uma vez validado é marcado como usado e
  não revalida — é o que previne replay.
- **`storeToken: 'hashed'`** para o token não ficar em claro no banco.
- Depois do 302, a URL com o token sai do histórico da WebView.

Em 401 dentro da WebView, o web chama `bridge.session.refresh()`, o shell gera
um OTT novo e recarrega. O web nunca guarda credencial.

---

## 6. Plano do dia 1 (8h)

### Bloco 0 — 30min — Spike de risco

Script Bun isolado: cria usuário → `generateOneTimeToken` → `verifyOneTimeToken`
→ produz um `Set-Cookie` válido. **Nada mais começa antes disso funcionar.**

`verifyOneTimeToken` devolve a sessão associada ao token; transformar isso em
`Set-Cookie` depende de como a versão instalada expõe o helper de sessão.
Plano B: o backend reemite uma sessão nova para o `userId` retornado.

### Bloco 1 — 2h — Backend + infra local

- Turborepo, `apps/backend` com Elysia, Drizzle + SQLite (Postgres é overhead no MVP)
- Migration do Better Auth (`npx @better-auth/cli generate`)
- `packages/manifest` + `GET /manifest` autenticado e resolvido por usuário
- `GET /webview/enter` com allowlist de `to`
- Caddy local com os 4 hosts + TLS interno

### Bloco 2 — 2h — app-clube

- `packages/design-tokens` (Style Dictionary → CSS custom properties)
- 2 componentes em `packages/ui` consumindo os tokens
- `packages/auth/src/ssr.ts`: `getSession(headers)` que faz fetch em
  `auth.<env>.meuapp.com/api/auth/get-session` encaminhando o cookie
- Uma página que só renderiza logada — **teste com JS desligado** para provar
  que o SSR está autenticado de verdade

### Bloco 3 — 2.5h — Expo shell

- `expoClient({ scheme, storagePrefix, storage: SecureStore })`
- Login nativo + guarda do bearer token para as chamadas de `/api/*`
- Carregamento do manifest: bundled → cache → remoto, com swap por `version`
- `WebViewScreen` genérica: `sharedCookiesEnabled` (iOS),
  `thirdPartyCookiesEnabled` (Android), `originWhitelist` restrito
- `onError` / `onHttpError` → tela de fallback (nunca a tela branca do Chrome)
- Handshake OTT ponta a ponta

### Bloco 4 — 1h — Fechamento

- `docker compose -f docker-compose.local.yml up` sobe tudo
- Logout: `authClient.signOut()` + `CookieManager.clearAll()` (Android) +
  `WKWebsiteDataStore` (iOS)
- Teste que prova a tese: mudar a URL do clube no manifest, reabrir o app,
  ver a rota nova **sem rebuild**

---

## 7. Checklist de aceite

- [ ] OTT vira cookie válido em `.meuapp.com`
- [ ] Clube renderiza no **servidor** já autenticado (verificar com JS desligado)
- [ ] Cookie sobrevive a reload dentro da WebView no iOS **e** no Android
- [ ] Bearer token autentica `GET /api/health` sem cookie (teste com `curl`)
- [ ] `signOut()` no nativo derruba a sessão da WebView na próxima navegação
- [ ] `to` fora da allowlist é rejeitado com 400
- [ ] Manifest local e o deployado retornam hosts diferentes para o mesmo user
- [ ] App abre offline usando o manifest bundled
- [ ] Rota com `min_app_version` acima da instalada não aparece
- [ ] Trocar URL no manifest reflete sem rebuild do Expo

---

## 8. Riscos, em ordem

1. **OTT → Set-Cookie** (Bloco 0). Mitigação: plano B de reemitir sessão.
2. **CA do Caddy no emulador Android.** Mitigação: timebox de 20min, senão use
   um túnel HTTPS público (ngrok/cloudflared) apontando para o backend local.
3. **Cookie sumindo no iOS.** Quase sempre é `sharedCookiesEnabled` faltando no
   `react-native-webview`. Verifique isso antes de suspeitar do backend.
4. **Manifest resolvido no cliente por engano.** Revisar no code review: nenhuma
   flag pode ser avaliada dentro do app.

---

## 9. Fora de escopo (dia 1)

| Item | Motivo |
|---|---|
| `app-ajuda`, `app-pedidos` | Cópia de estrutura, não validam nada novo |
| CI/CD | Dia 2 |
| Module Federation | Cada app é standalone, manifest faz o roteamento |
| Plugin `jwt()` | Só se aparecer serviço não-JS que precise validar sozinho |
| Warm-up da WebView | Otimização, depois de funcionar |
| E2E mobile | Teste manual no primeiro ciclo |

---

## 10. Sobre Astro

Continua válido: Astro faz sentido se o app for mais conteúdo que interação
(ajuda, landings). Com a Opção A (cookie + SSR), a troca é barata porque o
manifest só muda a URL — **desde que o cliente da bridge esteja em
`packages/bridge`**, agnóstico de framework, desde o começo.