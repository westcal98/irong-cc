# Iron G Equipment Co. LLC — Chat Handoff Document V2
### Paste the PROMPT BLOCK at the bottom into a new Claude conversation.

---

## CURRENT STATUS (June 6, 2026)

- No trailers purchased yet — calling Custom Trailer Sales for RTO terms
- Traverse back from dealer (transmission replaced)
- No live rentals — all CC records are test data
- Website live at irongequipment.com
- Command Center live at irong-cc.westcal98.workers.dev
- Google Workspace Standard active — frank@irongequipment.com live
- info@ and rent@ set up as Workspace aliases
- Google Business Profile live and verified (Yukon, OK)
- Google Cloud project: "Iron G Equipment" at console.cloud.google.com
  * Drive API enabled, OAuth credentials created
  * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET stored as wrangler secrets
  * Redirect URI: https://irong-cc.westcal98.workers.dev/auth/callback
  * Google Drive connected and authenticated to frank@irongequipment.com
- Sales tax permit obtained — Canadian County, monthly filing by 20th, rate 8.85%
- Oklahoma sales tax rate: 8.85% (4.5% state + 0.35% Canadian County + 4% Yukon city)

---

## BUSINESS IDENTITY

- **Legal Name:** Iron G Equipment Co. LLC
- **Filed:** March 16, 2026 — Oklahoma
- **Owner:** Frank Garza III — Yukon, OK
- **EIN:** On file
- **Registered Agent:** Northwest Registered Agent (NWRA)
- **Phone:** (405) 393-4161 — Corporate Phone app (com.corporatetools.phoneservice)
- **Domain:** irongequipment.com
- **Emails:**
  - frank@irongequipment.com — Google Workspace Standard (native Gmail)
  - info@irongequipment.com — Workspace alias → frank@
  - rent@irongequipment.com — Workspace alias → frank@
- **Payment:** Stripe live mode (STRIPE_SECRET_KEY stored as wrangler secret)
- **Email service:** Resend (irongequipment.com domain verified, RESEND_API_KEY wrangler secret)

---

## FLEET PLAN

