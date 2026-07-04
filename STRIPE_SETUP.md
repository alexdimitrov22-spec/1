# Revio — Domain & Stripe setup (do this yourself, starts free)

This is the checklist for the two things I can't do for you, because they're tied
to your money and identity: **buying a domain** and **creating your Stripe account**.
Everything here can start in **free test mode** — you'll see a (fake) payment
succeed before any real money exists. Budget about **20–30 minutes**.

The Stripe *code* is already written and waiting in this project. Your job is to
create the accounts and paste a few keys into one file. No coding.

---

## What you'll have at the end
- A web address (or a free temporary one to start).
- A Stripe account in **test mode**, connected to the app.
- A working **test rental payment** — held in escrow, deposit held separately,
  owner paid out, all with fake money.
- A clear switch to flip to **live** (real money) when you're ready.

## Before you start
You'll need: an email address, your phone, and — only when you go *live* later —
a bank account and a photo ID for Stripe's identity check. **None of that is
needed for test mode.**

---

## Part A — Get a domain (optional at first: ~£8–12/year)

You do **not** need a paid domain to test. When you deploy, the app gets a free
address like `revio.vercel.app` automatically. Buy a real domain only when you
want it to look professional. When you do:

1. Go to a registrar — **Cloudflare Registrar** (cheapest, at-cost) or
   **Namecheap** are both fine.
2. Search for your name. `revio.com` may be taken — good alternatives:
   `revio.co`, `revio.co.uk`, `getrevio.com`, `rentrevio.com`.
3. Buy it with a card. Turn **auto-renew ON** so you don't lose it.
4. That's it for now. You'll point it at your site in **Part G**.

> Tip: buy nothing here until the app is deployed and you've decided on the name.
> The free `.vercel.app` address is perfect for testing.

---

## Part B — Create your Stripe account (free, test mode)

1. Go to **stripe.com** and click **Sign up**. Use your business email.
2. Confirm your email and set a password.
3. When it asks about your business, you can fill in basics — but look for the
   **"Test mode"** / **"Sandbox"** toggle (top of the dashboard). Keep it **ON**.
   In test mode Stripe does **not** ask for your bank or ID yet.

You now have a free Stripe account. Nothing is charged, ever, in test mode.

---

## Part C — Copy your test keys into the app

1. In the Stripe dashboard (test mode ON), open **Developers → API keys**.
2. You'll see two keys:
   - **Publishable key** — starts with `pk_test_...`
   - **Secret key** — starts with `sk_test_...` (click "Reveal")
3. In the project, find the file **`.env.example`**, make a copy of it named
   **`.env`**, and paste your keys in:

   ```
   STRIPE_SECRET_KEY=sk_test_...paste here...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...paste here...
   PLATFORM_FEE_BPS=1000        # this is your 10% service fee (1000 = 10.00%)
   ```

   > **Your service fee lives here.** `1000` means you keep 10% of every rental.
   > Want 12%? Use `1200`. Want 15%? `1500`. That single number is your revenue.

4. Save the file. **Never** share the `sk_...` key or commit `.env` to GitHub.

---

## Part D — Turn on Connect (so lenders can be paid)

Your marketplace pays lenders, so Stripe needs "Connect" switched on:

1. In the dashboard, search **"Connect"** and click **Get started / Enable**.
2. Choose the **Express** account type when asked (least setup for your lenders).
3. That's all — the app's code already creates each lender's Express account and
   sends them to Stripe's own onboarding page.

---

## Part E — Run the app and make a TEST payment

1. Get the app running (either your own computer with the README steps, or ask a
   developer / Claude Code to deploy it). It connects to a free database.
2. On a listing, book some dates. At the card step, use Stripe's **test card**:

   ```
   Card number : 4242 4242 4242 4242
   Expiry      : any future date (e.g. 12 / 34)
   CVC         : any 3 digits (e.g. 123)
   Postcode    : any (e.g. SW1A 1AA)
   ```

3. Submit. In the Stripe dashboard → **Payments**, you'll see the rental charge
   **held**, and a separate **deposit hold** (uncaptured). No real money moved.
4. That's a full working rental. Congratulations — the plumbing works.

---

## Part F — Set up the webhook (tells the app when payment succeeds)

1. Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL:  `https://YOUR-SITE-ADDRESS/api/stripe/webhook`
   (use your `.vercel.app` address, or your real domain once it's pointed).
3. Select these events: `payment_intent.succeeded`,
   `payment_intent.amount_capturable_updated`, `payment_intent.payment_failed`,
   `account.updated`.
4. Save, then click the endpoint to reveal its **Signing secret** (`whsec_...`)
   and add it to `.env`:

   ```
   STRIPE_WEBHOOK_SECRET=whsec_...paste here...
   ```

---

## Part G — Go live (real money) — only when you're ready

1. In Stripe, complete **account activation**: your business/personal details, a
   **bank account** for payouts, and a **photo ID** (this is the legal KYC step —
   unavoidable for anyone taking real payments).
2. Flip the dashboard to **Live mode** and repeat **Part C** and **Part F** with
   the **live** keys (`sk_live_...`, `pk_live_...`, and a live `whsec_...`).
3. Point your domain (Part A) at your deployed site — your host (e.g. Vercel) has
   a one-screen "Add domain" step that tells you exactly what to change at your
   registrar.
4. Do one small **real** booking yourself to confirm, then open the doors.

---

## What it actually costs (recap)
- **Test mode:** £0. Forever.
- **Live card payment:** ~**1.5% + 20p** per UK card — taken out of the payment,
  never billed to you.
- **Identity check:** first **50 free**, then ~**£1.25** each. Only runs when
  someone actually verifies.
- **Your income:** the `PLATFORM_FEE_BPS` service fee on every rental.
- **Hosting/database:** free to start; a small (~£15–35/mo) tier once you're live,
  easily covered by your first handful of service fees.

You never pay Stripe a penny until a real rental happens — and when it does, your
fee and Stripe's fee both come out of that transaction, not your pocket.
