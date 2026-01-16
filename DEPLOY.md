# Deploying to Cloudflare (Workers + Access)

This guide deploys the Svelte/Vite SPA as a Cloudflare Worker with static assets
and protects it with Cloudflare Access (email allowlist) using Terraform.

## Prerequisites

1. Cloudflare account with your domain already added (zone active).
2. Node.js + npm (or Bun if you prefer; commands below use npm).
3. Terraform >= 1.5 installed.
4. Cloudflare API token with:
   - Account: `Zero Trust` (Access) - Edit
   - Zone: `Zone Settings` - Read (optional)
   - Zone: `Zone` - Read
   - Zone: `Workers Routes` - Edit (if using custom route)

## 1) Configure build-time env vars

Create a file `web/.env.local` with:

```
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_TRACKER_CLIENT_ID="optional-client-id"
```

These are read at build time by Vite.

## 2) Configure Worker routing

Open `wrangler.toml` and set your route and zone:

```
routes = [{ pattern = "explorer.example.com/*", zone_name = "example.com" }]
workers_dev = false
```

Notes:
- Use the exact hostname you want users to visit.
- `workers_dev = false` disables the `*.workers.dev` preview URL.

## 3) Install dependencies and build the SPA

From the repo root:

```
npm --prefix web ci
npm --prefix web run build
```

This generates `web/dist` for deployment.

## 4) Deploy the Worker

Authenticate Wrangler once:

```
npx wrangler login
```

Deploy:

```
npx wrangler deploy
```

## 5) Configure Cloudflare Access (Terraform)

1. Create `infra/terraform.tfvars` with your values:

```
cloudflare_api_token  = "your-api-token"
cloudflare_account_id = "your-account-id"
app_name              = "boundless-explorer"
app_domain            = "explorer.example.com"
allowed_emails        = ["you@example.com"]
allowed_email_domains = ["example.com"]
```

At least one of `allowed_emails` or `allowed_email_domains` must be non-empty.

2. Apply Terraform:

```
cd infra
terraform init
terraform plan
terraform apply
```

## 6) Verify

1. Visit `https://explorer.example.com`.
2. You should be redirected to Cloudflare Access login.
3. Only emails in the allowlist should be able to proceed.

## Troubleshooting

- If the Access login does not appear, confirm:
  - The Access app `app_domain` matches the Worker route hostname.
  - The hostname is proxied through Cloudflare (orange cloud).
- If the SPA 404s on refresh, ensure `worker/index.ts` is deployed with the
  asset fallback (it is by default in this repo).

