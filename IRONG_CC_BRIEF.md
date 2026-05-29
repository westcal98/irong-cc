# Iron G Command Center — Project Brief
**Repo:** github.com/westcal98/irong-cc
**Live:** irong-cc.westcal98.workers.dev
**Owner:** Frank Garza III — Iron G Equipment Co. LLC, Yukon, OK
**Stack:** Cloudflare Workers + KV, Vanilla JS PWA, IndexedDB + localStorage backup
**Deploy:** `wrangler deploy` from WSL (/mnt/c/Users/westc/GitProjects/irong-cc)

---

## Architecture

```
irong-cc/
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── sw.js
│   └── manifest.json
└── src/
    └── worker.js
```

---

## Worker Endpoints (current)

| Method | Path | Purpose |
|--------|------|---------|
| POST | /submit | Form submissions → Resend email + KV + push notification |
| GET | /notifications | List submissions (?handled=false filter) |
| POST | /notifications/handled | Mark submission handled |
| POST | /push/subscribe | Store push subscription |
| GET | /vapid-public-key | Returns VAPID public key |
| POST | /stripe/checkout-session | Create Stripe Checkout Session (replaces payment-link) |
| POST | /stripe/refund | Issue Stripe refund by paymentIntentId + amount |
| POST | /stripe/webhook | Stripe webhook handler (signature verified) |
| GET | /webhook/alerts | List webhook alerts (?handled=false filter) |
| POST | /webhook/alerts/handled | Mark webhook alert handled |
| GET | /booking/:bookingId/payment-intent | Retrieve stored paymentIntentId for booking |
| GET | /templates | List all message templates |
| GET | /templates/:id | Get single message template |
| POST | /templates/:id | Save/update message template |
| POST | /templates/reset/:id | Reset template to default |
| GET | /globalvars | Get business global variables |
| POST | /globalvars | Save business global variables |
| GET | /docs | List all document templates |
| GET | /docs/:id | Get single document template |
| POST | /docs/:id | Save/update document template |
| POST | /docs/reset/:id | Reset document to default |
| GET | /docs/booking/:bookingId/:docId | Get saved doc copy for booking |
| POST | /docs/booking/:bookingId/:docId | Save finalized doc copy to booking |
| GET | /docs/booking/:bookingId | List all saved docs for a booking |
| GET | /* | Serve public/ static files |

---

## KV Storage Keys

| Key Pattern | Purpose |
|-------------|---------|
| submission:{timestamp} | Website form submissions |
| pushsub:main | Push notification subscription |
| booking:{id}:paymentIntentId | Stripe Payment Intent ID per booking |
| booking:{id}:sessionCompleted | Checkout session completion record |
| booking:{id}:sessionExpired | Checkout session expiry record |
| booking:{id}:refundCreated | Refund record |
| booking:{id}:disputeClosed | Dispute resolution record |
| webhook:alert:{timestamp} | Stripe webhook alerts (disputes, failures, etc.) |
| template:{id} | Editable message templates |
| globalvars | Business global variables |
| doc:{id} | Document templates |
| doc:booking:{bookingId}:{docId} | Finalized doc copies per booking |
| trailer:{id}:lockboxCode | Current lockbox code per trailer |
| trailer:{id}:lockboxLog | Lockbox code change history per trailer |
| gateCode | Storage facility gate code |

---

## Wrangler Secrets & Vars

**Secrets:** RESEND_API_KEY, VAPID_PRIVATE_KEY, STRIPE_SECRET_KEY (live, rotated), STRIPE_WEBHOOK_SECRET
**Vars:** VAPID_PUBLIC_KEY

---

## Stripe Webhook

**Endpoint:** https://irong-cc.westcal98.workers.dev/stripe/webhook
**Subscribed events:**
- checkout.session.completed
- checkout.session.expired
- payment_intent.payment_failed
- payment_intent.succeeded
- refund.created
- refund.updated
- refund.failed
- charge.dispute.created
- charge.dispute.closed

---

## Booking Data Structure

```javascript
bk = {
  id,
  c: {
    fn, ln, ph, em, cy, vh, comm,
    contactPref   // 'sms' | 'email'
  },
  trailer, tid,         // 'utility' | 'hauler'
  sd, ed,               // start/end date strings
  startTime, endTime,   // HH:MM strings
  days,                 // decimal (e.g. 3.5)
  load,                 // what they're hauling (required)
  src,                  // how they heard about us (optional)
  rental,               // rental fee
  addOns,               // [{label, amount}]
  addOnsTotal,          // sum of addOns
  tax,                  // calculated tax
  taxRate,              // 0.0885
  dep,                  // deposit amount (editable)
  total,                // rental + addOnsTotal + tax + dep
  status,               // see status flow below
  lockboxCode,          // pre-populated from trailer at booking creation
  // Stripe fields
  checkoutSessionId,
  paymentLinkUrl,
  paymentIntentId,
  depositStatus,        // 'pending'|'held'|'captured'|'released'
  rentalPaid,
  depositHeld,
  docsVerified,
  packageSentAt,
  confirmedAt,
  reminderSentAt,
  returnedAt,
  actualReturnDate,
  actualReturnTime,
  additionalCharge,     // { label, amount }
  // Docs
  nt, at, breakdown, type
}
```

**Booking Status Flow:**
`docs_pending` → `payment_pending` → `confirmed` → `active` → `returned` → `complete` → `cancelled`

---

## Booking Flow (current)

**Step 1 — Customer Info**
- First name, last name, phone (required), email (required)
- Contact preference: Text / Email (required)
- City, tow vehicle (required), notes

**Step 2 — Rental Details**
- Trailer selection (required)
- Start date + time / End date + time (required, end time defaults to start time)
- Days auto-calculated from full datetime
- What are you hauling? (required)
- How did you hear about us? (optional)
- Add-ons: predefined checkboxes + custom add-on row
- Pricing: rental fee + add-ons + tax (8.85%) + deposit = total
- Deposit editable, defaults $200 utility / $250 hauler

**Step 3 — Send Package**
- Left: full booking summary read-only
- Right: outbound package preview with tokens populated
- Send via SMS or Email based on contact preference
- Send Package button → sets status=docs_pending, saves booking, navigates to Gate 0

**Gate 0 — Docs Verification**
- Tow vehicle editable (update if customer switches vehicles)
- Checklist: DL photo, insurance card, tow vehicle confirmed, quote accepted
- Docs Verified → status=payment_pending, unlocks Gate 1

**Gate 1 — Payment**
- Generate single Stripe Checkout Session (rental + add-ons + tax + deposit combined)
- Send link via SMS or Email
- Auto-polls for Payment Intent ID after payment confirmed
- Mark Payment Received → status=confirmed, unlocks Gate 2

**Gate 2 — Send Access Info**
- Shows gate code (from Settings) and lockbox code (from booking)
- Auto-generates confirmation message with all access details + return instructions
- Send via SMS or Email
- Mark Confirmed & Active → status=active

**Active Rental**
- Send Return Reminder button (highlighted on return date)
- Reminder message includes return time, photos/video requirements, late fee warning
- Mark Returned → opens Process Return flow

**Process Return**
- Section 1: confirm actual return date/time, early/late calculation, refund or charge options
- Section 2: return documentation checklist (4 photos + walk-around video)
- Section 3: deposit resolution (release/keep/split), Stripe refund execution
- Complete Return → status=complete, moves to done[]

---

## Drafts System

- Each in-progress booking saved as draft:{id} in IndexedDB
- Max 10 drafts
- Drafts page in menu shows all drafts as cards (name, trailer, date, last edited)
- Tap to resume, Discard button per draft
- Create Booking from Notification checks for existing draft with matching notificationId

---

## Pricing

| Period | Utility | Car Hauler |
|--------|---------|------------|
| Weekday (Mon–Thu) | $90/day | $100/day |
| Weekend (Fri–Sun) | $110/day | $120/day |
| Full Week | $580 | $640 |
| Deposit (default) | $200 | $250 |

**Tax rate:** 8.85% (Yukon, OK — 4.5% state + 0.35% Canadian County + 4% city)
Applied to rental fee + add-ons. Not applied to deposit.

**Add-ons (predefined):**
- Hitch Ball — $15
- Safety Chains — $10
- Trailer Jack — $10
- Ratchet Straps (set of 4) — $15
- Custom add-on: any label + amount

---

## Fleet — Lockbox Codes

- Each trailer card on Fleet page has a Lockbox Code section
- Displays current code in large digits
- Edit inline → Save logs change to trailer:{id}:lockboxLog (last 10 entries)
- View History toggle shows last 5 changes with timestamps
- Current code pre-populated to bk.lockboxCode when trailer selected in booking

---

## Message Templates (editable via Messaging page)

| ID | Label |
|----|-------|
| pre-booking-package | Pre-Booking Package |
| payment-link | Payment Link Message |
| gate2-confirmation | Confirmation & Access Info |
| return-reminder | Return Reminder |
| late-return | Late Return Notice |

All templates use {token} syntax. Token replacement via addTokens(body, data) in app.js.
Global vars (businessPhone, pickupAddress, gateCode, businessName) stored in KV, editable in Settings.

---

## Document Templates (editable via Docs page)

| ID | Label | Category |
|----|-------|---------|
| rental-agreement | Rental Agreement | customer |
| damage-report | Damage / Incident Report | customer |
| return-confirmation | Return Confirmation | customer |

- Generate for Booking: populates tokens from selected booking data
- Save Copy to Booking: stores finalized copy in KV tied to booking record
- Operational docs section: placeholder cards for insurance, LLC docs, registration

---

## Menu Structure

1. Dashboard
2. Drafts
3. Active Rentals
4. Fleet
5. Docs
6. Messaging
7. Notifications
8. Settings

---

## Design Tokens

| Token | Value |
|-------|-------|
| Background | #080808 |
| Dark | #0f0f0f |
| Panel | #161616 |
| Steel blue (accent) | #5B9EC9 |
| Silver | #A8B8C4 |
| Orange | #C4611A |
| Font | Oswald (headings) + system sans-serif |

Icons: IG in Oswald Bold — I white, G #5B9EC9 on #080808. `make-icons.py` in repo root.

---

## Claude Code Rules

```
IMPORTANT: Before making any changes, ensure existing
user data in IndexedDB is fully preserved. Follow the
safe initialization and migration pattern already
implemented. Do not reinitialize or reseed any data.
Do not refactor unrelated code.
Push to GitHub and run wrangler deploy when done.

When all tasks are complete and wrangler deploy has
finished, output:
✅ SESSION [NAME] COMPLETE — ready for next session.
```

- Sessions end with `/exit` not `/compact`
- Always split sessions by file scope — one session per file group
- Never read sw.js, manifest.json unless specifically required
- Default split: worker.js changes in one session, public/ changes in next

---

## Session Log

---

### Sessions 1–3 — Foundation
*Completed prior to formal brief*

- Migrated from single HTML file to 3-file PWA architecture
- IndexedDB primary storage, localStorage backup, safe load-first-seed-never init
- Versioned service worker, navigator.storage.persist()
- Full mobile-first redesign, pushState back-navigation for Android
- Dashboard stats, fleet management, 4-step booking workflow
- Gate 0–4 manual payment/release workflow
- Rental agreement generator, notifications page, push notifications
- SMS/copy helpers, print view, settings panel
- PWA installed on Frank's Android

---

### Session 4 — Stripe Integration & Booking Workflow Overhaul
*May 2026*

- Stripe worker endpoints: payment-link, deposit-intent, deposit-capture, deposit-cancel
- 7-stage booking status system
- Draft booking persistence (single draft key)
- Step tab navigation + Android back button fix
- Gate 0: pre-booking package SMS
- Gate 2: Stripe payment + deposit links
- Deposit release/capture on return with showToast()

---

### Session A — Website Form Alignment
*May 2026 — repo: westcal98/irongequipment*

- Email required
- Tow vehicle required
- Hauling field required
- End date replaces duration dropdown
- Start time + end time fields added
- Contact preference radio (Text/Email) added
- All fields map correctly to /submit POST payload

---

### Session B1 — Booking Steps 1 & 2 Rework
*May 2026*

- Both phone and email required in Step 1
- Contact preference pill toggle (Text/Email) added
- Tow vehicle required
- Start/end time fields in Step 2, end time defaults to start time
- Days calculated from full datetime
- Load/hauling field required
- Tax calculation at 8.85% (rental + add-ons only)
- Pricing breakdown: rental → add-ons → tax → deposit → total
- Add-ons section: predefined checkboxes + custom add-on row
- Deposit editable with live recalculation
- New booking data fields: contactPref, startTime, endTime, load, taxRate, tax, addOns, addOnsTotal

---

### Session B2 — Step 3 Send Package
*May 2026*

- Step 3 renamed from Review to Send Package
- Existing checklist removed
- Left side: full read-only booking summary with pricing breakdown and pickup location
- Right side: outbound package preview with token-populated message
- Copy + Open SMS/Email buttons based on contactPref
- Send Package button: sets status=docs_pending, saves booking, navigates to Gate 0
- Tow vehicle editable field added to Gate 0

---

### Session B3 — Fleet Lockbox Codes
*May 2026*

- Per-trailer lockbox code display on Fleet page (large monospace digits)
- Inline edit/save with change logging to IndexedDB
- Change log: last 10 entries stored, last 5 shown with timestamps
- bk.lockboxCode pre-populated from trailer's current code on booking creation

---

### Session C1 — Gates Restructure + Single Payment Link
*May 2026*

- Gate 0 renamed Docs Verification, checklist added (DL, insurance, tow vehicle, quote accepted)
- Gate 1 renamed Payment, single Stripe payment link replacing two-link flow
- Gate 1 payment amount = rental + add-ons + tax + deposit combined
- Gate 2 renamed Send Access Info, confirmation message with gate code + lockbox code
- Gate 2 return instructions include photo/video requirements
- Settings page: gate code field added
- Worker: /stripe/refund endpoint added
- Worker: /stripe/payment-link updated with metadata (bookingId, rentalAmount, depositAmount)

---

### Session C2 — Return Reminder + Process Return Flow
*May 2026*

- Return reminder button on active rental cards (highlighted on return date)
- Reminder message includes return time, photo/video requirements, late fee warning
- bk.reminderSentAt logged on send
- Process Return page: 3-section flow
  * Section 1: actual return datetime, early/late calculation, refund/charge options
  * Section 2: return documentation checklist (4 photos + video, damage toggle)
  * Section 3: deposit resolution (release/keep/split), Stripe refund execution
- Stripe refund calls /stripe/refund with paymentIntentId
- Manual Payment Intent ID fallback field added to Gate 1

---

### Session C3a — Worker: Checkout Sessions + Webhook Handler
*May 2026*

- /stripe/payment-link removed
- /stripe/checkout-session added (line items: rental, add-ons itemized, tax, deposit)
- /stripe/webhook added with HMAC-SHA256 signature verification via Web Crypto API
- Webhook handlers: checkout.session.completed, checkout.session.expired,
  payment_intent.payment_failed, payment_intent.succeeded, refund.created,
  refund.updated, refund.failed, charge.dispute.created, charge.dispute.closed
- /webhook/alerts GET + POST /webhook/alerts/handled endpoints
- /booking/:bookingId/payment-intent endpoint

---

### Session C3b — App: Checkout Session Integration + Webhook Alerts UI
*May 2026*

- Gate 1 swapped to /stripe/checkout-session
- Auto-polls /booking/[id]/payment-intent after payment confirmed (3s interval, 5 attempts)
- Manual Payment Intent ID fallback if polling fails
- Notifications page shows webhook alerts (urgent red, non-urgent yellow)
- Dispute alerts show Open Stripe Dashboard button
- URL param handling: ?payment=success and ?payment=cancelled on app load

---

### Session D1 — Worker: Message Template Storage
*May 2026*

- /templates CRUD endpoints (GET list, GET by id, POST save, POST reset)
- Default template bodies stored in DEFAULTS object for 5 templates:
  pre-booking-package, payment-link, gate2-confirmation, return-reminder, late-return
- /globalvars GET + POST endpoints
- Global vars: businessPhone, pickupAddress, gateCode, businessName

---

### Session D2 — App: Messaging Templates Page
*May 2026*

- Messaging page added to menu
- Token reference card (collapsible, all available tokens listed)
- 5 template cards with textarea edit, Save, Reset to Default
- addTokens(templateBody, data) global helper function
- All existing hardcoded message strings replaced with template + token system
- globalVars fetched on app load, used in all token replacements
- Settings page: Business Settings section (name, phone, address, gate code)

---

### Session E1 — Worker: Document Template Storage
*May 2026*

- /docs CRUD endpoints (GET list, GET by id, POST save, POST reset)
- /docs/booking/:bookingId/:docId GET + POST (finalized copies per booking)
- /docs/booking/:bookingId GET (list all saved docs for a booking)
- DOC_DEFAULTS object with 3 full document templates:
  rental-agreement, damage-report, return-confirmation

---

### Session E2 — App: Docs Page
*May 2026*

- Docs page added to menu (between Fleet and Messaging)
- Customer documents section: Rental Agreement, Damage Report, Return Confirmation
- Each card: Edit Template (textarea + save + reset), Generate for Booking
- Generate for Booking: booking selector → token replacement → preview panel
- Preview: Copy, Send via SMS/Email, Save Copy to Booking buttons
- Operational docs section: placeholder cards
- Booking record: Documents collapsible section showing saved doc copies
- Final menu order locked: Dashboard, Drafts, Active Rentals, Fleet, Docs, Messaging, Notifications, Settings
- addTokens() extended with doc-specific tokens: date, lastName, email, city, actualReturnDate, actualReturnTime, bookingId

---

## Open Items

**Pre-Launch (immediate):**
- [ ] End-to-end testing with simulated customer
- [ ] Set gate code in Settings
- [ ] Set lockbox codes on Fleet page
- [ ] Configure Business Settings in Settings (name, phone, address)
- [ ] Test Stripe checkout flow with test card 4242 4242 4242 4242
- [ ] Verify webhook events firing correctly in Stripe dashboard
- [ ] Call Custom Trailer Sales — RTO terms on Load Trail CZ $6,695 (405-427-3036)
- [ ] Reserve Mother Road storage space (405-577-6617, ~$75/mo)
- [ ] Complete MBA Insurance quote (needs trailer VIN)
- [ ] Oklahoma sales tax permit — oktap.gov
- [ ] Open Chase business checking account

**Pending:**
- [ ] Automated return reminder via Cloudflare Cron Trigger (currently manual)
- [ ] Twilio integration for automated SMS (currently copy/open SMS)
- [ ] HelloSign/DocuSign for e-signature on rental agreement
- [ ] Update irongequipment.com copy — contactless as option not default
- [ ] Transparent background logo PNG
- [ ] Personal credit repair (separate chat)
- [ ] Business credit building (separate chat)

**Phase 2:**
- [ ] Second trailer purchase (~6 months post-launch)
- [ ] Half-ton truck (unlocks tandem trailers)
- [ ] Fleet expansion: DOF + deckover tilt + enclosed
- [ ] BigRentz / Fluid Market platform listings
- [ ] Customer portal on irongequipment.com
- [ ] USDA barndominium construction loan (2027 target)
