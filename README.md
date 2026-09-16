# ZD Crown Backend

NestJS API for the ZD Crown agro marketplace.

## Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT admin authentication
- Helmet, CORS, validation pipes, and rate limiting

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
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_URL` - deployed frontend URL
- `PORT` - Render sets this automatically; only add it if needed

The build runs `prisma generate` before Nest compiles so `@prisma/client` exports `PrismaClient`, enums, and model delegates. The pre-deploy command runs production migrations before the service starts.
