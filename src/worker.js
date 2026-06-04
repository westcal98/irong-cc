const ALLOWED_ORIGINS = new Set([
  'https://irongequipment.com',
  'https://irong-cc.westcal98.workers.dev',
]);

function getCors(request) {
  const origin = request.headers.get('Origin') || '';
  const ao = ALLOWED_ORIGINS.has(origin) ? origin : 'https://irong-cc.westcal98.workers.dev';
  return {
    'Access-Control-Allow-Origin': ao,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
