# ZD Crown Backend

NestJS API for the ZD Crown agro marketplace.

## Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT admin authentication
- JWT customer authentication and protected checkout
- Email verification, password reset, Google sign-in, and rotating refresh sessions
- Helmet, CORS, validation pipes, and rate limiting

## Marketplace Rules

- Product filtering, sorting, and pagination are server-driven.
- Bulk pricing is calculated by the API at checkout.
- Checkout requests are idempotent and require a customer JWT.
- Cancelling an unpaid order restores its reserved stock.
- Order status changes follow a controlled fulfillment sequence.

## Customer Account Integrations

Customer access tokens are short-lived. Persistent login uses a rotating, HttpOnly refresh cookie that lasts 30 days. Configure these variables in production:

- `CUSTOMER_ACCESS_TOKEN_EXPIRES_IN` - use `15m`
- `RESEND_API_KEY` - sends verification and password-reset emails
- `EMAIL_FROM` - verified sender address in Resend
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `GOOGLE_REDIRECT_URI` - backend URL ending in `/auth/google/callback`

Add the exact `GOOGLE_REDIRECT_URI` to the Google OAuth client. In local development without Resend, verification and reset links are written to the backend log.

## Market Intelligence

The public API exposes published, non-archived market intelligence at `/market-intelligence`. The single admin role manages commodity updates, agriculture news, export opportunities, and weather advisories under `/admin/market-intelligence`.

Entries are drafts until explicitly published. Sources, images, location, commodity, and headline values are optional so administrators can publish only information they have verified.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev
```

The API runs on `http://localhost:4000` by default.

## First Admin

The seed script creates an admin using:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Change both before production.

## Render Deployment

Create the backend as a Render Web Service with the backend repository as the service root.

Use these commands:

```bash
Build Command: pnpm install --frozen-lockfile && pnpm build
Pre-Deploy Command: pnpm prisma:migrate:deploy
Start Command: pnpm start
```

Required environment variables:

- `DATABASE_URL` - Render PostgreSQL internal database URL
- `JWT_SECRET` - long random production secret
- `JWT_EXPIRES_IN` - for example `1d`
- `CUSTOMER_ACCESS_TOKEN_EXPIRES_IN` - for example `15m`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_URL` - deployed frontend URL
- `RESEND_API_KEY` and `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`
- `PORT` - Render sets this automatically; only add it if needed

The build runs `prisma generate` before Nest compiles so `@prisma/client` exports `PrismaClient`, enums, and model delegates. The pre-deploy command runs production migrations before the service starts.
