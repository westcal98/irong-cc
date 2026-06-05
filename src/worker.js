const ALLOWED_ORIGINS = new Set([
  'https://irongequipment.com',
  'https://irong-cc.westcal98.workers.dev',
]);

function getCors(request) {
  const origin = request.headers.get('Origin') || '';
  const ao = ALLOWED_ORIGINS.has(origin) ? origin : 'https://irong-cc.westcal98.workers.dev';
  return {
    'Access-Control-Allow-Origin': ao,
    'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ── TEMPLATE DEFAULTS ──────────────────────────────────
const DEFAULTS = {
  'pre-booking-package': `Hi {firstName}! This is Frank with Iron G Equipment Co. Here's your booking summary:

🚛 Trailer: {trailerName}
📅 Pickup: {startDate} at {startTime}
📅 Return: {endDate} at {endTime} ({days} days)
📍 Location: {pickupAddress}

💰 Quote:
- Rental Fee: \${rentalFee}
{addOns}- Tax (8.85%): \${tax}
- Deposit (refundable): \${deposit}
- Total Due: \${total}

Before we confirm your booking, please send the following to {contactInfo}:
☐ Driver's license photo
☐ Vehicle insurance card
☐ Confirm tow vehicle: {towVehicle} — reply if different

Please also review the rental agreement. Reply to confirm or with any questions. We'll send your payment link once docs are verified.

— Frank | Iron G Equipment Co. | {businessPhone}`,

  'gate2-confirmation': `Hi {firstName}! Your Iron G rental is confirmed. Here's everything you need:

🚛 Trailer: {trailerName}
📅 Pickup: {startDate} at {startTime}
📅 Return: {endDate} at {endTime}
📍 {pickupAddress}
🔐 Gate Code: {gateCode}
🔑 Lockbox Code: {lockboxCode} (contains your coupler lock combo)

IMPORTANT RETURN INSTRUCTIONS:
- Return trailer by {endDate} at {endTime}
- Late returns may result in additional charges
- To complete your return, send to {contactInfo}:
  - Minimum 4 photos: front, rear, driver side, passenger side
  - Additional photos if any damage
  - 1 walk-around video
- Lock the coupler on return

Questions? Call or text Frank at {businessPhone}

— Iron G Equipment Co.`,

  'return-reminder': `Hi {firstName}! Reminder from Iron G — your trailer is due back TOMORROW ({endDate}) by {endTime}.

📍 Return to: {pickupAddress}
🔐 Gate Code: {gateCode}

To complete your return please send to {contactInfo}:
- Minimum 4 photos: front, rear, driver side, passenger side
- Additional photos if any damage occurred
- 1 walk-around video

⚠️ Returns after {endTime} on {endDate} may result in additional charges.

Lock the coupler when done and text Frank at {businessPhone} when returned.

— Iron G Equipment Co.`,

  'late-return': `Hi {firstName}, this is Frank with Iron G Equipment Co. Your trailer was due back on {endDate} at {endTime} and we haven't received your return confirmation yet.

Please return the trailer to {pickupAddress} as soon as possible.

Additional charges may apply for the extra time. Please text Frank at {businessPhone} immediately to confirm your return plan.

— Iron G Equipment Co.`,

  'payment-link': `Hi {firstName}! Here is your Iron G payment link:

{paymentUrl}

Total: \${total} (includes \${deposit} refundable deposit)

Please complete payment to confirm your booking. Link expires in 24 hours.

Reply with any questions.

— Frank | Iron G Equipment Co. | {businessPhone}`,
};

// ── DOCUMENT DEFAULTS ──────────────────────────────────
const DOC_DEFAULTS = {
  'rental-agreement': `IRON G EQUIPMENT CO. LLC
TRAILER RENTAL AGREEMENT

Date: {date}
Booking ID: {bookingId}

RENTER INFORMATION
Name: {firstName} {lastName}
Phone: {phone}
Email: {email}
City: {city}
Tow Vehicle: {towVehicle}
Driver License: ___________________

RENTAL DETAILS
Trailer: {trailerName}
Pickup: {startDate} at {startTime}
Return: {endDate} at {endTime}
Total Days: {days}
Pickup Location: {pickupAddress}

CHARGES
Rental Fee: \${rentalFee}
{addOns}Tax (8.85%): \${tax}
Refundable Deposit: \${deposit}
Total Due: \${total}

TERMS AND CONDITIONS
1. RENTER must be 18 years or older with a valid driver's license.
2. RENTER is responsible for the trailer from time of pickup until return is confirmed.
3. RENTER assumes full liability for any damage, theft, or loss occurring during the rental period.
4. Trailer must be returned to {pickupAddress} by {endDate} at {endTime}. Late returns will be charged at the daily rental rate.
5. RENTER must have adequate tow vehicle and equipment. Iron G Equipment Co. LLC is not responsible for accidents or damage caused by improper towing.
6. No off-road use. Trailer must remain on paved or improved surfaces.
7. RENTER must not sublet or loan the trailer to any third party.
8. Deposit of \${deposit} will be refunded upon confirmed clean return with required photos and video. Deposit may be fully or partially withheld for damage, excessive cleaning, or missing equipment.
9. Early returns do not automatically qualify for partial refunds. Contact Iron G Equipment Co. to discuss.
10. RENTER agrees to submit minimum 4 photos (front, rear, driver side, passenger side) plus 1 walk-around video upon return.

ACKNOWLEDGEMENTS
Renter confirms tow vehicle is capable of safely towing this trailer: ______
Renter confirms they have reviewed and understand all terms: ______
Renter confirms trailer was inspected at pickup and accepted in good condition: ______

SIGNATURES
Renter Signature: ___________________ Date: ________
Printed Name: ___________________
Iron G Equipment Co. Representative: ___________________ Date: ________`,

  'damage-report': `IRON G EQUIPMENT CO. LLC
DAMAGE / INCIDENT REPORT

Date: {date}
Booking ID: {bookingId}
Rental Period: {startDate} — {endDate}

RENTER INFORMATION
Name: {firstName} {lastName}
Phone: {phone}

TRAILER INFORMATION
Trailer: {trailerName}

DAMAGE DESCRIPTION
Date/Time Discovered: ___________________
Location Discovered: ___________________
Description of Damage:
_______________________________________________
_______________________________________________

ESTIMATED REPAIR COST: $___________________
DEPOSIT HELD: \${deposit}
ADDITIONAL AMOUNT OWED: $___________________

PHOTOS/VIDEO ON FILE: ☐ Yes  ☐ No
NUMBER OF PHOTOS: _______

NOTES:
_______________________________________________

Iron G Equipment Co. Representative: ___________________ Date: ________`,

  'return-confirmation': `IRON G EQUIPMENT CO. LLC
RETURN CONFIRMATION

Date: {date}
Booking ID: {bookingId}

RENTER: {firstName} {lastName}
TRAILER: {trailerName}
RENTAL PERIOD: {startDate} at {startTime} — {endDate} at {endTime}

RETURN DETAILS
Actual Return Date: {actualReturnDate}
Actual Return Time: {actualReturnTime}
Condition: ☐ Clean  ☐ Damage noted

FINANCIAL SUMMARY
Total Charged: \${total}
Deposit Held: \${deposit}
Deposit Refunded: $___________________
Additional Charges: $___________________
Early Return Refund: $___________________

RETURN DOCUMENTATION RECEIVED
☐ Photo — Front
☐ Photo — Rear
☐ Photo — Driver Side
☐ Photo — Passenger Side
☐ Additional damage photos
☐ Walk-around video

NOTES:
_______________________________________________

Iron G Equipment Co. Representative: ___________________ Date: ________`,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCors(request) });
    }

    if (url.pathname === '/submit' && request.method === 'POST') {
      return handleSubmit(request, env);
    }

    if (url.pathname === '/notifications' && request.method === 'GET') {
      return handleGetNotifications(request, env);
    }

    if (url.pathname === '/notifications/handled' && request.method === 'POST') {
      return handleMarkHandled(request, env);
    }

    if (url.pathname === '/push/subscribe' && request.method === 'POST') {
      return handlePushSubscribe(request, env);
    }

    if (url.pathname === '/vapid-public-key' && request.method === 'GET') {
      return new Response(JSON.stringify({ publicKey: env.VAPID_PUBLIC_KEY }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/stripe/checkout-session' && request.method === 'POST') {
      return handleStripeCheckoutSession(request, env);
    }

    if (url.pathname === '/stripe/webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    if (url.pathname === '/webhook/alerts' && request.method === 'GET') {
      return handleGetWebhookAlerts(request, env);
    }

    if (url.pathname === '/webhook/alerts/handled' && request.method === 'POST') {
      return handleMarkWebhookAlertHandled(request, env);
    }

    if (url.pathname.startsWith('/booking/') && url.pathname.endsWith('/payment-intent') && request.method === 'GET') {
      const bookingId = url.pathname.split('/')[2];
      return handleGetPaymentIntent(request, env, bookingId);
    }

    if (url.pathname === '/stripe/deposit-intent' && request.method === 'POST') {
      return handleStripeDepositIntent(request, env);
    }

    if (url.pathname === '/stripe/deposit-capture' && request.method === 'POST') {
      return handleStripeDepositCapture(request, env);
    }

    if (url.pathname === '/stripe/deposit-cancel' && request.method === 'POST') {
      return handleStripeDepositCancel(request, env);
    }

    if (url.pathname === '/stripe/refund' && request.method === 'POST') {
      return handleStripeRefund(request, env);
    }

    if (url.pathname === '/templates' && request.method === 'GET') {
      return handleGetTemplates(request, env);
    }

    if (url.pathname.startsWith('/templates/reset/') && request.method === 'POST') {
      const id = url.pathname.slice('/templates/reset/'.length);
      return handleResetTemplate(request, env, id);
    }

    if (url.pathname.startsWith('/templates/') && request.method === 'GET') {
      const id = url.pathname.slice('/templates/'.length);
      return handleGetTemplate(request, env, id);
    }

    if (url.pathname.startsWith('/templates/') && request.method === 'POST') {
      const id = url.pathname.slice('/templates/'.length);
      return handlePostTemplate(request, env, id);
    }

    if (url.pathname === '/globalvars' && request.method === 'GET') {
      return handleGetGlobalVars(request, env);
    }

    if (url.pathname === '/globalvars' && request.method === 'POST') {
      return handlePostGlobalVars(request, env);
    }

    if (url.pathname === '/docs' && request.method === 'GET') {
      return handleGetDocs(request, env);
    }

    if (url.pathname.startsWith('/docs/reset/') && request.method === 'POST') {
      const id = url.pathname.slice('/docs/reset/'.length);
      return handleResetDoc(request, env, id);
    }

    if (url.pathname.startsWith('/docs/booking/')) {
      const rest = url.pathname.slice('/docs/booking/'.length);
      const parts = rest.split('/').filter(Boolean);
      if (parts.length === 1 && request.method === 'GET') {
        return handleGetDocsForBooking(request, env, parts[0]);
      }
      if (parts.length === 2 && request.method === 'GET') {
        return handleGetBookingDoc(request, env, parts[0], parts[1]);
      }
      if (parts.length === 2 && request.method === 'POST') {
        return handlePostBookingDoc(request, env, parts[0], parts[1]);
      }
    }

    if (url.pathname.startsWith('/docs/') && request.method === 'GET') {
      const id = url.pathname.slice('/docs/'.length);
      return handleGetDoc(request, env, id);
    }

    if (url.pathname.startsWith('/docs/') && request.method === 'POST') {
      const id = url.pathname.slice('/docs/'.length);
      return handlePostDoc(request, env, id);
    }

    if (url.pathname === '/availability' && request.method === 'GET') {
      return handleGetAllAvailability(request, env);
    }

    if (url.pathname.startsWith('/availability/next/') && request.method === 'GET') {
      const trailerId = url.pathname.slice('/availability/next/'.length);
      return handleGetAvailabilityNext(request, env, trailerId);
    }

    if (url.pathname.startsWith('/availability/') && request.method === 'GET') {
      const trailerId = url.pathname.slice('/availability/'.length);
      return handleGetAvailabilityForTrailer(request, env, trailerId);
    }

    if (url.pathname === '/auth/google' && request.method === 'GET') {
      return handleAuthGoogle(request, env);
    }

    if (url.pathname === '/auth/callback' && request.method === 'GET') {
      return handleAuthCallback(request, env);
    }

    if (url.pathname === '/auth/google/status' && request.method === 'GET') {
      return handleAuthGoogleStatus(request, env);
    }

    if (url.pathname === '/auth/google/disconnect' && request.method === 'POST') {
      return handleAuthGoogleDisconnect(request, env);
    }

    if (url.pathname === '/maintenance/scan-receipt' && request.method === 'POST') {
      return handleScanReceipt(request, env);
    }

    if (url.pathname === '/maintenance/summary/all' && request.method === 'GET') {
      return handleGetMaintenanceSummaryAll(request, env);
    }

    if (url.pathname.startsWith('/maintenance/summary/') && request.method === 'GET') {
      const trailerId = url.pathname.slice('/maintenance/summary/'.length);
      return handleGetMaintenanceSummary(request, env, trailerId);
    }

    if (url.pathname === '/maintenance/all' && request.method === 'GET') {
      return handleGetMaintenanceAll(request, env);
    }

    if (url.pathname.startsWith('/maintenance/export/') && request.method === 'GET') {
      const trailerId = url.pathname.slice('/maintenance/export/'.length);
      return handleGetMaintenanceExport(request, env, trailerId);
    }

    if (url.pathname.startsWith('/maintenance/') && request.method === 'GET') {
      const rest = url.pathname.slice('/maintenance/'.length);
      const parts = rest.split('/').filter(Boolean);
      if (parts.length === 1) {
        return handleGetMaintenance(request, env, parts[0]);
      }
    }

    if (url.pathname.startsWith('/maintenance/') && request.method === 'POST') {
      const rest = url.pathname.slice('/maintenance/'.length);
      if (!rest.includes('/')) {
        return handlePostMaintenance(request, env, rest);
      }
    }

    if (url.pathname.startsWith('/maintenance/') && request.method === 'PUT') {
      const rest = url.pathname.slice('/maintenance/'.length);
      const parts = rest.split('/').filter(Boolean);
      if (parts.length === 2) {
        return handlePutMaintenance(request, env, parts[0], parts[1]);
      }
    }

    if (url.pathname.startsWith('/maintenance/') && request.method === 'DELETE') {
      const rest = url.pathname.slice('/maintenance/'.length);
      const parts = rest.split('/').filter(Boolean);
      if (parts.length === 2) {
        return handleDeleteMaintenance(request, env, parts[0], parts[1]);
      }
    }

    if (url.pathname === '/trailers' && request.method === 'GET') {
      return handleGetTrailers(request, env);
    }

    if (url.pathname.startsWith('/trailers/') && url.pathname.endsWith('/name') && request.method === 'POST') {
      const id = url.pathname.slice('/trailers/'.length, -'/name'.length);
      return handlePostTrailerName(request, env, id);
    }

    if (url.pathname === '/expenses/summary' && request.method === 'GET') {
      return handleGetExpenseSummary(request, env);
    }

    if (url.pathname === '/expenses/export' && request.method === 'GET') {
      return handleGetExpenseExport(request, env);
    }

    if (url.pathname === '/expenses' && request.method === 'GET') {
      return handleGetExpenses(request, env);
    }

    if (url.pathname === '/expenses' && request.method === 'POST') {
      return handlePostExpense(request, env);
    }

    if (url.pathname.startsWith('/expenses/') && request.method === 'GET') {
      const id = url.pathname.slice('/expenses/'.length);
      return handleGetExpense(request, env, id);
    }

    if (url.pathname.startsWith('/expenses/') && request.method === 'PUT') {
      const id = url.pathname.slice('/expenses/'.length);
      return handlePutExpense(request, env, id);
    }

    if (url.pathname.startsWith('/expenses/') && request.method === 'DELETE') {
      const id = url.pathname.slice('/expenses/'.length);
      return handleDeleteExpense(request, env, id);
    }

    if (url.pathname === '/revenue/summary' && request.method === 'GET') {
      return handleGetRevenueSummary(request, env);
    }

    if (url.pathname === '/tax/liability' && request.method === 'GET') {
      return handleGetTaxLiability(request, env);
    }

    if (url.pathname === '/mileage/summary' && request.method === 'GET') {
      return handleGetMileageSummary(request, env);
    }

    if (url.pathname === '/mileage' && request.method === 'GET') {
      return handleGetMileage(request, env);
    }

    if (url.pathname === '/mileage' && request.method === 'POST') {
      return handlePostMileage(request, env);
    }

    if (url.pathname.startsWith('/mileage/') && request.method === 'DELETE') {
      const id = url.pathname.slice('/mileage/'.length);
      return handleDeleteMileage(request, env, id);
    }

    return env.ASSETS.fetch(request);
  },
};

