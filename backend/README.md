# ReachInbox Email Job Scheduler - Backend

Production-ready Express.js + TypeScript service managing persistent, delayed email scheduling at scale using BullMQ, Redis, PostgreSQL, Elasticsearch, and Slack OAuth alerting.

## Tech Stack
- **Framework:** Express.js + TypeScript
- **Job Queue:** BullMQ + Redis (ioredis)
- **Database:** PostgreSQL (Prisma ORM)
- **Search:** Elasticsearch 8.x
- **Email:** Nodemailer (Ethereal fake SMTP)
- **Monitoring:** `@bull-board/express`
- **Integrations:** Google OAuth 2.0 & Slack OAuth 2.0

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Update DATABASE_URL, REDIS_URL, ELASTICSEARCH_NODE, etc.
   ```

3. Run database migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Production build & start:
   ```bash
   npm run build
   npm start
   ```

## Deploying to Render
1. Connect your GitHub repository to Render.
2. Create a new **Web Service** or use the included `render.yaml` blueprint.
3. Configure environment variables in the Render dashboard (e.g. `DATABASE_URL`, `REDIS_URL`, `FRONTEND_URL`).
4. Set build command to `npm install && npm run build`.
5. Set start command to `npm start`.
