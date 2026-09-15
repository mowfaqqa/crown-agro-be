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