// ── STRIPE HELPERS ─────────────────────────────────────

function stripeForm(obj, prefix) {
  const p = [];
  for (const k in obj) {
    const key = prefix ? prefix + '[' + k + ']' : k;
    const val = obj[k];
    if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
      p.push(stripeForm(val, key));
    } else if (Array.isArray(val)) {
      val.forEach(function(v, i) {
        if (v !== null && typeof v === 'object') {
          p.push(stripeForm(v, key + '[' + i + ']'));
        } else {
          p.push(encodeURIComponent(key + '[' + i + ']') + '=' + encodeURIComponent(v));
        }
      });
    } else if (val !== null && val !== undefined) {
      p.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    }
  }
  return p.join('&');
}

async function stripePost(path, params, secretKey) {
  const body = stripeForm(params, '');
  const res = await fetch('https://api.stripe.com/v1' + path, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + secretKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  return res;
}

// ── STRIPE ROUTE HANDLERS ──────────────────────────────

async function handleStripeCheckoutSession(request, env) {
  const cors = getCors(request);
  try {
    const { bookingId, rentalAmount, addOnsTotal, tax, dep, addOns, trailerName, firstName } = await request.json();

    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Rental Fee — ' + trailerName },
          unit_amount: Math.round(rentalAmount * 100),
        },
        quantity: 1,
      },
    ];

    if (addOns && Array.isArray(addOns)) {
      for (const addOn of addOns) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name: addOn.name },
            unit_amount: Math.round(addOn.amount * 100),
          },
          quantity: 1,
        });
      }
    }

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Tax (8.85%)' },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    });

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Refundable Deposit' },
        unit_amount: Math.round(dep * 100),
      },
      quantity: 1,
    });

    const res = await stripePost('/checkout/sessions', {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      payment_intent_data: {
        metadata: {
          bookingId: String(bookingId || ''),
          rentalAmount: String(rentalAmount || ''),
          depositAmount: String(dep || ''),
        },
      },
      success_url: 'https://irong-cc.westcal98.workers.dev/?payment=success&bookingId=' + bookingId,
      cancel_url: 'https://irong-cc.westcal98.workers.dev/?payment=cancelled&bookingId=' + bookingId,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    }, env.STRIPE_SECRET_KEY);

    const data = await res.json();
    if (!res.ok) {
      console.error('[IronG] Stripe checkout-session error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: data.url, sessionId: data.id }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] handleStripeCheckoutSession error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleStripeDepositIntent(request, env) {
  const cors = getCors(request);
  try {
    const { amount, description, bookingId } = await request.json();
    const amountCents = Math.round(amount * 100);

    const res = await stripePost('/checkout/sessions', {
      mode: 'payment',
      payment_method_types: ['card'],
      payment_intent_data: { capture_method: 'manual' },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: description },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: 'https://irong-cc.westcal98.workers.dev',
      cancel_url: 'https://irong-cc.westcal98.workers.dev',
    }, env.STRIPE_SECRET_KEY);

    const data = await res.json();
    if (!res.ok) {
      console.error('[IronG] Stripe deposit-intent error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      url: data.url,
      paymentIntentId: data.payment_intent,
      sessionId: data.id,
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] handleStripeDepositIntent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleStripeDepositCapture(request, env) {
  const cors = getCors(request);
  try {
    const { paymentIntentId } = await request.json();
    const res = await stripePost('/payment_intents/' + paymentIntentId + '/capture', {}, env.STRIPE_SECRET_KEY);
    const data = await res.json();
    if (!res.ok) {
      console.error('[IronG] Stripe capture error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true, status: data.status }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] handleStripeDepositCapture error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleStripeDepositCancel(request, env) {
  const cors = getCors(request);
  try {
    const { paymentIntentId } = await request.json();
    const res = await stripePost('/payment_intents/' + paymentIntentId + '/cancel', {}, env.STRIPE_SECRET_KEY);
    const data = await res.json();
    if (!res.ok) {
      console.error('[IronG] Stripe cancel error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true, status: data.status }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] handleStripeDepositCancel error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleStripeRefund(request, env) {
  const cors = getCors(request);
  try {
    const { paymentIntentId, amount } = await request.json();
    const amountCents = Math.round(amount * 100);
    const res = await stripePost('/refunds', {
      payment_intent: paymentIntentId,
      amount: amountCents,
    }, env.STRIPE_SECRET_KEY);
    const data = await res.json();
    if (!res.ok) {
      console.error('[IronG] Stripe refund error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ refundId: data.id, status: data.status, amount: data.amount / 100 }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] handleStripeRefund error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── WEB PUSH CRYPTO HELPERS ────────────────────────────

function b64uToBytes(b64u) {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToB64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function concat(...arrs) {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

async function createVapidJwt(endpoint, vapidPrivB64u, vapidPubB64u) {
  const enc = new TextEncoder();
  const origin = new URL(endpoint).origin;
  const toB64u = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const sigInput = `${toB64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))}.${toB64u(JSON.stringify({
    aud: origin,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: 'mailto:westcal98@gmail.com',
  }))}`;

  const pkcs8 = concat(
    new Uint8Array([
      0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,
      0x02,0x01,0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x04,0x27,
      0x30,0x25,0x02,0x01,0x01,0x04,0x20,
    ]),
    b64uToBytes(vapidPrivB64u)
  );

  const signingKey = await crypto.subtle.importKey(
    'pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, signingKey, enc.encode(sigInput)
  );
  return `${sigInput}.${bytesToB64u(new Uint8Array(sig))}`;
}

async function encryptPushPayload(plaintextStr, p256dhB64u, authB64u) {
  const enc = new TextEncoder();
  const receiverPubRaw = b64uToBytes(p256dhB64u);
  const authSecret = b64uToBytes(authB64u);

  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const senderPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverKey }, senderPair.privateKey, 256
  );
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderPair.publicKey));

  const prkMat = await crypto.subtle.importKey('raw', sharedBits, { name: 'HKDF' }, false, ['deriveBits']);
  const keyInfo = concat(enc.encode('WebPush: info\x00'), receiverPubRaw, senderPubRaw);
  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: keyInfo }, prkMat, 256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikmMat = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const cek = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: aes128gcm\x00') }, ikmMat, 128
  );
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: nonce\x00') }, ikmMat, 96
  );

  const encKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    encKey,
    concat(enc.encode(plaintextStr), new Uint8Array([2]))
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return concat(salt, rs, new Uint8Array([senderPubRaw.length]), senderPubRaw, new Uint8Array(ciphertext));
}

async function sendWebPush(subscription, payload, vapidPriv, vapidPub) {
  const { endpoint, keys: { p256dh, auth } } = subscription;
  const jwt = await createVapidJwt(endpoint, vapidPriv, vapidPub);
  const body = await encryptPushPayload(JSON.stringify(payload), p256dh, auth);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPub}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body,
  });
}

// ── ROUTE HANDLERS ─────────────────────────────────────

async function handleSubmit(request, env) {
  const cors = getCors(request);
  try {
    const body = await request.json();
    const {
      type, name, phone, email, city, trailer, startDate,
      duration, towVehicle, hauling, referral, notes,
      timestamp, source,
    } = body;

    const isRental = type === 'rental';
    const toEmail = isRental ? 'rent@irongequipment.com' : 'info@irongequipment.com';
    const subject = isRental
      ? `[RENTAL REQUEST] ${name} — ${trailer}`
      : `[INFO REQUEST] ${name} — ${trailer}`;

    const emailBody = `New ${type || 'info'} request from irongequipment.com

Name:        ${name || '—'}
Phone:       ${phone || '—'}
Email:       ${email || '—'}
City:        ${city || '—'}
Trailer:     ${trailer || '—'}
Start Date:  ${startDate || '—'}
Duration:    ${duration || '—'}
Tow Vehicle: ${towVehicle || '—'}
Hauling:     ${hauling || '—'}
Referral:    ${referral || '—'}
Notes:       ${notes || '—'}
Source:      ${source || '—'}
Submitted:   ${timestamp || new Date().toISOString()}`;

    let emailSent = false;
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'notifications@irongequipment.com',
          to: toEmail,
          subject,
          text: emailBody,
        }),
      });
      emailSent = emailRes.ok;
      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error('[IronG] Email send failed:', emailRes.status, errText);
      }
    } catch (emailErr) {
      console.error('[IronG] Email send error:', emailErr);
    }

    const id = Date.now();
    const key = `submission:${id}`;
    const entry = {
      id,
      type: type || 'info',
      name, phone, email, city, trailer,
      startDate, duration, towVehicle, hauling,
      referral, notes, timestamp, source,
      handled: false,
      receivedAt: new Date().toISOString(),
      emailSent,
    };

    await env.IRONG_KV.put(key, JSON.stringify(entry));

    try {
      const subRaw = await env.IRONG_KV.get('pushsub:main');
      if (subRaw) {
        const sub = JSON.parse(subRaw);
        const pushPayload = {
          title: isRental ? `[RENTAL REQUEST] ${name}` : `[INFO REQUEST] ${name}`,
          body: `Trailer: ${trailer || '—'} | Phone: ${phone || '—'}`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          url: '/notifications',
        };
        const pushRes = await sendWebPush(sub, pushPayload, env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);
        if (!pushRes.ok) {
          const errText = await pushRes.text();
          console.error('[IronG] Push send failed:', pushRes.status, errText);
        }
      }
    } catch (pushErr) {
      console.error('[IronG] Push send error:', pushErr);
    }

    return new Response(JSON.stringify({ success: true, message: 'Received' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Submit error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...getCors(request), 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetNotifications(request, env) {
  try {
    const url = new URL(request.url);
    const handledFilter = url.searchParams.get('handled');

    const list = await env.IRONG_KV.list({ prefix: 'submission:' });
    const entries = await Promise.all(
      list.keys.map(async (k) => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );

    let results = entries.filter(Boolean).sort((a, b) => b.id - a.id);

    if (handledFilter === 'false') {
      results = results.filter((r) => !r.handled);
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get notifications error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleMarkHandled(request, env) {
  try {
    const { id } = await request.json();
    const val = await env.IRONG_KV.get(id);
    if (!val) {
      return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const entry = JSON.parse(val);
    entry.handled = true;
    await env.IRONG_KV.put(id, JSON.stringify(entry));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Mark handled error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handlePushSubscribe(request, env) {
  try {
    const sub = await request.json();
    if (!sub || !sub.endpoint || !sub.keys) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid subscription' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await env.IRONG_KV.put('pushsub:main', JSON.stringify(sub));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Push subscribe error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleStripeWebhook(request, env) {
  const rawBody = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature') || '';

  let timestamp = null;
  let v1 = null;
  for (const part of sigHeader.split(',')) {
    if (part.startsWith('t=')) timestamp = part.slice(2);
    else if (part.startsWith('v1=')) v1 = part.slice(3);
  }

  if (!timestamp || !v1) {
    return new Response('Invalid signature', { status: 400 });
  }

  if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) {
    return new Response('Timestamp too old', { status: 400 });
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(timestamp + '.' + rawBody));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (hex !== v1) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const obj = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const paymentIntentId = obj.payment_intent;
    const bookingId = obj.metadata?.bookingId || obj.payment_intent_data?.metadata?.bookingId;
    if (bookingId) {
      await env.IRONG_KV.put('booking:' + bookingId + ':paymentIntentId', paymentIntentId);
    }
    await env.IRONG_KV.put('booking:' + bookingId + ':sessionCompleted', JSON.stringify({
      sessionId: obj.id,
      paymentIntentId,
      completedAt: Date.now(),
    }));
  } else if (event.type === 'checkout.session.expired') {
    const bookingId = obj.metadata?.bookingId;
    await env.IRONG_KV.put('webhook:alert:' + Date.now(), JSON.stringify({
      type: 'session_expired',
      bookingId,
      message: 'Payment link expired — follow up with customer',
      createdAt: Date.now(),
      handled: false,
      urgent: false,
    }));
  } else if (event.type === 'payment_intent.payment_failed') {
    const bookingId = obj.metadata?.bookingId;
    await env.IRONG_KV.put('webhook:alert:' + Date.now(), JSON.stringify({
      type: 'payment_failed',
      bookingId,
      message: 'Payment failed — customer card declined',
      createdAt: Date.now(),
      handled: false,
      urgent: false,
    }));
  } else if (event.type === 'payment_intent.succeeded') {
    const bookingId = obj.metadata?.bookingId;
    const paymentIntentId = obj.id;
    const existing = await env.IRONG_KV.get('booking:' + bookingId + ':paymentIntentId');
    if (!existing) {
      await env.IRONG_KV.put('booking:' + bookingId + ':paymentIntentId', paymentIntentId);
    }
  } else if (event.type === 'refund.created') {
    const bookingId = obj.metadata?.bookingId || 'unknown';
    await env.IRONG_KV.put('booking:' + bookingId + ':refundCreated', JSON.stringify({
      refundId: obj.id,
      amount: obj.amount / 100,
      createdAt: Date.now(),
    }));
  } else if (event.type === 'refund.updated') {
    if (obj.status === 'failed') {
      await env.IRONG_KV.put('webhook:alert:' + Date.now(), JSON.stringify({
        type: 'refund_failed',
        bookingId: obj.metadata?.bookingId || 'unknown',
        message: 'Refund failed — process manually in Stripe dashboard',
        createdAt: Date.now(),
        handled: false,
        urgent: false,
      }));
    }
  } else if (event.type === 'refund.failed') {
    await env.IRONG_KV.put('webhook:alert:' + Date.now(), JSON.stringify({
      type: 'refund_failed',
      bookingId: obj.metadata?.bookingId || 'unknown',
      message: 'Refund failed — process manually in Stripe dashboard',
      createdAt: Date.now(),
      handled: false,
      urgent: false,
    }));
  } else if (event.type === 'charge.dispute.created') {
    const bookingId = obj.metadata?.bookingId || 'unknown';
    await env.IRONG_KV.put('webhook:alert:' + Date.now(), JSON.stringify({
      type: 'dispute',
      bookingId,
      amount: obj.amount / 100,
      message: 'DISPUTE FILED — respond in Stripe dashboard immediately',
      createdAt: Date.now(),
      handled: false,
      urgent: true,
    }));
  } else if (event.type === 'charge.dispute.closed') {
    const bookingId = obj.metadata?.bookingId || 'unknown';
    await env.IRONG_KV.put('booking:' + bookingId + ':disputeClosed', JSON.stringify({
      outcome: obj.status,
      closedAt: Date.now(),
    }));
  }

  return new Response('ok', { status: 200 });
}

async function handleGetWebhookAlerts(request, env) {
  try {
    const url = new URL(request.url);
    const handledFilter = url.searchParams.get('handled');

    const list = await env.IRONG_KV.list({ prefix: 'webhook:alert:' });
    const entries = await Promise.all(
      list.keys.map(async (k) => {
        const val = await env.IRONG_KV.get(k.name);
        try {
          const parsed = JSON.parse(val);
          parsed._key = k.name;
          return parsed;
        } catch { return null; }
      })
    );

    let results = entries.filter(Boolean);
    if (handledFilter === 'false') {
      results = results.filter(r => r.handled === false);
    }
    results.sort((a, b) => b.createdAt - a.createdAt);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get webhook alerts error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleMarkWebhookAlertHandled(request, env) {
  try {
    const { key } = await request.json();
    const val = await env.IRONG_KV.get(key);
    if (!val) {
      return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const entry = JSON.parse(val);
    entry.handled = true;
    await env.IRONG_KV.put(key, JSON.stringify(entry));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Mark webhook alert handled error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetPaymentIntent(request, env, bookingId) {
  const cors = getCors(request);
  try {
    const paymentIntentId = await env.IRONG_KV.get('booking:' + bookingId + ':paymentIntentId');
    return new Response(JSON.stringify({ paymentIntentId: paymentIntentId || null }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get payment intent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── TEMPLATE HANDLERS ──────────────────────────────────

async function handleGetTemplates(request, env) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'template:' });
    const entries = await Promise.all(
      list.keys.map(async (k) => {
        const val = await env.IRONG_KV.get(k.name);
        try {
          const parsed = JSON.parse(val);
          parsed.key = k.name;
          return parsed;
        } catch { return null; }
      })
    );
    return new Response(JSON.stringify(entries.filter(Boolean)), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get templates error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetTemplate(request, env, id) {
  const cors = getCors(request);
  try {
    const val = await env.IRONG_KV.get('template:' + id);
    if (!val) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(val, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get template error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePostTemplate(request, env, id) {
  const cors = getCors(request);
  try {
    const { label, body } = await request.json();
    if (!body) {
      return new Response(JSON.stringify({ error: 'body is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const updatedAt = Date.now();
    const entry = { id, label: label || id, body, updatedAt };
    await env.IRONG_KV.put('template:' + id, JSON.stringify(entry));
    return new Response(JSON.stringify({ success: true, updatedAt }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Post template error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleResetTemplate(request, env, id) {
  const cors = getCors(request);
  const defaultBody = DEFAULTS[id];
  if (!defaultBody) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  try {
    const updatedAt = Date.now();
    const entry = { id, label: id, body: defaultBody, updatedAt };
    await env.IRONG_KV.put('template:' + id, JSON.stringify(entry));
    return new Response(JSON.stringify({ success: true, body: defaultBody }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Reset template error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── GLOBALVARS HANDLERS ────────────────────────────────

async function handleGetGlobalVars(request, env) {
  const cors = getCors(request);
  const defaults = {
    businessPhone: '(405) 393-4161',
    pickupAddress: 'Mother Road RV Boat & Trailer Storage, 16245 W HWY 66, Yukon, OK 73099',
    gateCode: '',
    businessName: 'Iron G Equipment Co.',
  };
  try {
    const val = await env.IRONG_KV.get('globalvars');
    if (!val) {
      return new Response(JSON.stringify(defaults), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    try {
      const parsed = JSON.parse(val);
      return new Response(JSON.stringify({ ...defaults, ...parsed }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify(defaults), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[IronG] Get globalvars error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePostGlobalVars(request, env) {
  const cors = getCors(request);
  try {
    const incoming = await request.json();
    const existing = await env.IRONG_KV.get('globalvars');
    const current = existing ? JSON.parse(existing) : {};
    const merged = { ...current, ...incoming };
    await env.IRONG_KV.put('globalvars', JSON.stringify(merged));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Post globalvars error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── DOCUMENT HANDLERS ──────────────────────────────────

async function handleGetDocs(request, env) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'doc:' });
    const entries = await Promise.all(
      list.keys
        .filter(k => !k.name.startsWith('doc:booking:'))
        .map(async (k) => {
          const val = await env.IRONG_KV.get(k.name);
          try { return JSON.parse(val); } catch { return null; }
        })
    );
    return new Response(JSON.stringify(entries.filter(Boolean)), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get docs error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetDoc(request, env, id) {
  const cors = getCors(request);
  try {
    const val = await env.IRONG_KV.get('doc:' + id);
    if (!val) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(val, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get doc error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePostDoc(request, env, id) {
  const cors = getCors(request);
  try {
    const { label, body, category } = await request.json();
    if (!body) {
      return new Response(JSON.stringify({ error: 'body is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const updatedAt = Date.now();
    const entry = { id, label: label || id, category: category || 'operational', body, updatedAt };
    await env.IRONG_KV.put('doc:' + id, JSON.stringify(entry));
    return new Response(JSON.stringify({ success: true, updatedAt }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Post doc error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleResetDoc(request, env, id) {
  const cors = getCors(request);
  const defaultBody = DOC_DEFAULTS[id];
  if (!defaultBody) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  try {
    const updatedAt = Date.now();
    const entry = { id, label: id, body: defaultBody, updatedAt };
    await env.IRONG_KV.put('doc:' + id, JSON.stringify(entry));
    return new Response(JSON.stringify({ success: true, body: defaultBody }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Reset doc error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetBookingDoc(request, env, bookingId, docId) {
  const cors = getCors(request);
  try {
    const val = await env.IRONG_KV.get('doc:booking:' + bookingId + ':' + docId);
    if (!val) {
      return new Response(JSON.stringify({ body: null }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(val, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get booking doc error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePostBookingDoc(request, env, bookingId, docId) {
  const cors = getCors(request);
  try {
    const { body } = await request.json();
    const entry = { bookingId, docId, body, savedAt: Date.now() };
    await env.IRONG_KV.put('doc:booking:' + bookingId + ':' + docId, JSON.stringify(entry));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Post booking doc error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetDocsForBooking(request, env, bookingId) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'doc:booking:' + bookingId + ':' });
    const entries = await Promise.all(
      list.keys.map(async (k) => {
        const val = await env.IRONG_KV.get(k.name);
        try {
          const parsed = JSON.parse(val);
          return { docId: parsed.docId, bookingId: parsed.bookingId, savedAt: parsed.savedAt };
        } catch { return null; }
      })
    );
    return new Response(JSON.stringify(entries.filter(Boolean)), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get docs for booking error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── AVAILABILITY HELPERS ───────────────────────────────

function normalizeTrailerKey(bk) {
  if (bk.tid) return bk.tid;
  if (bk.trailer) return bk.trailer.toLowerCase().replace(/\s+/g, '-');
  return 'unknown';
}

async function scanAllBookings(env) {
  const list = await env.IRONG_KV.list({ prefix: 'booking:' });
  // Only direct booking keys — exclude sub-keys like booking:{id}:paymentIntentId
  const bookingKeys = list.keys.filter(k => !k.name.slice('booking:'.length).includes(':'));
  const results = await Promise.all(
    bookingKeys.map(async (k) => {
      const val = await env.IRONG_KV.get(k.name);
      try {
        const bk = JSON.parse(val);
        bk._bookingId = k.name.slice('booking:'.length);
        return bk;
      } catch { return null; }
    })
  );
  return results.filter(Boolean);
}

const INACTIVE_STATUSES = new Set(['cancelled', 'complete']);

function bookingToRange(bk) {
  return {
    bookingId: bk._bookingId,
    startDate: bk.sd || '',
    startTime: bk.st || bk.startTime || '',
    endDate: bk.ed || '',
    endTime: bk.et || bk.endTime || '',
    status: bk.status || '',
    customerName: bk.customerName || bk.name || (bk.firstName ? bk.firstName + (bk.lastName ? ' ' + bk.lastName : '') : '') || '',
  };
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// ── AVAILABILITY HANDLERS ──────────────────────────────

async function handleGetAvailabilityForTrailer(request, env, trailerId) {
  const cors = getCors(request);
  try {
    const allBookings = await scanAllBookings(env);
    const ranges = allBookings
      .filter(bk =>
        !INACTIVE_STATUSES.has(bk.status) &&
        (bk.tid === trailerId || normalizeTrailerKey(bk) === trailerId)
      )
      .map(bookingToRange);
    return new Response(JSON.stringify(ranges), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Availability for trailer error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetAllAvailability(request, env) {
  const cors = getCors(request);
  try {
    const allBookings = await scanAllBookings(env);
    const grouped = {};
    for (const bk of allBookings) {
      if (INACTIVE_STATUSES.has(bk.status)) continue;
      const key = normalizeTrailerKey(bk);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(bookingToRange(bk));
    }
    return new Response(JSON.stringify(grouped), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] All availability error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetAvailabilityNext(request, env, trailerId) {
  const cors = getCors(request);
  try {
    const allBookings = await scanAllBookings(env);
    const trailerBookings = allBookings.filter(bk =>
      !INACTIVE_STATUSES.has(bk.status) &&
      (bk.tid === trailerId || normalizeTrailerKey(bk) === trailerId) &&
      bk.sd && bk.ed
    );

    const today = new Date().toISOString().slice(0, 10);
    let current = today;

    let changed = true;
    while (changed) {
      changed = false;
      for (const bk of trailerBookings) {
        if (current >= bk.sd && current <= bk.ed) {
          current = addDays(bk.ed, 1);
          changed = true;
          break;
        }
      }
    }

    return new Response(JSON.stringify({
      nextAvailable: current,
      nextAvailableFormatted: formatDateLong(current),
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Availability next error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── GOOGLE OAUTH HELPERS ───────────────────────────────

async function getValidAccessToken(env) {
  const refreshToken = await env.IRONG_KV.get('google:refresh_token');
  if (!refreshToken) return null;

  const accessToken = await env.IRONG_KV.get('google:access_token');
  const expiryStr = await env.IRONG_KV.get('google:access_token_expiry');
  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;

  if (accessToken && expiry > Date.now() + 5 * 60 * 1000) {
    return accessToken;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    console.error('[IronG] Token refresh failed:', await res.text());
    return null;
  }

  const data = await res.json();
  const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  await env.IRONG_KV.put('google:access_token', data.access_token);
  await env.IRONG_KV.put('google:access_token_expiry', String(newExpiry));
  return data.access_token;
}

// ── GOOGLE OAUTH HANDLERS ──────────────────────────────

async function handleAuthGoogle(request, env) {
  const state = bytesToB64u(crypto.getRandomValues(new Uint8Array(16)));
  await env.IRONG_KV.put('oauth:state:' + state, '1', { expirationTtl: 600 });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: 'https://irong-cc.westcal98.workers.dev/auth/callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString(), 302);
}

async function handleAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return Response.redirect('https://irong-cc.westcal98.workers.dev/#settings?auth=error', 302);
  }

  if (state) {
    const stateVal = await env.IRONG_KV.get('oauth:state:' + state);
    if (!stateVal) {
      return Response.redirect('https://irong-cc.westcal98.workers.dev/#settings?auth=error', 302);
    }
    await env.IRONG_KV.delete('oauth:state:' + state);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://irong-cc.westcal98.workers.dev/auth/callback',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[IronG] OAuth token exchange failed:', await tokenRes.text());
      return Response.redirect('https://irong-cc.westcal98.workers.dev/#settings?auth=error', 302);
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (refresh_token) {
      await env.IRONG_KV.put('google:refresh_token', refresh_token);
    }
    await env.IRONG_KV.put('google:access_token', access_token);
    await env.IRONG_KV.put('google:access_token_expiry', String(Date.now() + (expires_in || 3600) * 1000));

    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + access_token },
      });
      if (userRes.ok) {
        const userInfo = await userRes.json();
        if (userInfo.email) await env.IRONG_KV.put('google:email', userInfo.email);
      }
    } catch (emailErr) {
      console.error('[IronG] Failed to fetch Google email:', emailErr);
    }

    return Response.redirect('https://irong-cc.westcal98.workers.dev/#settings?auth=success', 302);
  } catch (err) {
    console.error('[IronG] OAuth callback error:', err);
    return Response.redirect('https://irong-cc.westcal98.workers.dev/#settings?auth=error', 302);
  }
}

async function handleAuthGoogleStatus(request, env) {
  const cors = getCors(request);
  try {
    const refreshToken = await env.IRONG_KV.get('google:refresh_token');
    const email = await env.IRONG_KV.get('google:email');
    return new Response(JSON.stringify({ connected: !!refreshToken, email: email || null }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Auth status error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleAuthGoogleDisconnect(request, env) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'google:' });
    await Promise.all(list.keys.map(k => env.IRONG_KV.delete(k.name)));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Auth disconnect error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── MAINTENANCE HELPERS ────────────────────────────────

async function getAllMaintenanceRecords(env, trailerId) {
  const list = await env.IRONG_KV.list({ prefix: 'maintenance:' + trailerId + ':' });
  const entries = await Promise.all(
    list.keys.map(async (k) => {
      const val = await env.IRONG_KV.get(k.name);
      try { return JSON.parse(val); } catch { return null; }
    })
  );
  return entries.filter(Boolean).sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return (b.id || 0) - (a.id || 0);
  });
}

async function getTrailerName(env, trailerId) {
  const val = await env.IRONG_KV.get('trailer:' + trailerId + ':name');
  if (val) {
    try {
      const obj = JSON.parse(val);
      return obj.name || trailerId;
    } catch { return trailerId; }
  }
  if (trailerId === 'utility') return 'Utility Trailer';
  if (trailerId === 'hauler') return 'Car Hauler';
  return trailerId;
}

// ── GOOGLE DRIVE CSV SYNC ──────────────────────────────

async function syncToDrive(env, trailerId, trailerName, records) {
  try {
    const token = await getValidAccessToken(env);
    if (!token) return;

    async function driveGet(path) {
      const res = await fetch('https://www.googleapis.com/drive/v3/' + path, {
        headers: { Authorization: 'Bearer ' + token },
      });
      return res.json();
    }

    async function findOrCreateFolder(name, parentId) {
      let q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) q += ` and '${parentId}' in parents`;
      const search = await driveGet('files?' + new URLSearchParams({ q, fields: 'files(id)', spaces: 'drive' }));
      if (search.files && search.files.length > 0) return search.files[0].id;
      const body = { name, mimeType: 'application/vnd.google-apps.folder' };
      if (parentId) body.parents = [parentId];
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return data.id;
    }

    const csvHeaders = ['Date','Trailer','Service Type','Description','Parts Used','Labor Cost','Parts Cost','Total Cost','Vendor','Vendor Phone','Invoice Ref','Performed By','Next Service Due','Notes','Rental Count at Service','Created At'];
    const csvRows = records.map(r => [
      r.date || '',
      trailerName,
      r.serviceType || '',
      r.description || '',
      r.partsUsed || '',
      r.laborCost || '',
      r.partsCost || '',
      r.totalCost || '',
      r.vendor || '',
      r.vendorPhone || '',
      r.invoiceRef || '',
      r.performedBy || '',
      r.nextServiceDue || '',
      r.notes || '',
      r.rentalCountAtService || '',
      r.createdAt || '',
    ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    const rootFolderId = await findOrCreateFolder('Iron G Equipment', null);
    const trailerFolderId = await findOrCreateFolder(trailerName, rootFolderId);

    const fileName = 'Maintenance Log — ' + trailerName + '.csv';
    const fileQ = `name='${fileName.replace(/'/g, "\\'")}' and '${trailerFolderId}' in parents and trashed=false`;
    const fileSearch = await driveGet('files?' + new URLSearchParams({ q: fileQ, fields: 'files(id)' }));

    if (fileSearch.files && fileSearch.files.length > 0) {
      await fetch('https://www.googleapis.com/upload/drive/v3/files/' + fileSearch.files[0].id + '?uploadType=media', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'text/csv' },
        body: csvContent,
      });
    } else {
      const metadata = JSON.stringify({ name: fileName, parents: [trailerFolderId], mimeType: 'text/csv' });
      const boundary = 'irong_' + Date.now();
      const multipart = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + metadata + '\r\n--' + boundary + '\r\nContent-Type: text/csv\r\n\r\n' + csvContent + '\r\n--' + boundary + '--';
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary },
        body: multipart,
      });
    }
  } catch (err) {
    console.error('[IronG] syncToDrive error:', err);
  }
}

// ── MAINTENANCE HANDLERS ───────────────────────────────

async function handleGetMaintenance(request, env, trailerId) {
  const cors = getCors(request);
  try {
    const records = await getAllMaintenanceRecords(env, trailerId);
    return new Response(JSON.stringify(records), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get maintenance error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePostMaintenance(request, env, trailerId) {
  const cors = getCors(request);
  try {
    const body = await request.json();
    const id = String(Date.now());
    const record = { ...body, id, trailerId, createdAt: new Date().toISOString() };
    await env.IRONG_KV.put('maintenance:' + trailerId + ':' + id, JSON.stringify(record));
    const records = await getAllMaintenanceRecords(env, trailerId);
    const trailerName = await getTrailerName(env, trailerId);
    await syncToDrive(env, trailerId, trailerName, records);
    return new Response(JSON.stringify(record), {
      status: 201,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Post maintenance error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePutMaintenance(request, env, trailerId, recordId) {
  const cors = getCors(request);
  try {
    const key = 'maintenance:' + trailerId + ':' + recordId;
    const existing = await env.IRONG_KV.get(key);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const current = JSON.parse(existing);
    const updates = await request.json();
    const record = { ...current, ...updates, id: recordId, trailerId, updatedAt: new Date().toISOString() };
    await env.IRONG_KV.put(key, JSON.stringify(record));
    const records = await getAllMaintenanceRecords(env, trailerId);
    const trailerName = await getTrailerName(env, trailerId);
    await syncToDrive(env, trailerId, trailerName, records);
    return new Response(JSON.stringify(record), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Put maintenance error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleDeleteMaintenance(request, env, trailerId, recordId) {
  const cors = getCors(request);
  try {
    await env.IRONG_KV.delete('maintenance:' + trailerId + ':' + recordId);
    const records = await getAllMaintenanceRecords(env, trailerId);
    const trailerName = await getTrailerName(env, trailerId);
    await syncToDrive(env, trailerId, trailerName, records);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Delete maintenance error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetMaintenanceSummary(request, env, trailerId) {
  const cors = getCors(request);
  try {
    const records = await getAllMaintenanceRecords(env, trailerId);
    let totalCost = 0;
    let lastService = null;
    let upcomingService = null;
    for (const r of records) {
      const cost = parseFloat(r.totalCost) || ((parseFloat(r.laborCost) || 0) + (parseFloat(r.partsCost) || 0));
      totalCost += cost;
      if (r.date && (!lastService || r.date > lastService)) lastService = r.date;
      if (r.nextServiceDue && (!upcomingService || r.nextServiceDue < upcomingService)) upcomingService = r.nextServiceDue;
    }
    return new Response(JSON.stringify({
      totalCost: Math.round(totalCost * 100) / 100,
      recordCount: records.length,
      lastService,
      upcomingService,
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Maintenance summary error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── MAINTENANCE ANALYTICS & EXPORT ────────────────────

function csvField(val) {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function isMaintenanceRecordKey(kvKey) {
  // Record keys: maintenance:{trailerId}:{recordId} — contain two colons after prefix
  return kvKey.slice('maintenance:'.length).includes(':');
}

async function handleGetMaintenanceSummaryAll(request, env) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'maintenance:' });
    const recordKeys = list.keys.filter(k => isMaintenanceRecordKey(k.name));

    const entries = await Promise.all(
      recordKeys.map(async k => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );
    const allRecords = entries.filter(Boolean);

    const trailerIds = new Set(allRecords.map(r => r.trailerId).filter(Boolean));
    const trailerNames = {};
    await Promise.all([...trailerIds].map(async tid => {
      trailerNames[tid] = await getTrailerName(env, tid);
    }));

    const today = new Date().toISOString().slice(0, 10);
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let totalCost = 0;
    const byTrailer = {};
    const byMonth = {};
    const byServiceType = {};
    const upcomingService = [];
    const overdueService = [];

    for (const r of allRecords) {
      const tid = r.trailerId;
      if (!tid) continue;

      const cost = parseFloat(r.totalCost) || ((parseFloat(r.laborCost) || 0) + (parseFloat(r.partsCost) || 0));
      totalCost += cost;

      if (!byTrailer[tid]) {
        byTrailer[tid] = {
          trailerName: r.trailerName || trailerNames[tid] || tid,
          totalCost: 0,
          recordCount: 0,
          lastServiceDate: null,
          nextServiceDue: null,
          avgCostPerRecord: 0,
        };
      }
      byTrailer[tid].totalCost += cost;
      byTrailer[tid].recordCount += 1;
      if (r.date && (!byTrailer[tid].lastServiceDate || r.date > byTrailer[tid].lastServiceDate)) {
        byTrailer[tid].lastServiceDate = r.date;
      }
      if (r.nextServiceDue && (!byTrailer[tid].nextServiceDue || r.nextServiceDue < byTrailer[tid].nextServiceDue)) {
        byTrailer[tid].nextServiceDue = r.nextServiceDue;
      }

      if (r.date && r.date.length >= 7) {
        const month = r.date.slice(0, 7);
        if (!byMonth[month]) byMonth[month] = { totalCost: 0, recordCount: 0 };
        byMonth[month].totalCost += cost;
        byMonth[month].recordCount += 1;
      }

      const st = r.serviceType || 'Unknown';
      if (!byServiceType[st]) byServiceType[st] = { count: 0, totalCost: 0 };
      byServiceType[st].count += 1;
      byServiceType[st].totalCost += cost;

      if (r.nextServiceDue) {
        const entry = {
          trailerId: tid,
          trailerName: r.trailerName || trailerNames[tid] || tid,
          nextServiceDue: r.nextServiceDue,
          serviceType: r.serviceType || '',
          recordId: r.id,
        };
        if (r.nextServiceDue < today) {
          overdueService.push(entry);
        } else if (r.nextServiceDue <= in60Days) {
          upcomingService.push(entry);
        }
      }
    }

    for (const tid of Object.keys(byTrailer)) {
      const bt = byTrailer[tid];
      bt.totalCost = Math.round(bt.totalCost * 100) / 100;
      bt.avgCostPerRecord = bt.recordCount > 0 ? Math.round((bt.totalCost / bt.recordCount) * 100) / 100 : 0;
    }
    for (const month of Object.keys(byMonth)) {
      byMonth[month].totalCost = Math.round(byMonth[month].totalCost * 100) / 100;
    }
    for (const st of Object.keys(byServiceType)) {
      byServiceType[st].totalCost = Math.round(byServiceType[st].totalCost * 100) / 100;
    }

    upcomingService.sort((a, b) => a.nextServiceDue.localeCompare(b.nextServiceDue));
    overdueService.sort((a, b) => a.nextServiceDue.localeCompare(b.nextServiceDue));

    return new Response(JSON.stringify({
      totalCost: Math.round(totalCost * 100) / 100,
      totalRecords: allRecords.length,
      byTrailer,
      byMonth,
      byServiceType,
      upcomingService,
      overdueService,
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Maintenance summary all error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetMaintenanceAll(request, env) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'maintenance:' });
    const entries = await Promise.all(
      list.keys
        .filter(k => isMaintenanceRecordKey(k.name))
        .map(async k => {
          const val = await env.IRONG_KV.get(k.name);
          try { return JSON.parse(val); } catch { return null; }
        })
    );
    const records = entries.filter(Boolean).sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return (b.id || 0) - (a.id || 0);
    });
    return new Response(JSON.stringify(records), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Maintenance all error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetMaintenanceExport(request, env, trailerId) {
  const cors = getCors(request);
  try {
    let records;
    if (trailerId === 'all') {
      const list = await env.IRONG_KV.list({ prefix: 'maintenance:' });
      const entries = await Promise.all(
        list.keys
          .filter(k => isMaintenanceRecordKey(k.name))
          .map(async k => {
            const val = await env.IRONG_KV.get(k.name);
            try { return JSON.parse(val); } catch { return null; }
          })
      );
      records = entries.filter(Boolean);
    } else {
      records = await getAllMaintenanceRecords(env, trailerId);
    }

    records.sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return (b.id || 0) - (a.id || 0);
    });

    const trailerNames = {};
    const trailerIds = new Set(records.map(r => r.trailerId).filter(Boolean));
    await Promise.all([...trailerIds].map(async tid => {
      trailerNames[tid] = await getTrailerName(env, tid);
    }));

    const headerRow = ['Date','Trailer','Service Type','Description','Parts Used','Labor Cost','Parts Cost','Total Cost','Vendor Name','Vendor Phone','Invoice Ref','Performed By','Rental Count at Service','Next Service Due','Notes','Created At'].map(csvField).join(',');

    const dataRows = records.map(r => {
      const tName = r.trailerName || trailerNames[r.trailerId] || r.trailerId || '';
      return [
        r.date || '',
        tName,
        r.serviceType || '',
        r.description || '',
        r.partsUsed || '',
        r.laborCost != null ? String(r.laborCost) : '',
        r.partsCost != null ? String(r.partsCost) : '',
        r.totalCost != null ? String(r.totalCost) : '',
        r.vendorName || r.vendor || '',
        r.vendorPhone || '',
        r.invoiceRef || '',
        r.performedBy || '',
        r.rentalCountAtService != null ? String(r.rentalCountAtService) : '',
        r.nextServiceDue || '',
        r.notes || '',
        r.createdAt || '',
      ].map(csvField).join(',');
    });

    const csv = [headerRow, ...dataRows].join('\r\n');
    const today = new Date().toISOString().slice(0, 10);
    const filename = 'maintenance-log-' + trailerId + '-' + today + '.csv';

    return new Response(csv, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
      },
    });
  } catch (err) {
    console.error('[IronG] Maintenance export error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── RECEIPT SCANNING ───────────────────────────────────

async function handleScanReceipt(request, env) {
  const cors = getCors(request);
  try {
    const { imageBase64, mimeType } = await request.json();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: 'Extract receipt data and return ONLY valid JSON with fields: vendorName, vendorPhone, invoiceRef, laborCost, partsCost, totalCost, date, notes — use null for any field not found',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: 'Extract the receipt data from this image.' },
          ],
        }],
      }),
    });

    if (!res.ok) {
      console.error('[IronG] Anthropic API error:', await res.text());
      return new Response(JSON.stringify({ error: 'Failed to scan receipt' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    let parsed;
    try {
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { vendorName: null, vendorPhone: null, invoiceRef: null, laborCost: null, partsCost: null, totalCost: null, date: null, notes: null };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Scan receipt error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── TRAILER NAME HANDLERS ──────────────────────────────

async function handleGetTrailers(request, env) {
  const cors = getCors(request);
  const defaults = [
    { id: 'utility', name: 'Utility Trailer' },
    { id: 'hauler', name: 'Car Hauler' },
  ];
  try {
    const list = await env.IRONG_KV.list({ prefix: 'trailer:' });
    const nameKeys = list.keys.filter(k => {
      const parts = k.name.slice('trailer:'.length).split(':');
      return parts.length === 2 && parts[1] === 'name';
    });

    if (nameKeys.length === 0) {
      return new Response(JSON.stringify(defaults), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const stored = await Promise.all(
      nameKeys.map(async (k) => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );
    const storedMap = new Map(stored.filter(Boolean).map(t => [t.id, t]));

    const result = defaults.map(d => storedMap.get(d.id) || d);
    for (const t of stored.filter(Boolean)) {
      if (!defaults.find(d => d.id === t.id)) result.push(t);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get trailers error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePostTrailerName(request, env, id) {
  const cors = getCors(request);
  try {
    const { name } = await request.json();
    if (!name) {
      return new Response(JSON.stringify({ error: 'name is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const trailer = { id, name };
    await env.IRONG_KV.put('trailer:' + id + ':name', JSON.stringify(trailer));
    return new Response(JSON.stringify(trailer), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Post trailer name error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── EXPENSE HANDLERS ───────────────────────────────────

async function handlePostExpense(request, env) {
  const cors = getCors(request);
  try {
    const body = await request.json();
    const id = body.id || Date.now();
    const record = { ...body, id };
    await env.IRONG_KV.put('expense:' + id, JSON.stringify(record));
    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Post expense error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetExpenses(request, env) {
  const cors = getCors(request);
  const url = new URL(request.url);
  const monthFilter = url.searchParams.get('month');
  const categoryFilter = url.searchParams.get('category');
  const yearFilter = url.searchParams.get('year');
  try {
    const list = await env.IRONG_KV.list({ prefix: 'expense:' });
    const entries = await Promise.all(
      list.keys.map(async k => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );
    let records = entries.filter(Boolean);
    if (monthFilter) records = records.filter(r => r.date && r.date.startsWith(monthFilter));
    if (yearFilter) records = records.filter(r => r.date && r.date.startsWith(yearFilter));
    if (categoryFilter) records = records.filter(r => r.category === categoryFilter);
    records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return new Response(JSON.stringify(records), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get expenses error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetExpense(request, env, id) {
  const cors = getCors(request);
  try {
    const val = await env.IRONG_KV.get('expense:' + id);
    if (!val) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(val, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get expense error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePutExpense(request, env, id) {
  const cors = getCors(request);
  try {
    const existing = await env.IRONG_KV.get('expense:' + id);
    const current = existing ? JSON.parse(existing) : {};
    const updates = await request.json();
    const record = { ...current, ...updates };
    await env.IRONG_KV.put('expense:' + id, JSON.stringify(record));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Put expense error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleDeleteExpense(request, env, id) {
  const cors = getCors(request);
  try {
    await env.IRONG_KV.delete('expense:' + id);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Delete expense error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetExpenseSummary(request, env) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'expense:' });
    const entries = await Promise.all(
      list.keys.map(async k => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );
    const records = entries.filter(Boolean);

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    let totalExpenses = 0;
    const byCategory = {};
    const byMonth = {};
    let taxDeductibleTotal = 0;
    let currentMonthTotal = 0;
    let lastMonthTotal = 0;

    for (const r of records) {
      const amount = parseFloat(r.amount) || 0;
      totalExpenses += amount;

      const cat = r.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += amount;
      byCategory[cat].count += 1;

      if (r.date && r.date.length >= 7) {
        const month = r.date.slice(0, 7);
        if (!byMonth[month]) byMonth[month] = { total: 0, count: 0 };
        byMonth[month].total += amount;
        byMonth[month].count += 1;
      }

      if (r.taxDeductible) taxDeductibleTotal += amount;
      if (r.date && r.date.startsWith(currentMonth)) currentMonthTotal += amount;
      if (r.date && r.date.startsWith(lastMonth)) lastMonthTotal += amount;
    }

    const round2 = n => Math.round(n * 100) / 100;
    for (const cat of Object.keys(byCategory)) byCategory[cat].total = round2(byCategory[cat].total);
    for (const month of Object.keys(byMonth)) byMonth[month].total = round2(byMonth[month].total);

    return new Response(JSON.stringify({
      totalExpenses: round2(totalExpenses),
      byCategory,
      byMonth,
      taxDeductibleTotal: round2(taxDeductibleTotal),
      currentMonthTotal: round2(currentMonthTotal),
      lastMonthTotal: round2(lastMonthTotal),
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get expense summary error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetExpenseExport(request, env) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'expense:' });
    const entries = await Promise.all(
      list.keys.map(async k => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );
    const records = entries.filter(Boolean).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const header = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Vendor Name', 'Tax Deductible', 'Notes', 'Created At'];
    const rows = records.map(r => [
      r.date || '',
      r.category || '',
      r.description || '',
      r.amount != null ? String(r.amount) : '',
      r.paymentMethod || '',
      r.vendorName || '',
      r.taxDeductible ? 'Yes' : 'No',
      r.notes || '',
      r.createdAt || '',
    ].map(csvField).join(','));

    const csv = [header.map(csvField).join(','), ...rows].join('\r\n');
    const year = new Date().getFullYear();

    return new Response(csv, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="iron-g-expenses-${year}.csv"`,
      },
    });
  } catch (err) {
    console.error('[IronG] Expense export error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── REVENUE & TAX HANDLERS ─────────────────────────────

async function handleGetRevenueSummary(request, env) {
  const cors = getCors(request);
  try {
    const allBookings = await scanAllBookings(env);
    const qualifying = allBookings.filter(bk =>
      bk.status === 'complete' || bk.status === 'active' || bk.status === 'confirmed'
    );

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let totalDepositsHeld = 0;
    const byMonth = {};
    let cmRevenue = 0, cmTax = 0, cmCount = 0;
    let lmRevenue = 0, lmTax = 0, lmCount = 0;

    for (const bk of qualifying) {
      const rental = parseFloat(bk.rental) || 0;
      const addOnsTotal = parseFloat(bk.addOnsTotal) || 0;
      const tax = parseFloat(bk.tax) || 0;
      const dep = parseFloat(bk.dep) || 0;
      const rev = rental + addOnsTotal;

      totalRevenue += rev;
      totalTaxCollected += tax;
      if (bk.depositStatus === 'held') totalDepositsHeld += dep;

      const month = (bk.sd || '').slice(0, 7);
      if (month) {
        if (!byMonth[month]) byMonth[month] = { revenue: 0, taxCollected: 0, rentalCount: 0, depositCount: 0 };
        byMonth[month].revenue += rev;
        byMonth[month].taxCollected += tax;
        byMonth[month].rentalCount += 1;
        if (bk.depositStatus === 'held') byMonth[month].depositCount += 1;
        if (month === currentMonth) { cmRevenue += rev; cmTax += tax; cmCount += 1; }
        if (month === lastMonth) { lmRevenue += rev; lmTax += tax; lmCount += 1; }
      }
    }

    const expList = await env.IRONG_KV.list({ prefix: 'expense:' });
    const expEntries = await Promise.all(
      expList.keys.map(async k => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );
    let totalExpenses = 0;
    for (const e of expEntries.filter(Boolean)) totalExpenses += parseFloat(e.amount) || 0;

    const round2 = n => Math.round(n * 100) / 100;
    for (const m of Object.keys(byMonth)) {
      byMonth[m].revenue = round2(byMonth[m].revenue);
      byMonth[m].taxCollected = round2(byMonth[m].taxCollected);
    }

    return new Response(JSON.stringify({
      totalRevenue: round2(totalRevenue),
      totalTaxCollected: round2(totalTaxCollected),
      totalDepositsHeld: round2(totalDepositsHeld),
      byMonth,
      currentMonth: { revenue: round2(cmRevenue), taxCollected: round2(cmTax), rentalCount: cmCount },
      lastMonth: { revenue: round2(lmRevenue), taxCollected: round2(lmTax), rentalCount: lmCount },
      netProfit: round2(totalRevenue - totalExpenses),
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Revenue summary error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetTaxLiability(request, env) {
  const cors = getCors(request);
  try {
    const allBookings = await scanAllBookings(env);
    const qualifying = allBookings.filter(bk =>
      bk.status === 'complete' || bk.status === 'active' || bk.status === 'confirmed'
    );

    const byMonth = {};
    for (const bk of qualifying) {
      const month = (bk.sd || '').slice(0, 7);
      if (!month) continue;
      const tax = parseFloat(bk.tax) || 0;
      if (!byMonth[month]) byMonth[month] = { taxCollected: 0, rentalCount: 0 };
      byMonth[month].taxCollected += tax;
      byMonth[month].rentalCount += 1;
    }

    const today = new Date().toISOString().slice(0, 10);
    const currentMonthStr = today.slice(0, 7);
    const lmDate = new Date();
    lmDate.setDate(1);
    lmDate.setMonth(lmDate.getMonth() - 1);
    const lastMonthStr = lmDate.toISOString().slice(0, 7);

    function getDueDate(month) {
      const [y, m] = month.split('-').map(Number);
      return new Date(y, m, 20).toISOString().slice(0, 10);
    }

    const round2 = n => Math.round(n * 100) / 100;

    const byMonthArr = Object.entries(byMonth)
      .map(([month, data]) => ({
        month,
        taxCollected: round2(data.taxCollected),
        rentalCount: data.rentalCount,
        dueDate: getDueDate(month),
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const currentData = byMonth[currentMonthStr] || { taxCollected: 0, rentalCount: 0 };
    const lastData = byMonth[lastMonthStr] || { taxCollected: 0, rentalCount: 0 };
    const lastDueDate = getDueDate(lastMonthStr);

    let yearToDate = 0;
    const currentYear = currentMonthStr.slice(0, 4);
    for (const [month, data] of Object.entries(byMonth)) {
      if (month.startsWith(currentYear)) yearToDate += data.taxCollected;
    }

    return new Response(JSON.stringify({
      currentMonth: {
        month: currentMonthStr,
        taxCollected: round2(currentData.taxCollected),
        dueDate: getDueDate(currentMonthStr),
      },
      lastMonth: {
        month: lastMonthStr,
        taxCollected: round2(lastData.taxCollected),
        dueDate: lastDueDate,
        isPastDue: today > lastDueDate,
      },
      byMonth: byMonthArr,
      yearToDate: round2(yearToDate),
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Tax liability error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

// ── MILEAGE HANDLERS ───────────────────────────────────

async function handleGetMileage(request, env) {
  const cors = getCors(request);
  try {
    const list = await env.IRONG_KV.list({ prefix: 'mileage:' });
    const entries = await Promise.all(
      list.keys.map(async k => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );
    const records = entries.filter(Boolean).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return new Response(JSON.stringify(records), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Get mileage error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePostMileage(request, env) {
  const cors = getCors(request);
  try {
    const body = await request.json();
    const id = body.id || Date.now();
    const record = { ...body, id };
    await env.IRONG_KV.put('mileage:' + id, JSON.stringify(record));
    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Post mileage error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleDeleteMileage(request, env, id) {
  const cors = getCors(request);
  try {
    await env.IRONG_KV.delete('mileage:' + id);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Delete mileage error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetMileageSummary(request, env) {
  const cors = getCors(request);
  const IRS_RATE = 0.70;
  try {
    const list = await env.IRONG_KV.list({ prefix: 'mileage:' });
    const entries = await Promise.all(
      list.keys.map(async k => {
        const val = await env.IRONG_KV.get(k.name);
        try { return JSON.parse(val); } catch { return null; }
      })
    );
    const records = entries.filter(Boolean);

    let totalMiles = 0;
    const byMonth = {};
    let currentYearMiles = 0;
    const currentYear = new Date().getFullYear().toString();

    for (const r of records) {
      const miles = parseFloat(r.miles) || 0;
      totalMiles += miles;

      if (r.date && r.date.length >= 7) {
        const month = r.date.slice(0, 7);
        if (!byMonth[month]) byMonth[month] = { miles: 0, deduction: 0, tripCount: 0 };
        byMonth[month].miles += miles;
        byMonth[month].tripCount += 1;
      }

      if (r.date && r.date.startsWith(currentYear)) currentYearMiles += miles;
    }

    const round2 = n => Math.round(n * 100) / 100;
    for (const month of Object.keys(byMonth)) {
      byMonth[month].deduction = round2(byMonth[month].miles * IRS_RATE);
      byMonth[month].miles = round2(byMonth[month].miles);
    }

    return new Response(JSON.stringify({
      totalMiles: round2(totalMiles),
      totalDeduction: round2(totalMiles * IRS_RATE),
      byMonth,
      currentYear: {
        miles: round2(currentYearMiles),
        deduction: round2(currentYearMiles * IRS_RATE),
      },
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Mileage summary error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
