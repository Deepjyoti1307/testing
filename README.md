# ReachInbox Full-Stack Email Job Scheduler

A production-grade, zero-cron email scheduling microservice and dashboard built for high-throughput outreach. 

Powered by **BullMQ + Redis**, **PostgreSQL**, **Elasticsearch**, **Express (TypeScript)**, **React / Tailwind CSS**, and **Slack OAuth** alerting.

---

## 📁 Repository Structure

```text
├── docs/                      # Project Specifications & Technical Design
│   ├── prd.md                 # Product Requirements Document
│   └── design.md              # System Architecture & Technical Design Document
│
├── backend/                   # Express.js + TypeScript Service (Hosted on Render)
│   ├── src/
│   │   ├── config/            # Environment & Service Configs
│   │   ├── controllers/       # Route Controllers
│   │   ├── middlewares/       # Auth & Error Middlewares
│   │   ├── queues/            # BullMQ Queue, Worker & Bull-Board Dashboard
│   │   ├── services/          # Rate Limiting, SMTP, Slack, Elasticsearch
│   │   ├── routes/            # REST API Routes
│   │   └── types/             # TypeScript Types & Interfaces
│   ├── prisma/                # Prisma PostgreSQL Schema & Migrations
│   ├── .env.example           # Environment template for Render / Cloud services
│   ├── render.yaml            # Render Blueprint Configuration
│   └── README.md
│
├── frontend/                  # React + TypeScript + Tailwind CSS (Hosted on Vercel)
│   ├── src/
│   │   ├── components/        # Reusable UI Components
│   │   ├── pages/             # Login & Dashboard Views
│   │   ├── services/          # API Client Layer
│   │   └── types/             # Frontend Types
│   ├── vercel.json            # Vercel Deployment Configuration
│   ├── .env.example           # Environment template for Vercel
│   └── README.md
│
└── README.md                  # Project Root Readme
```

---

## 🚀 Cloud Deployment Strategy

- **Frontend**: Deployed on **Vercel** (`/frontend`)
- **Backend**: Deployed on **Render** (`/backend`)
- **Database**: Managed PostgreSQL (Render PostgreSQL, Neon, or Supabase)
- **Queue / Cache**: Managed Redis (Render Redis, Upstash Redis, or Redis Cloud)
- **Search**: Elasticsearch (Elastic Cloud or Bonsai)

---

## 📖 Key Documentation
- Read the **[Product Requirements Document](docs/prd.md)** for business rules, core objectives, and user requirements.
- Read the **[Technical Design Document](docs/design.md)** for database schema, rate-limiting algorithms, BullMQ mechanics, and Slack OAuth integration flow.
