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
| Admin | admin@vgmf.org | Admin@123 |
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
- Notification system (in-app; email/WhatsApp integration ready)

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- Prisma ORM
- PostgreSQL (Neon)
- JWT session auth
