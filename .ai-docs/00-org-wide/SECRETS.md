# Secrets and Environment Variables

## Hard rules

- **Never commit `.env` files.** The repo's `.gitignore` excludes every `.env*` file except `.env.example` (pattern: `.env*` + `!.env.example`). This covers `.env`, `.env.local`, `.env.development`, `.env.production`, and any `.env.*.local` variant.
- **Always commit `.env.example`** with placeholder values (`API_KEY=your-key-here`). This documents which secrets are needed without leaking them.
- **Never log secrets.** Not in console output, not in error messages, not in monitoring/RUM payloads, not in build logs.
- **Never echo secrets back to the user.** If an agent reads a secret to use it in code, the secret value never appears in the agent's response.

## Where secrets live

| Environment | Source |
|---|---|
| Local development | `.env.local` (gitignored) |
| CI | GitHub Actions secrets, scoped to the right environment |
| Staging / Production | Coolify environment variables, per-deployment |

## Frontend "secrets" are public

Any environment variable exposed to the browser (`VITE_*`, `NEXT_PUBLIC_*`, `PUBLIC_*`, etc.) is **public**. It ships in the JavaScript bundle and anyone who loads the site can read it. Do not put API keys, signing keys, JWT secrets, or anything sensitive there.

These variables are appropriate for the frontend env:

- The public (publishable) Stripe key
- Public analytics or monitoring tokens
- The API base URL
- Feature flags that are not security-sensitive

These are **not**:

- Stripe secret key
- Database credentials
- JWT signing secret
- Any third-party API key with write access

## Backend secrets

Read secrets from environment variables at startup. **Fail fast** if a required secret is missing — never start the app with a placeholder default for a secret.

```java
// ✅ Validates at startup, throws if not set
@Value("${stripe.webhook.secret}")
private String stripeWebhookSecret;

// ❌ Silently uses a default — the app starts and Stripe webhooks then fail at runtime
private String stripeWebhookSecret =
    System.getenv().getOrDefault("STRIPE_WEBHOOK_SECRET", "");
```

## For AI agents

- Before running any command that takes a secret as an argument, confirm the command does not log to a file that gets committed
- When asked to add a new secret: update `.env.example` with a placeholder, document it in the relevant app's `README.md`, but **do not commit a real value** — leave it for the human to set in the deployment environment
- When asked to generate a secret (JWT signing key, webhook signing secret), generate it locally and print it once for the user to copy into Coolify — never commit it
- **If you discover that a secret has been committed** (in the current or any past commit), stop immediately and tell the user. Do not try to fix it silently. A committed secret must be rotated, and only the human can perform that rotation.
