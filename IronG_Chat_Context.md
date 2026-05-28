# Iron G Equipment Co. LLC — Chat Continuation Context
### Use this file to start a new Claude chat right where we left off.
### Paste the PROMPT BLOCK at the bottom into a new Claude conversation.

---

## CURRENT STATUS (May 2026)

- No trailers purchased yet
- Traverse at dealer (transmission replacement) — not yet returned
- No live rentals — all Command Center records are test data
- Session 4 Claude Code prompt is currently running
- Website live at irongequipment.com
- Command Center live at irong-cc.westcal98.workers.dev

---

## BUSINESS IDENTITY

- **Legal Name:** Iron G Equipment Co. LLC
- **Filed:** March 16, 2026 — Oklahoma
- **Owner:** Frank Garza III — Yukon, OK
- **EIN:** On file
- **Registered Agent:** Northwest Registered Agent (NWRA)
- **Phone:** (405) 393-4161 — Corporate Phone app (NWRA VoIP)
- **Domain:** irongequipment.com
- **Emails:**
  - info@irongequipment.com — general inquiries
  - rent@irongequipment.com — active rental requests
  - frank@irongequipment.com — vendor/B2B
  - All forward to personal Gmail with Send As configured
- **Bank:** Chase business checking (recommended, not confirmed opened)
- **Payment:** Stripe live mode (sk_live_ key stored as wrangler secret STRIPE_SECRET_KEY — was rotated for security)
- **Email service:** Resend (irongequipment.com domain verified, RESEND_API_KEY stored as wrangler secret)

---

## FLEET PLAN

