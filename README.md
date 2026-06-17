# VGMF Fellowship Portal

A comprehensive fellowship management system for the Viddhakarma Global Medical Foundation.

## Portals

| Portal | Route | Role |
|--------|-------|------|
| Main Site | `/` | Public |
| Applicant Portal | `/applicant` | APPLICANT |
| Admin Portal | `/admin` | ADMIN |
| Staff Portal | `/staff` | STAFF, FINANCE |
| Committee Portal | `/committee` | COMMITTEE |
| Trustee Portal | `/trustee` | TRUSTEE |

## Setup

1. Copy `.env.example` to `.env` and set your database URL and JWT secret
2. Install dependencies: `npm install`
3. Push database schema: `npm run db:push`
4. Seed default users: `npm run db:seed`
5. Start dev server: `npm run dev`

## Default Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vaidyagogate.org | Admin@2026 |
| Committee | committee@vgmf.org | Committee@123 |
| Staff | staff@vgmf.org | Staff@123 |
| Trustee | trustee@vgmf.org | Trustee@123 |

## Features

- Applicant registration with auto-generated User ID
- Login via email or phone + password
- Multi-step fellowship application (personal, professional, research, budget, documents)
- Document upload with admin review and resubmission workflow
- Committee scoring system (100 marks)
- Status workflow: Draft → Submitted → Under Review → Shortlisted → Interview → Selected/Rejected
- Trustee approval module
- Grant management and fund disbursement (40/40/20 installments)
- Progress reports, mid-term review, final submission
- Finance tracking and admin dashboard with statistics
- Notification system via ZeptoMail (email) and Meta WhatsApp (OTP + alerts)

## Email & WhatsApp Integration

### ZeptoMail
1. Create account at [ZeptoMail](https://www.zoho.com/zeptomail/)
2. Verify your domain and create a Mail Agent
3. Copy the **Send Mail Token** from Agent → SMTP/API
4. Set env vars: `ZEPTOMAIL_TOKEN`, `ZEPTOMAIL_FROM_EMAIL`, `ZEPTOMAIL_FROM_NAME`

### Meta WhatsApp OTP
1. Set up [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) in Meta Business Manager
2. Create an **Authentication** template (approved by Meta) for OTP
3. Get **Permanent Access Token** and **Phone Number ID**
4. Set env vars: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OTP_TEMPLATE_NAME`

Applicants must verify mobile via WhatsApp OTP before registration.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- Prisma ORM
- PostgreSQL (Neon)
- JWT session auth

## Deploy on Render

This project is configured for [Render](https://render.com), not Vercel.

### 1. Push to GitHub

Repository: [vdgogatememorialfoundation/VGMF-FELLOWSHIP](https://github.com/vdgogatememorialfoundation/VGMF-FELLOWSHIP)

### 2. Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Blueprint** (uses `render.yaml`) or **Web Service**
3. Connect the GitHub repo `vdgogatememorialfoundation/VGMF-FELLOWSHIP`
4. Render will detect the `render.yaml` blueprint automatically

### 3. Set Environment Variables

In Render → your service → **Environment**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string |
| `JWT_SECRET` | A long random secret (Render can auto-generate) |
| `NEXT_PUBLIC_APP_URL` | Your Render app URL, e.g. `https://vgmf-fellowship-portal.onrender.com` |

### 4. Deploy

- **Build command:** `npm install && npx prisma db push && npm run build`
- **Start command:** `npm start`

After the first successful deploy, seed admin users (one-time):

```bash
npm run db:seed
```

Run this locally with `DATABASE_URL` pointing to your production Neon database, or use Render Shell.

### Notes

- File uploads are stored on the server disk and are **not persistent** on Render free tier. For production, use S3 or similar object storage.
- `prisma db push` runs on each deploy to keep the schema in sync with Neon.

## GitHub

Repository: https://github.com/vdgogatememorialfoundation/VGMF-FELLOWSHIP

## Deploy on Render

This project uses [Render](https://render.com) for deployment (not Vercel). A `render.yaml` Blueprint is included.

### Option A: Blueprint (recommended)

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect the GitHub repo: `vdgogatememorialfoundation/VGMF-FELLOWSHIP`
3. Render reads `render.yaml` and creates the web service
4. Set environment variables:
   - `DATABASE_URL` — Neon PostgreSQL connection string
   - `NEXT_PUBLIC_APP_URL` — your Render URL (e.g. `https://vgmf-fellowship-portal.onrender.com`)
5. Deploy. Build runs `prisma db push` to sync the schema.

### Option B: Manual Web Service

1. **New** → **Web Service** → connect the GitHub repo
2. **Build Command:** `npm install && npx prisma generate && npx prisma db push && npm run build`
3. **Start Command:** `npm start`
4. Add env vars: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV=production`
5. After first deploy, open Render Shell and run: `npm run db:seed`

### Post-deploy

- Set `NEXT_PUBLIC_APP_URL` to your live Render URL
- Run `npm run db:seed` once to create admin accounts
- For production file uploads, migrate to S3 or cloud storage (Render disk is ephemeral)
