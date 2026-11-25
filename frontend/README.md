# ReachInbox Email Job Scheduler - Frontend

Modern React 18 + TypeScript + Tailwind CSS dashboard matching the ReachInbox design requirements, ready to deploy to Vercel.

## Features
- Google OAuth login and user profile header
- Scheduled Emails and Sent Emails tabs with loading & empty states
- Lead CSV / text file upload with automatic email count validation
- Rate limit, inter-email delay, and start-time controls
- Instant Elasticsearch search
- One-click Slack connection status

## Local Development
```bash
npm install
npm run dev
```

## Deploying to Vercel
1. Import repository to Vercel.
2. Set root directory to `frontend`.
3. Framework Preset: **Vite**.
4. Configure environment variables (`VITE_API_BASE_URL` pointing to the Render backend service).
5. Click **Deploy**.
