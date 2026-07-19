# morjan-api

Cloudflare Worker for `api.morjan.family` — trip catalog + phone upload pipeline.

Plan: [`docs/trips-phone-upload-plan.md`](../../docs/trips-phone-upload-plan.md)

## Secrets (correct names)

`wrangler secret put` takes the **name**, then prompts for the **value**.

| Secret name | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth Client ID (`….apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | OAuth Client secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh token from OAuth Playground |
| `UPLOAD_TOKEN` | Long random string for the family Shortcut (`X-Upload-Token`) |

Generate `UPLOAD_TOKEN` once:

```bash
openssl rand -hex 32
```

### Put secrets on this Worker (after first deploy)

From `apps/api`:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put UPLOAD_TOKEN
```

If secrets were put earlier with the **wrong name** (e.g. the Client ID as the secret name), or on another Worker (`morjan-media`), they do **not** apply here. Re-put all four on `morjan-api` with the names above.

## First-time setup

```bash
cd apps/api

# 1) Create D1 and paste database_id into wrangler.toml
npx wrangler d1 create morjan-catalog

# 2) Apply schema
npx wrangler d1 migrations apply morjan-catalog --remote

# 3) Deploy Worker
npx wrangler deploy

# 4) Put secrets (prompts for values — do not pass values on the CLI)
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put UPLOAD_TOKEN
```

## Custom domain

Declared in `wrangler.toml` as a `custom_domain` route, so a deploy attaches it and
creates the DNS record automatically:

```bash
cd apps/api
npx wrangler deploy
```

(Manual alternative: Dashboard → Workers & Pages → `morjan-api` → Settings → Domains →
add `api.morjan.family` in zone `morjan.family`.)

## Smoke test

```bash
curl https://api.morjan.family/health
curl https://api.morjan.family/trips
```

Upload `POST` returns `501` until the pipeline is wired (next build step).

## Local

```bash
cd apps/api
npx wrangler dev
```
