# Revio

A peer-to-peer electronics rental marketplace — rent cameras, consoles, drones,
projectors and more from verified people nearby, with the platform acting as the
trusted middleman (escrow payments, identity checks, condition verification,
disputes).

> **Status: foundation, not a finished product.** This repository is an
> honestly-scoped MVP skeleton. The data model, money/booking logic, design
> system, and setup are real and runnable. Large subsystems (auth wiring,
> Stripe webhooks, KYC, chat, admin) are specified and stubbed, not complete.
> See **[Build roadmap](#build-roadmap)** for exactly what is and isn't done.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Language | TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix primitives), lucide-react |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Auth | Auth.js (NextAuth v5) — email/password + Google + Apple |
| Payments | Stripe Connect (escrow rental + manual-capture deposit holds) |
| KYC | Stripe Identity (swap for manual review in the admin queue) |
| Storage | Supabase Storage or AWS S3 |
| Email | Resend |
| Maps | Google Maps JS API |
| Deploy | Vercel + a managed Postgres (Supabase / Neon) |

## Design language

White surfaces, cool neutral greys, one confident **emerald** accent (`#0B7A54`)
on a near-black-green ink, generous radii, soft low shadows. Prices, deposits,
serial numbers and spec values are set in a monospace face — a deliberate nod to
electronics spec sheets. All tokens live in `tailwind.config.ts`; switching the
accent to navy is a one-line change (`colors.accent.DEFAULT`).

---

## Folder structure

```
revio/
├─ prisma/
│  ├─ schema.prisma        # ✅ complete — 24 models, all relations validated
│  └─ seed.ts              # ✅ categories + verified owner + sample listings
├─ src/
│  ├─ app/                 # App Router (pages, layouts, route handlers)
│  │  ├─ (marketing)/      # homepage, how-it-works, trust & safety
│  │  ├─ (app)/            # authed: dashboard, bookings, messages, listings
│  │  ├─ listings/[slug]/  # listing detail + booking widget
│  │  ├─ admin/            # admin dashboard (role-gated)
│  │  └─ api/              # webhooks (stripe, stripe-identity), uploads
│  ├─ components/
│  │  ├─ ui/               # shadcn primitives (button, card, badge, dialog…)
│  │  ├─ listing-card.tsx  # ✅ design-system reference component
│  │  ├─ search-bar.tsx    # ⛔ scaffold
│  │  ├─ booking-widget.tsx# ✅ Stripe Elements checkout (dates → pay)
│  │  ├─ condition-capture.tsx # ⛔ scaffold (before/after uploader)
│  │  └─ id-verification-wizard.tsx # ⛔ scaffold
│  ├─ lib/
│  │  ├─ prisma.ts         # ✅ client singleton
│  │  ├─ money.ts          # ✅ pricing/fee/quote logic
│  │  ├─ stripe.ts         # ✅ server client
│  │  ├─ auth.ts           # ✅ Auth.js config (Prisma adapter, Credentials + Google)
│  │  └─ utils.ts          # ✅ cn(), slugify(), booking codes
│  └─ server/
│     ├─ booking-service.ts# ✅ escrow booking flow (validated, atomic)
│     ├─ availability.ts   # ⛔ calendar sync + conflict helpers
│     ├─ condition-service.ts # ⛔ report intake + AI comparison
│     └─ dispute-service.ts# ⛔ evidence + resolution actions
├─ .env.example            # ✅ every variable documented
├─ tailwind.config.ts      # ✅ design tokens
└─ package.json            # ✅ full dependency set
```

✅ = included and working · ⛔ = specified, needs building

---

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
#    fill in DATABASE_URL at minimum; add Stripe/Auth keys as you build

# 3. Create the schema and generate the client
npx prisma migrate dev --name init
npx prisma generate

# 4. Seed sample data
npm run db:seed

# 5. Run
npm run dev            # http://localhost:3000
npx prisma studio      # browse the database
```

You need a Postgres database. The fastest path is a free
[Supabase](https://supabase.com) or [Neon](https://neon.tech) project — paste its
connection string into `DATABASE_URL` (and `DIRECT_URL` if it gives a pooled URL).

---

## Data model highlights

The schema (`prisma/schema.prisma`) covers every entity in the brief and is
validated. A few decisions worth knowing:

- **Money is integer minor units + currency code** everywhere. No floats.
- **`Booking` snapshots its price** at creation — later edits to a listing never
  change a booking that's already made.
- **Escrow is two instruments**: the rental charge (held, then transferred to the
  owner minus fee on completion) and the deposit (a *manual-capture* hold that is
  released on a clean return or partially captured after a dispute).
- **`LedgerEntry`** is an immutable money log — reconcile, build receipts, and run
  analytics without recomputing from Stripe.
- **Condition verification** is `ConditionReport` (per party, per phase) →
  `ConditionMedia` (labelled front/back/serial/…) → `ConditionComparison` (holds
  the AI diff). This is the trust core and is modelled in full.
- **`AvailabilityBlock`** with an indexed date range + a serializable transaction
  in the booking service prevents double bookings.

---

## Build roadmap

Progress from skeleton to launchable MVP:

1. ✅ **Auth** — `src/lib/auth.ts` wired with the Prisma adapter, Credentials +
   Google, JWT sessions carrying user id + role, sign-in/sign-up pages, and edge
   middleware protecting `/dashboard`, `/sell`, `/bookings`, `/account`.
   *(Apple, email verification and password reset still to add.)*
2. ✅ **Listings CRUD + uploads** — create/edit listings via server actions,
   image upload to Supabase Storage (`/api/upload`, with a URL-paste fallback
   when storage isn't configured), and search/filter against Postgres
   (`/search`).
3. ✅ **Booking + Stripe** — booking/checkout UI with Stripe Elements
   (`booking-widget` → `/api/checkout`), the webhook handler at
   `/api/stripe/webhook` moving `Payment`/`Deposit` states, and Connect payout
   onboarding from the dashboard. Idempotency keys + a Stripe Customer per
   renter are folded into `booking-service`.
4. ⛔ **Identity verification** — Stripe Identity flow + the manual review queue in
   admin; gate listing/booking on `profile.identityVerified`. *(A manual
   `verifyIdentityStub` placeholder exists on `/account` so the booking loop is
   demoable end-to-end in test mode.)* *(~1 wk)*
5. **Condition verification** — the before/after capture UI, media upload, and
   the comparison job (start with a manual diff; add the AI vision pass later).
   *(~2 wks)*
6. **Messaging** — threads + realtime (Supabase Realtime or Pusher), read
   receipts via `ThreadParticipant.lastReadAt`. *(~1 wk)*
7. **Reviews, disputes, notifications, admin, analytics.** *(~2–3 wks)*

## Security checklist (before real users)

- [ ] All mutations behind Auth.js session + role checks
- [ ] Every input validated with Zod at the boundary (pattern shown in `booking-service`)
- [ ] Stripe webhook signature verification
- [ ] Rate limiting on auth, uploads, and messaging (e.g. Upstash)
- [ ] Signed, time-limited URLs for ID documents; encrypted at rest
- [ ] `AuditLog` written on every admin action
- [ ] GDPR: data export + delete, and a documented retention policy for KYC media

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add all `.env.example` variables in Project → Settings → Environment Variables.
3. Set the build command to `prisma generate && next build`.
4. Add a Vercel Postgres/Supabase/Neon database and run `prisma migrate deploy`.
5. Point Stripe webhooks at `https://your-domain/api/stripe/webhook`.

---

Seeded login for local dev: `maya@example.com` / `password123`.