**Launch trailer (not yet purchased):**
- Load Trail CZ 20x83 Steel Floor Car Hauler 10K
- Custom Trailer Sales OKC — 8005 NE 23rd — (405) 427-3036
- Price: $6,695 (stock #003892)
- Features: steel floor, aluminum trim, recessed D-rings, side steps, tongue box, spare tire mount
- Needs: winch (~$200-250), tire upgrade to 10-ply
- Financing: Hometowne Capital RTO through Custom Trailer Sales

**Phase 2 targets (per Juan Galaviz / DFW Trailer Rentals):**
1. 20' Drive-Over Fender 10K (buggy hauler)
2. 22' Deckover Tilt 14K
3. 16' Enclosed

**Preferred brands:** Iron Bull, Diamond C (rental-grade). Load Trail acceptable.

---

## PRICING

| Period | Utility | Car Hauler |
|--------|---------|------------|
| Weekday (Mon–Thu) | $90/day | $100/day |
| Weekend (Fri–Sun) | $110/day | $120/day |
| Full Week | $580 | $640 |
| Deposit (hold) | $200 | $250 |

Deposits = Stripe authorization holds (manual capture). Released clean return, captured on damage.

---

## STORAGE

- **Mother Road RV Boat & Trailer Storage** — 16245 W HWY 66, Yukon
- (405) 577-6617 | ~$75/mo | 24/7 access
- Gate: personalized code per tenant (no guest temp codes)
- Gate code shared with confirmed renters — coupler lock is real security layer
- **Status: space not reserved yet**

---

## TECH INFRASTRUCTURE

### irongequipment.com (Website)
- **Host:** Cloudflare Pages (auto-deploy from GitHub push to main)
- **Repo:** github.com/westcal98/irongequipment
- **Local:** C:\Users\westc\GitProjects\irongequipment
- **WSL path:** /mnt/c/Users/westc/GitProjects/irongequipment
- **Structure:** 3-file PWA — index.html, styles.css, app.js
- **Also:** sw.js, manifest.json, _headers, README.md
- **Deploy:** git push → Cloudflare auto-deploys ~60 seconds

**Design tokens:**
- Background: #080808 | Dark: #0f0f0f | Panel: #161616
- Steel blue: #5B9EC9 | Silver: #A8B8C4 | Orange: #C4611A
- Font: Oswald (headings) + system sans-serif

**Current features:**
- Full marketing landing page — all sections centered
- Reserve form POSTs JSON to irong-cc Worker /submit endpoint
- Form routing: specific trailer → "rental" type → rent@
- "Not sure" selection → "info" type → info@
- Duplicate submission guard on submit button
- Pricing: two side-by-side cards (no horizontal scroll)
- Footer: Contact (left) | Logo+text (center) | Quick Links (right)
- PWA manifest, service worker (network-first), installable

---

### irong-cc.westcal98.workers.dev (Command Center)
- **Host:** Cloudflare Workers
- **Repo:** github.com/westcal98/irong-cc
- **Local:** C:\Users\westc\GitProjects\irong-cc
- **WSL path:** /mnt/c/Users/westc/GitProjects/irong-cc
- **Deploy:** `wrangler deploy` from WSL (manual, not auto)
- **Structure:** public/ (index.html, styles.css, app.js, sw.js, manifest.json) + src/worker.js

**Worker endpoints:**
- POST /submit — form submissions → Resend email + KV storage + push notification
- GET /notifications — list submissions (?handled=false supported)
- POST /notifications/handled — mark as handled
- POST /push/subscribe — store push subscription
- GET /vapid-public-key — returns VAPID public key
- Fallback → serves public/ static files

**KV Namespace:**
- Binding: IRONG_KV | ID: 0a20708bb3334ce2b737b50e6e5ac0f0
- Keys: submission:{timestamp}, pushsub:main

**Wrangler secrets:**
- RESEND_API_KEY — Resend email sending
- VAPID_PRIVATE_KEY — Web push notifications
- STRIPE_SECRET_KEY — Stripe API (live, rotated key)

**Wrangler vars:**
- VAPID_PUBLIC_KEY

**Current app features:**
- Dashboard (available/active/revenue/total stats)
- Fleet management
- 4-step booking workflow (customer → details → review → gates)
- Gate 0-4 payment/release workflow (manual, no Stripe yet — Session 4 adding this)
- Rental agreement generator
- Notifications page — bell icon, badge, RENTAL/INFO cards, mark handled
- Create Booking from notification (pre-populates all fields)
- Push notifications to Frank's phone
- SMS/copy helpers, print view, settings panel
- IndexedDB + localStorage backup, load-first-seed-never init
- pushState back navigation (page level)
- PWA installed on Frank's Android

**Booking data structure:**
```javascript
bk = {
  id,
  c: { fn, ln, ph, em, cy, vh, comm },
  trailer, tid,        // 'utility' | 'hauler'
  sd, ed, days,
  rental, dep, total, grand,
  combo, load, src,
  status,              // currently: 'active' | 'returned' only
  nt, at, breakdown, type
}
```

**Booking form field IDs:**
- Step 1: f-fn, f-ln, f-ph, f-em, f-cy, f-vh, commToggle
- Step 2: f-tr, f-sd, f-ed, f-ld, f-src, f-nt
- Step 3: chk1, chk2, chk3, newCombo
- Step 4: Gate 0-4 workflow

**Hardcoded deposits:** utility $200, hauler $250 (from defaultState())

**Icons:** IG in Oswald Bold — I white, G #5B9EC9 on #080808. make-icons.py in repo root.

---

## SESSION 4 — IN PROGRESS

Session 4 Claude Code prompt was started. It covers:

1. **Stripe Worker endpoints:**
   - POST /stripe/payment-link — rental fee Payment Link
   - POST /stripe/deposit-intent — deposit authorization hold (Checkout Session, capture_method: manual)
   - POST /stripe/deposit-capture — capture deposit on damage
   - POST /stripe/deposit-cancel — release deposit hold on clean return

2. **8-stage booking status system:**
   - docs_pending → payment_pending → confirmed → active → returned → complete → cancelled

3. **New booking fields:**
   - paymentLinkUrl, paymentLinkId, depositIntentId, depositSessionId
   - depositStatus ('pending'|'held'|'captured'|'released')
   - rentalPaid, depositHeld, docsVerified, packageSentAt, confirmedAt

4. **Draft booking persistence:**
   - Saves to IndexedDB key 'bookingDraft' at every goStep()
   - Restores on new-booking page load if < 24 hours old
   - Resume / Start Fresh prompt

5. **Step tab navigation:**
   - #fs1-#fs4 tappable to go back to completed steps
   - Cannot skip forward

6. **Android back button fix in booking flow:**
   - goStep() pushes history states
   - popstate handler navigates steps not pages

7. **Pre-booking package message (Gate 0):**
   - Generated SMS with booking summary + 3-item checklist
   - Copy + Open SMS buttons
   - Sets status = 'docs_pending' on send

8. **Stripe payment links in Gate 2:**
   - Generate rental fee Payment Link button
   - Generate deposit hold Checkout Session button
   - Both generate URLs to text to customer
   - Mark Payment Received unlocks after both generated

9. **Deposit release/capture on return:**
   - Release Deposit button → /stripe/deposit-cancel
   - Capture Deposit button → /stripe/deposit-capture
   - Both with confirmation dialogs
   - Moves booking to done[] on completion

---

## ALL REPOS

| Repo | Purpose | Deploy |
|------|---------|--------|
| westcal98/irongequipment | Website | Cloudflare Pages auto |
| westcal98/irong-cc | Command Center | wrangler deploy |
| westcal98/frankskitchen | Recipe PWA | wrangler deploy |
| westcal98/lingua | Language learning PWA | wrangler deploy |

---

## WSL TOOLCHAIN

- Node.js, Claude Code CLI, RTK (global hook mode)
- GitHub CLI (gh), Wrangler 4.90.1 (update to 4.95.0 pending)
- Cloudflare skills installed for Claude Code
- frontend-design plugin: `/plugin install frontend-design@claude-plugins-official`
- Project root: /mnt/c/Users/westc/GitProjects/

---

## OPEN ACTION ITEMS

**Immediate:**
- [ ] Session 4 completion — check output and test
- [ ] Call Custom Trailer Sales — RTO terms on Load Trail CZ $6,695
- [ ] Get Traverse back — confirm hitch class, wiring, ball size
- [ ] Reserve Mother Road storage space
- [ ] Complete MBA Insurance quote (needs trailer VIN)
- [ ] Oklahoma sales tax permit at oktap.gov
- [ ] Open Chase business account

**Pending:**
- [ ] Transparent background logo PNG (new logo exists as JPG — needs PNG from source)
- [ ] HelloSign/DocuSign account for digital agreements (planned for future session)
- [ ] Update website copy — contactless as option not default
- [ ] Start personal credit repair chat (separate conversation)
- [ ] Start business credit building chat (separate conversation)

**Phase 2:**
- [ ] Second trailer purchase (~6 months post-launch)
- [ ] Half-ton truck (unlocks tandem trailers)
- [ ] DOF + deckover tilt + enclosed fleet expansion
- [ ] BigRentz / Fluid Market platform listings
- [ ] Customer portal on irongequipment.com
- [ ] USDA barndominium construction loan (2027 target)

---

## CLAUDE CODE RULES (always include in prompts)

```
IMPORTANT: Before making any changes, ensure existing
user data in IndexedDB is fully preserved. Follow the
safe initialization and migration pattern already
implemented. Do not reinitialize or reseed any data.
Do not refactor unrelated code.
Push to GitHub and run wrangler deploy when done.
```

- Sessions end with `/exit` not `/compact`
- Frank works primarily from phone, also Windows PC with WSL
- Stripe secret key was rotated — old key invalidated

---

---

# PASTE THIS INTO A NEW CLAUDE CHAT TO CONTINUE

```
Hi Claude. I'm Frank, owner of Iron G Equipment Co. LLC 
in Yukon, Oklahoma — a trailer rental startup. I have a 
master context document that covers everything we've built 
and discussed so far. Please read it carefully and 
acknowledge you're up to speed before we continue.

I'm attaching: IronG_Chat_Context.md

Key things to know right now:
- Session 4 of the Command Center PWA just started 
  in Claude Code (Stripe integration, 8-stage booking 
  status, draft persistence, step navigation fixes)
- No trailers purchased yet — still in pre-launch
- Website is live at irongequipment.com
- Command Center is live at irong-cc.westcal98.workers.dev
- All existing Command Center booking records are test 
  data — nothing to preserve

Once you've read the context doc, let me know what 
Session 4 produced and we'll go from there.
```