**Launch trailer (not yet purchased):**
- 2026 Load Trail CH 20x102 Tandem Axle 10K Car Hauler
- Custom Trailer Sales OKC — 8005 NE 23rd — (405) 427-3036
- Price: $5,795 special (stock #373854)
- Financing: RTO through Hometowne Capital via Custom Trailer Sales
- Est. terms: ~$1,000 down, ~$335/month

**Accessories needed before first rental:**
- Winch (Badland 2500lb) + professional installation (RCB Welding 405-888-0488)
- 2 5/16" ball mount for Traverse 2" receiver (J&I Hitch OKC 405-681-0330)
- 10-ply tire upgrade
- Coupler lock + combo lockbox
- Ratchet straps x4
- GPS tracker (Bouncie $30 + $8/mo)
- Tongue box
- Decals/signage (Stickermule or local sign shop)

**Storage:** Mother Road RV Boat & Trailer Storage — 16245 W HWY 66, Yukon (405-577-6617, ~$75/mo) — not yet reserved

**Phase 2 targets:**
1. MP Customs 20x83 Tandem 7K utility — $3,595 cash
2. Enclosed 16-20ft (highest revenue per day, unmet local demand)
3. Dump trailer 14K (zero independent competition in Yukon)

---

## PRICING

| Period | Utility | Car Hauler |
|--------|---------|------------|
| Weekday (Mon–Thu) | $90/day | $100/day |
| Weekend (Fri–Sun) | $110/day | $120/day |
| Full Week | $580 | $640 |
| Deposit (default) | $200 | $250 |

**Tax rate:** 8.85% Yukon OK — applied to rental fee + add-ons, not deposit.

---

## TECH INFRASTRUCTURE

### irongequipment.com (Website)
- **Host:** Cloudflare Pages (auto-deploy from GitHub push to main)
- **Repo:** github.com/westcal98/irongequipment
- **Local:** C:\Users\westc\GitProjects\irongequipment
- **WSL path:** /mnt/c/Users/westc/GitProjects/irongequipment
- **Deploy:** git push → Cloudflare auto-deploys ~60 seconds
- **Cache fix:** _headers file sets Cache-Control: no-cache on styles.css, app.js, index.html

**Current features:**
- Full marketing landing page
- Reserve form POSTs JSON to irong-cc Worker /submit endpoint
- Availability calendar in booking form (fetches from CC worker)
- PWA manifest, service worker, installable
- SEO: title, meta description, alt text, serving areas

**Design tokens:**
- Background: #080808 | Nav: rgba(8,8,8,0.95)
- Steel blue: #5B9EC9 | Silver: #A8B8C4 | Orange: #C4611A
- Font: Oswald (headings) + Barlow (body)

**Hero section (current state):**
- Nav bar: "IRON G" (silver #A8B8C4) + "EQUIPMENT" (steel blue #5B9EC9) — Oswald Bold
- Hero: Large logo image left + "IRON G EQUIPMENT" one line right
  - "IRON G" in silver (#A8B8C4), "EQUIPMENT" in steel blue (#5B9EC9)
  - Font: Oswald Bold, clamp(28px, 5.5vw, 88px)
  - Desktop: side by side, vertically centered
  - Mobile: stacked, logo above, text below centered, white-space:normal wraps text
- Tagline line 1: "Contactless Trailer Rentals — 7AM to 10PM, 7 Days a Week."
- Tagline line 2: "Book Online. Pick Up. Drop Off. Done."

**Form fields (Session A):**
- Email required, tow vehicle required, hauling required
- End date + start/end time fields
- Contact preference (Text/Email)
- All fields map to /submit POST payload

---

### irong-cc.westcal98.workers.dev (Command Center)
- **Host:** Cloudflare Workers
- **Repo:** github.com/westcal98/irong-cc
- **Local:** C:\Users\westc\GitProjects\irong-cc
- **WSL path:** /mnt/c/Users/westc/GitProjects/irong-cc
- **Deploy:** `wrangler deploy` from WSL (manual)
- **Start CC session:** `claude --dangerously-skip-permissions`

**Wrangler secrets:**
- RESEND_API_KEY, VAPID_PRIVATE_KEY, STRIPE_SECRET_KEY (live, rotated)
- STRIPE_WEBHOOK_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

**Wrangler vars:** VAPID_PUBLIC_KEY

**KV Namespace:** IRONG_KV (ID: 0a20708bb3334ce2b737b50e6e5ac0f0)

---

## COMMAND CENTER — FULL FEATURE LIST

### Menu Structure (current)
1. Dashboard
2. Drafts
3. Active Rentals
4. Fleet
5. Maintenance
6. Expenses
7. Financials
8. Business Info
9. Docs
10. Messaging
11. Notifications
12. Settings

### Booking Flow
**Step 1 — Customer Info:** name, phone (required), email (required), contact preference Text/Email, city, tow vehicle (required), notes

**Step 2 — Rental Details:** trailer, start/end date+time, days auto-calculated, hauling (required), source (optional), add-ons with tax, deposit editable, pricing breakdown

**Step 3 — Send Package:** booking summary + outbound message preview, Copy/Open SMS/Open Corporate Phone buttons, Send Package → status=docs_pending

**Gate 0 — Docs Verification:** tow vehicle editable, 4-item checklist, Docs Verified → payment_pending

**Gate 1 — Payment:** single Stripe Checkout Session (rental+addons+tax+deposit), auto-polls for Payment Intent ID, Mark Payment Received → confirmed

**Gate 2 — Send Access Info:** gate code + lockbox code in confirmation message, Mark Confirmed & Active → active

**Active Rental:** Send Return Reminder button, Process Return flow (3 sections)

**7-Stage Status:** docs_pending → payment_pending → confirmed → active → returned → complete → cancelled

### Drafts System
- Per-booking draft:{id} in IndexedDB, max 10
- Drafts page in menu, tap to resume, discard button

### Fleet Page
- Editable trailer names (stored as trailer:{id}:name)
- Lockbox code per trailer with change log
- Availability calendar (2 months)

### Maintenance Log
- Per-trailer records in KV and IndexedDB
- Receipt scanning via Claude vision API
- Google Drive auto-sync (one CSV per trailer)
- Analytics: total cost, monthly breakdown, cost per rental
- Service reminders on Dashboard
- CSV export + print export

### Expenses & Mileage
- Full expense tracking with categories and receipt scanning
- Mileage log with IRS deduction calculation ($0.70/mile)
- Google Drive sync

### Financials Page
- Revenue vs expenses P&L summary
- Tax liability tracker (monthly, due by 20th)
- Sales tax reminder on Dashboard when within 10 days of 20th
- Monthly breakdown table + CSV export

### Business Info Page
- All business details: EIN, registered agent, contact, licenses, banking, insurance
- Insurance renewal reminder on Dashboard
- Google Drive backup
- Text file export

### Messaging Templates
- 5 editable templates with {token} syntax
- addTokens() global helper
- Global vars: businessPhone, pickupAddress, gateCode, businessName

### Document Templates
- 3 customer docs: rental-agreement, damage-report, return-confirmation
- Generate for Booking with token replacement
- Save copies per booking in KV

### Availability System
- GET /availability/:trailerId, /availability, /availability/next/:trailerId
- Fleet page calendar, conflict detection in Step 2
- Availability calendar on website booking form

### Stripe Integration
- Checkout Sessions (not Payment Links)
- Single payment: rental + add-ons + tax + deposit combined
- Webhook handler with full event handling
- Refund endpoint for deposit release/capture

### Google Drive
- OAuth connected to frank@irongequipment.com
- Maintenance logs auto-sync per trailer
- Expense logs sync
- Business info backup
- Connect/disconnect in Settings

---

## WORKER ENDPOINTS (complete)

All previous endpoints plus:
- POST /expenses, GET /expenses, PUT /expenses/:id, DELETE /expenses/:id
- GET /expenses/summary, GET /expenses/export
- POST /mileage, GET /mileage, DELETE /mileage/:id, GET /mileage/summary
- GET /revenue/summary, GET /tax/liability
- GET /businessinfo, POST /businessinfo, GET /businessinfo/export
- GET /maintenance/:trailerId, POST /maintenance/:trailerId
- PUT /maintenance/:trailerId/:recordId, DELETE /maintenance/:trailerId/:recordId
- GET /maintenance/summary/all, GET /maintenance/export/:trailerId
- GET /maintenance/all, POST /maintenance/scan-receipt
- GET /trailers, POST /trailers/:id/name
- GET /auth/google, GET /auth/callback, GET /auth/google/status
- POST /auth/google/disconnect

---

## SESSION LOG SUMMARY

**Sessions 1–4:** Foundation, Stripe integration, 7-stage booking status, draft persistence, step navigation

**Session A:** Website form alignment — required fields, end date, times, contact preference

**Sessions B1-B3:** Booking flow rework — Steps 1/2/3, Send Package, Fleet lockbox codes

**Sessions C1-C3:** Gates restructure, single Stripe payment link → Checkout Sessions, webhook handler, Process Return flow

**Sessions D1-D2:** Messaging templates with token system, global vars, Settings

**Sessions E1-E2:** Docs page, document templates, generate for booking

**Sessions F1-F2:** Corporate Phone button, duplicate fields fix

**Sessions G1-G3:** Availability system (worker + CC + website calendar)

**Sessions H1-H2:** Maintenance log — worker endpoints, OAuth/Drive setup, UI, receipt scanner, analytics, export

**Sessions I1-I2:** Business expenses, mileage log, financials/P&L, tax liability, business info page

**Sessions SITE-1 through SITE-9 (ongoing):** Website hero section redesign
- Nav wordmark: IRON G (silver) EQUIPMENT (steel blue)
- Hero: logo + "IRON G EQUIPMENT" one line, logo left, text right
- Cache fix via _headers file
- Mobile: stacked layout, text wraps with white-space:normal

---

## OPEN ACTION ITEMS

**Immediate:**
- [ ] Complete hero section mobile fix (Session SITE-9 running)
- [ ] Call Custom Trailer Sales — RTO terms on Load Trail CH $5,795 (405-427-3036)
- [ ] Get 2 5/16" ball mount — J&I Hitch OKC (405-681-0330)
- [ ] Reserve Mother Road storage (405-577-6617)
- [ ] Complete MBA Insurance quote (needs trailer VIN)
- [ ] Open Chase business checking account
- [ ] Contact RCB Welding for winch mount (405-888-0488)

**CC Testing:**
- [ ] End-to-end test with simulated customer (Marcus Webb)
- [ ] Set gate code in Settings
- [ ] Set lockbox codes on Fleet page
- [ ] Configure Business Settings
- [ ] Test Stripe checkout with test card 4242 4242 4242 4242
- [ ] Verify webhook events in Stripe dashboard
- [ ] Test Google Drive sync for maintenance and expenses

**Pending:**
- [ ] Automated return reminder via Cloudflare Cron Trigger
- [ ] Twilio for automated SMS
- [ ] Google Workspace eSignature for rental agreement
- [ ] Facebook business page
- [ ] Personal credit repair (separate chat)
- [ ] Business credit building (separate chat)

**Phase 2:**
- [ ] Second trailer purchase
- [ ] Half-ton HD truck
- [ ] BigRentz / Fluid Market listings
- [ ] Customer portal on irongequipment.com
- [ ] Cloudflare R2 for receipt image storage
- [ ] USDA barndominium construction loan (2027 target)

---

## CLAUDE CODE RULES

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

- Start CC sessions: `claude --dangerously-skip-permissions`
- Always split sessions by file scope
- worker.js changes in one session, public/ changes in next
- Never read sw.js or manifest.json unless specifically required
- Sessions end with `/exit`
- irongequipment repo: git push only (Cloudflare Pages auto-deploys)
- irong-cc repo: wrangler deploy required

---

## WSL TOOLCHAIN

- Node.js, Claude Code CLI, GitHub CLI, Wrangler
- Project root: /mnt/c/Users/westc/GitProjects/
- irong-cc: /mnt/c/Users/westc/GitProjects/irong-cc
- irongequipment: /mnt/c/Users/westc/GitProjects/irongequipment

---

# PASTE THIS INTO A NEW CLAUDE CHAT TO CONTINUE

```
Hi Claude. I'm Frank, owner of Iron G Equipment Co. LLC
in Yukon, Oklahoma — a trailer rental startup. I have a
master handoff document covering everything we've built
so far. Please read it carefully and acknowledge you're
up to speed before we continue.

I'm attaching: IronG_Chat_Handoff_V2.md

Key things to know right now:
- Google Workspace Standard live (frank@irongequipment.com)
- Google Drive connected to frank@irongequipment.com
- Sales tax permit obtained, 8.85% rate, monthly filing by 20th
- CC is fully built through Session I2 and SITE-9
- Website hero section is being finalized (SITE-9 in progress)
- No trailers purchased yet — still pre-launch
- All CC booking records are test data

Once you've read the context doc, confirm you're ready
and we'll continue from where we left off.
```
