const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://irongequipment.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
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

    return env.ASSETS.fetch(request);
  },
};

async function handleSubmit(request, env) {
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

    return new Response(JSON.stringify({ success: true, message: 'Received' }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[IronG] Submit error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
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
