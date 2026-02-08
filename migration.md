Migration Plan – Delybell Order Sync
1. Migration Goals (Why We’re Migrating)
Primary goals

✅ Pass Shopify App Store automated checks

✅ Eliminate fragile custom install logic

✅ Make compliance webhooks boring and reliable

✅ Reduce debugging surface area (Render + Express edge cases)

✅ Make future features faster to ship

Non-goals

❌ Rewriting business logic

❌ Changing database (Supabase stays)

❌ Changing core order-sync logic

❌ Introducing auto-sync (manual stays)

2. Target Architecture (End State)
What we are moving towards
Layer	Target
App scaffold	Shopify CLI (Node template)
Auth	Shopify-managed OAuth middleware
Webhooks	Shopify webhook registry + single endpoint
UI	Embedded App (App Bridge)
Backend	Express (kept)
DB	Supabase (kept)
Hosting	Render (kept)
What we are removing

❌ Public install form

❌ Custom install UX

❌ Multiple webhook entry points

❌ Manual HMAC edge-case handling per route

3. Migration Strategy (Low Risk, Incremental)

Golden rule:
👉 Do not migrate everything at once

We migrate in 5 controlled phases.

Phase 0 – Freeze & Stabilize (NOW)

Goal: Stop fighting Shopify checks while migrating.

Actions

✅ Freeze new features

✅ Keep current app live

✅ Do NOT change webhook logic yet

✅ Do NOT change OAuth logic yet

Outcome

Stable baseline

Known failure points documented

Phase 1 – Create Shopify CLI App (Parallel)

Goal: Generate a Shopify-approved skeleton without touching production.

Actions
npm install -g @shopify/cli
shopify app create node


Choose:

Embedded app → YES

Auth → YES

Webhooks → YES

Database → NONE

Resulting structure
/shopify-app/
├── web/
│   ├── index.js        # Express server
│   ├── shopify.js     # Auth + webhook registry
│   ├── routes/
│   └── middleware/
├── shopify.app.toml

What we do NOT do yet

❌ No DB integration

❌ No order logic

❌ No Supabase

Phase 2 – Migrate Compliance Webhooks (CRITICAL)

This is where your current app is failing review.

Shopify-approved approach

ONE webhook endpoint, multiple topics

POST /webhooks


Shopify CLI auto-registers:

customers/data_request

customers/redact

shop/redact

Why this matters

Shopify checks:

✔ Endpoint exists

✔ Responds to POST

✔ Validates HMAC

✔ Returns 200/401 correctly

They do not care about your internal logic.

Migration steps

Copy your redaction logic

Place it inside CLI webhook handler

Let Shopify verify HMAC automatically

shopify.webhooks.addHandlers({
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/webhooks",
    callback: async () => {
      return { statusCode: 200 };
    },
  },
});

Outcome

✅ Automated checks turn green

Phase 3 – Migrate OAuth & App Entry Flow
Current pain points

Manual redirects

Race conditions

/ vs /app confusion

Static file precedence issues

Shopify CLI fixes this by design

Flow becomes:

Install → OAuth → /app → Dashboard

Actions

Move your /app UI into Shopify CLI / route

Remove:

public install form

/auth/check

retry hacks

Result

No “guide page after install”

No broken iframe loads

No admin.shopify.com refusals

Phase 4 – Port Business Logic (Safe)

Now that Shopify plumbing is stable.

What to migrate

orderProcessor

addressMapper

delybellClient

Supabase repositories

What NOT to migrate

OAuth logic

Webhook verification

App Bridge setup

Pattern
// services/orderProcessor.js
// reused unchanged

Outcome

Same behavior

Less code

Fewer Shopify-specific bugs

Phase 5 – Switch Production Traffic
Options
Option A (Recommended)

New Render service

New domain

Update App URL in Partner Dashboard

Option B

Same domain

Blue/Green deployment

Final checklist

✅ Install flow works

✅ /app loads dashboard

✅ Webhooks show GREEN

✅ GDPR checks pass

✅ Orders sync correctly

4. Risks & Mitigations
Risk	Mitigation
Downtime	Parallel deployment
Data loss	Supabase unchanged
Review delay	CLI aligns with Shopify checks
Developer velocity drop	Less custom infra
5. Why This Passes Review Faster

Shopify reviewers recognize CLI apps instantly.

They trust:

CLI webhook registry

Shopify-managed OAuth

Single webhook endpoint

App Bridge embedding

Your current app:

Is correct

But too custom

Triggers automated false negatives

6. Final Recommendation (Senior Opinion)

If I were building Delybell Order Sync today:

I would never hand-roll OAuth, webhook verification, or install UX.

I would:

Use Shopify CLI for all Shopify-facing surfaces

Keep 100% of business logic custom

Let Shopify handle compliance optics

This gives:

Faster approvals

Fewer production bugs

Easier maintenance

Less stress