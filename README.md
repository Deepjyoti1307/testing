# ReachInbox Hiring Assignment – Full-Stack Email Job Scheduler

A production-grade, distributed email scheduling microservice and dashboard built for high-throughput cold outreach. The system schedules delayed email dispatches using **BullMQ + Redis** with strictly **zero cron jobs**, persists execution states in **PostgreSQL**, synchronizes records to **Elasticsearch** for sub-second full-text searching, enforces multi-tenant hourly and per-sender throttling with automatic queue rescheduling, and delivers real-time **Slack OAuth / Webhook alerts** when rate limits are breached.

---

## 📌 Table of Contents
1. [Tech Stack & Architecture Overview](#-architecture-overview)
2. [Zero-Cron Delayed Scheduling Engine](#-zero-cron-delayed-scheduling-engine)
3. [Crash Persistence & Restart Guarantees](#-crash-persistence--restart-guarantees)
4. [Rate Limiting, Concurrency & Auto-Rescheduling](#-rate-limiting-concurrency--auto-rescheduling)
5. [Feature Mapping Matrix](#-feature-mapping-matrix)
6. [Prerequisites & Environment Variables](#-prerequisites--environment-variables)
7. [Step-by-Step Run Guide](#-step-by-step-run-guide)
   - [Running Backend](#1-running-the-backend-express-prisma-bullmq-worker)
   - [Running Frontend](#2-running-the-frontend-react-18--tailwind-css)
8. [Ethereal Email Setup & Preview Links](#-ethereal-email-setup--preview-links)
9. [Slack Integration Guide](#-slack-integration-guide)
10. [Assumptions, Trade-Offs & Delay Choices](#-assumptions-trade-offs--design-decisions)
11. [Submission Details](#-submission-details)

---

## 🏗 Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend (Vercel Ready)"]
        UI["React 18 + TypeScript + Tailwind Dashboard"]
        GoogleAuth["Google OAuth 2.0 Login"]
        SlackConn["Slack OAuth Flow"]
    end

    subgraph BackendGateway ["Backend API Gateway (Render Ready)"]
        ExpressApp["Express.js Server (Port 5000)"]
        AuthMid["JWT Auth Middleware"]
        EmailCtrl["Email Schedule & Search Controller"]
        BullBoard["Bull-Board Admin UI (/admin/queues)"]
    end

    subgraph Storage ["Persistent & Distributed State"]
        Postgres[(PostgreSQL 16 via Prisma)]
        RedisCache[(Redis - BullMQ Queues + Rate Limit Counters)]
        Elastic[(Elasticsearch - Full-Text Search Index)]
    end

    subgraph Workers ["Worker Fleet"]
        BullWorker["BullMQ Worker (Concurrency: 5, Throttle: 2000ms)"]
        SmtpService["Nodemailer Transporter Pool"]
        SlackNotifier["Slack Alert Service"]
    end

    UI -->|Google Login| GoogleAuth
    UI -->|Schedule Campaign| ExpressApp
    UI -->|Search| ExpressApp

    ExpressApp --> AuthMid --> EmailCtrl
    ExpressApp --> BullBoard

    EmailCtrl -->|1. Store SCHEDULED Record| Postgres
    EmailCtrl -->|2. Index Email Document| Elastic
    EmailCtrl -->|3. Add Delayed Job (idempotent ID)| RedisCache

    RedisCache -->|Poll when timestamp arrives| BullWorker
    BullWorker -->|Check atomic hourly limit| RedisCache

    BullWorker -->|If limit OK: Send SMTP| SmtpService
    SmtpService -->|Fake SMTP| Ethereal["Ethereal Mail (Captures live preview URL)"]
    BullWorker -->|Update SENT + preview URL| Postgres
    BullWorker -->|Update SENT status| Elastic

    BullWorker -->|If limit reached: Reschedule| RedisCache
    BullWorker -->|Update RESCHEDULED status| Postgres
    BullWorker -->|Dispatch Live Warning| SlackNotifier
    SlackNotifier -->|HTTP POST| SlackWorkspace["Connected Slack Channel"]
```

---

## ⏱ Zero-Cron Delayed Scheduling Engine

### Non-Negotiable Constraint Compliance
- **Strictly No Cron Jobs**: No OS-level cron (`crontab`), no Node cron libraries (`node-cron`, `cron`, `agenda`).
- **Mathematical Delay Offset**:
  When a campaign of $N$ leads is uploaded with a chosen start time $T_{start}$ and an inter-email delay $\Delta t$ (e.g. 2 seconds):
  $$\text{TargetTimestamp}_i = T_{start} + (i \times \Delta t)$$
  $$\text{BullMQ Delay}_i = \max(0, \text{TargetTimestamp}_i - \text{Date.now}())$$
- **Under the Hood**:
  BullMQ inserts the job into a **Redis Sorted Set (`zset`)**, with the Unix timestamp as the sort score. Redis handles delayed timers natively using timer event loops. Node.js never polls on intervals.

---

## 🛡 Crash Persistence & Restart Guarantees

If the backend server process crashes, gets killed (`SIGKILL` / `SIGTERM`), or restarts mid-campaign:

1. **Timers Never Die**: Because BullMQ delayed timers are stored inside Redis's persistent storage (AOF/RDB), active delays remain completely intact during a server outage.
2. **Deterministic Idempotency**: Every queued job is assigned a deterministic ID:
   $$\text{Job ID} = \text{job\_}\{\text{emailJobId}\}$$
   If a network retry or reboot happens, BullMQ prevents duplicate job creation for the same record.
3. **Resumption Without Resending**:
   - Jobs that were already sent have `status = 'SENT'` in PostgreSQL and are never re-enqueued.
   - Jobs whose target dispatch times arrived during the server downtime fire **immediately** upon worker reconnection.
   - Future jobs continue to wait until their exact scheduled timestamp arrives.

---

## 🚦 Rate Limiting, Concurrency & Auto-Rescheduling

### 1. Multi-Worker Concurrency & Inter-Email Throttling
- **Worker Concurrency**: Configured via `WORKER_CONCURRENCY=5` (parallel job processing).
- **Inter-Email Delay (Provider Throttling)**: BullMQ limiter enforces a minimum delay between sends (default: **2000ms / 2 seconds**) to mimic human sending patterns and avoid SMTP provider greylisting.

### 2. Distributed Atomic Hourly Rate Limiter (Redis Lua Token Bucket)
Hourly limits (`MAX_EMAILS_PER_HOUR_PER_SENDER`, default: 200/hr) are tracked atomically across multiple instances using Redis Lua scripts:
- **Cache Key**: `ratelimit:sender:{senderId}:{YYYY-MM-DD-HH}`
- **TTL**: 7,200 seconds (2 hours) for automatic garbage collection.
- **Atomic Lua Script**:
  ```lua
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local current = tonumber(redis.call('get', key) or "0")

  if current < limit then
      local nextCount = redis.call('incr', key)
      if current == 0 then
          redis.call('expire', key, 7200)
      end
      return {1, nextCount} -- Allowed
  else
      return {0, current} -- Limit Reached
  end
  ```

### 3. Non-Dropping Auto-Rescheduling Policy
When the hourly cap is reached, **the system does NOT drop, discard, or fail jobs**:
1. Worker computes the exact milliseconds remaining until the start of the next clock hour window:
   $$\text{NextHourTimestamp} = \lceil (\text{now} + 1) / 3600000 \rceil \times 3600000$$
   $$\text{RescheduleDelay} = \text{NextHourTimestamp} - \text{now}$$
2. Re-enqueues the job into BullMQ with `delay = RescheduleDelay`.
3. Updates the database status:
   `status = 'RESCHEDULED'`, `scheduledAt = NextHourTimestamp`, `rescheduledCount = rescheduledCount + 1`.
4. Emits `rate_limit_hit` event triggering an instant **Slack Block Kit alert**.

---

## 📋 Feature Mapping Matrix

| Assignment Requirement | Implementation Location | Description |
| :--- | :--- | :--- |
| **Zero-Cron Delayed Scheduling** | `backend/src/services/email.service.ts` | Calculates exact timestamp offsets without `node-cron` or `agenda`. |
| **Crash & Restart Persistence** | `backend/src/queues/email.queue.ts` | Redis-backed BullMQ sorted sets with deterministic job IDs. |
| **Ethereal Fake SMTP** | `backend/src/services/smtp.service.ts` | Captures and stores live message preview URLs via `nodemailer.getTestMessageUrl`. |
| **Configurable Concurrency** | `backend/src/queues/email.worker.ts` | BullMQ worker with `concurrency: ENV.WORKER_CONCURRENCY`. |
| **Inter-Email Delay (Throttling)**| `backend/src/queues/email.worker.ts` | BullMQ queue limiter (`duration: 2000ms`). |
| **Hourly Rate Limiting** | `backend/src/services/rate-limiter.service.ts`| Multi-worker safe Redis Lua atomic token bucket per sender per hour. |
| **Non-Dropping Rescheduling** | `backend/src/queues/email.worker.ts` | Automatically rolls over jobs to the next hour window on quota breach. |
| **Live Slack OAuth Notification** | `backend/src/services/slack.service.ts` | Real Slack OAuth / Webhook integration posting rich Block Kit warning cards. |
| **Elasticsearch Search Index** | `backend/src/services/elasticsearch.service.ts`| Synchronized indexing on create/reschedule/send with PostgreSQL fallback. |
| **Live BullMQ Queue Dashboard**| `backend/src/queues/board.ts` | Mounted at `/admin/queues` for real-time queue visibility. |
| **Real Google OAuth Login** | `frontend/src/pages/Login.tsx` | Real Google OAuth 2.0 flow with user avatar, name, and email in header. |
| **Lead File (CSV/Text) Parsing** | `frontend/src/components/ComposeModal.tsx` | Regex parser displaying real-time detected valid email counter. |
| **Scheduled & Sent Email Tables** | `frontend/src/components/` | Tables with loading skeletons, status badges, cancel actions, and preview URLs. |

---

## ⚙️ Prerequisites & Environment Variables

### Prerequisites
- **Node.js**: v18 or v20+
- **PostgreSQL**: PostgreSQL 14+ (Local, Render Postgres, Neon, or Supabase)
- **Redis**: Redis 6+ (Local, Render Redis, Upstash, or Redis Cloud)
- **Elasticsearch**: Elasticsearch 8.x (Local, Bonsai, or Elastic Cloud)

### Backend Environment (`backend/.env`)
```ini
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# PostgreSQL Connection String
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox_scheduler"

# Redis Connection String
REDIS_URL="redis://localhost:6379"

# Elasticsearch Endpoint
ELASTICSEARCH_NODE="http://localhost:9200"
# ELASTICSEARCH_API_KEY="your-api-key" # optional if authenticated

# JWT Authentication
JWT_SECRET="reachinbox_super_secret_jwt_key_change_in_production"
JWT_EXPIRES_IN="7d"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/auth/google/callback"

# Slack OAuth Credentials
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
SLACK_REDIRECT_URI="http://localhost:5000/api/slack/callback"

# BullMQ Worker Concurrency & Throttle Controls
WORKER_CONCURRENCY=5
DEFAULT_MIN_DELAY_MS=2000
DEFAULT_HOURLY_LIMIT_PER_SENDER=200

# Ethereal Fake SMTP (Optional: Leave empty for auto-generated test accounts)
ETHEREAL_USER=""
ETHEREAL_PASS=""
```

### Frontend Environment (`frontend/.env`)
```ini
# Backend Base API URL
VITE_API_BASE_URL="http://localhost:5000"
```

---

## 🚀 Step-by-Step Run Guide

### 1. Running the Backend (Express, Prisma, BullMQ Worker)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file from example
cp .env.example .env
# Fill in your DATABASE_URL and REDIS_URL

# 4. Generate Prisma Client and apply migrations
npx prisma generate
npx prisma migrate dev --name init

# 5. Start the backend in development mode
npm run dev

# 6. (Optional) Run production build
npm run build
npm start
```
- API Server runs at: `http://localhost:5000`
- Bull-Board Live Queue Dashboard: `http://localhost:5000/admin/queues`
- Health check: `http://localhost:5000/health`

### 2. Running the Frontend (React 18 + Tailwind CSS)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. (Optional) Build for production (Vercel)
npm run build
```
- Frontend Dashboard opens at: `http://localhost:3000`

---

## 📬 Ethereal Email Setup & Preview Links

1. The service uses **Ethereal Email** (the official fake SMTP server recommended by ReachInbox).
2. **Auto-Provisioning**: If you do not provide credentials in `.env`, the backend automatically calls `nodemailer.createTestAccount()` on demand and associates the generated test sender account with your user profile.
3. **Live Previews**: Every sent email captures the live preview URL generated by Ethereal (`https://ethereal.email/message/...`).
4. In the frontend **Sent Emails** tab, click **"View Preview ↗"** to open the dispatched message in your browser.

---

## 💬 Slack Integration Guide

### Two Ways to Connect Slack:
1. **Real Slack OAuth**:
   - Click **"Connect Slack"** on the dashboard.
   - Authenticate with your Slack workspace.
   - The backend stores the OAuth access token and incoming webhook channel per tenant.
2. **Direct Webhook (Instant Testing)**:
   - Click the Slack pill in the top header $\rightarrow$ Enter your Slack incoming webhook URL (e.g. `https://hooks.slack.com/services/...`).
   - Click **"Save Webhook"**.
3. **Testing Connection**:
   - In the modal, click **"Send Test Alert"**. A verification message will be posted to your channel immediately.
4. **Rate Limit Hit Alert**:
   - The moment any sender hits their hourly limit, a rich Block Kit notification with sender details, current count, next window, and zero-drop confirmation is posted to Slack in real-time.

---

## 🧠 Assumptions, Trade-Offs & Design Decisions

1. **Inter-Email Delay (Chosen: 2 seconds / 2000ms)**:
   - *Reasoning*: A 2-second minimum interval between individual sends was chosen to accurately simulate real-world outbound email behavior, respecting SMTP connection limits and avoiding provider throttling.
2. **Auto-Rescheduling vs. Job Failure**:
   - *Design Decision*: Instead of failing jobs or letting BullMQ mark them as dead-letter items when an hourly cap is reached, jobs are programmatically re-enqueued with a delay targeting the start of the next hour window (`rescheduleDelay = nextHour - now`). This fulfills the **zero-drop, non-failing requirement**.
3. **Dual-Write Search Engine with DB Fallback**:
   - *Trade-off*: All jobs are indexed to Elasticsearch. If the Elasticsearch node becomes temporarily unreachable, search queries fall back seamlessly to PostgreSQL queries without returning 500 errors to the dashboard.
4. **Cloud-First Deployment Ready**:
   - Backend contains [`backend/render.yaml`](file:///c:/Users/dipud/OneDrive/Desktop/testing/testing/backend/render.yaml) for 1-click deployment on **Render**.
   - Frontend contains [`frontend/vercel.json`](file:///c:/Users/dipud/OneDrive/Desktop/testing/testing/frontend/vercel.json) for 1-click SPA deployment on **Vercel**.

---

## 👥 Submission Details

- **Private GitHub Repository Access**:
  - Grant access to reviewers: **`Mitrajit`** and **`Yadav036`**.
- **Submission Form**:
  - Submit repository URL, demo video link, and deployed URLs in the ReachInbox assignment submission form.
