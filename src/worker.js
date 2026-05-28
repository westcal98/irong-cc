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

    if (url.pathname === '/stripe/payment-link' && request.method === 'POST') {
      return handleStripePaymentLink(request, env);
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

async function handleStripePaymentLink(request, env) {
  const cors = getCors(request);
  try {
    const { amount, description, bookingId } = await request.json();
    const amountCents = Math.round(amount * 100);

    const res = await stripePost('/payment_links', {
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
    }, env.STRIPE_SECRET_KEY);

    const data = await res.json();
    if (!res.ok) {
      console.error('[IronG] Stripe payment-link error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: data.url, id: data.id }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] handleStripePaymentLink error:', err);
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
