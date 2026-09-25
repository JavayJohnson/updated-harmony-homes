import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('./harmony_homes_site/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const failure = 'Your message could not be sent. Please try again later or call 844-227-3701.';

export function createApp({ env = process.env, send = fetch, logger = console } = {}) {
  // Global limits also cap abuse across changing IPs. Single-instance, in-memory.
  let attempts = [];
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const json = (status, message) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ message }));
    };
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/health') return json(200, 'OK');
      if (pathname === '/api/contact') {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(405, 'Use POST.'); }
        const origins = (env.PUBLIC_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim());
        if (!origins.includes(req.headers.origin)) return json(403, 'Please submit from our website.');
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') return json(415, 'Use JSON.');
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
          if (Buffer.byteLength(body) > 16384) return json(413, 'Message is too large.');
        }
        let data;
        try { data = JSON.parse(body); } catch { return json(400, 'Invalid submission.'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) return json(400, 'Invalid submission.');
        if (data.website) return json(400, 'Invalid submission.');
        const limits = { first_name: 80, last_name: 80, email: 254, phone: 40, message: 5000 };
        for (const [key, max] of Object.entries(limits)) {
          if (typeof data[key] !== 'string' || data[key].length > max) return json(400, 'Please check your form fields.');
          data[key] = data[key].trim();
        }
        if (!data.first_name || !data.last_name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
            [data.first_name, data.last_name, data.phone].some(s => /[\r\n\x00]/.test(s))) {
          return json(400, 'Please provide your name, a valid email address, and a message.');
        }
        if (!env.RESEND_API_KEY || !env.CONTACT_FROM || !env.CONTACT_TO) {
          logger.error('Contact email: missing RESEND_API_KEY, CONTACT_FROM, or CONTACT_TO. Check the root .env and restart npm start.');
          return json(503, failure);
        }
        const now = Date.now();
        attempts = attempts.filter(t => now - t < 86400000);
        if (attempts.length >= 90 || attempts.filter(t => now - t < 60000).length >= 5) {
          res.setHeader('Retry-After', attempts.length >= 90 ? '86400' : '60');
          return json(429, 'We are receiving too many messages. Please try later or call 844-227-3701.');
        }
        attempts.push(now);
        try {
          const result = await send('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: data.email,
              subject: 'New Harmony Homes website inquiry',
              text: `Name: ${data.first_name} ${data.last_name}\nEmail: ${data.email}\nPhone: ${data.phone || 'Not provided'}\n\n${data.message}`
            }),
            signal: AbortSignal.timeout(15000)
          });
          const payload = await result.json();
          if (!result.ok || !payload.id) {
            // Log only known error codes, never provider text, credentials, or form answers.
            const hints = {
              validation_error: 'Check the sender domain is verified and the recipient is allowed by the Resend account.',
              restricted_api_key: 'Check the sending permission and domain scope of your Resend key.',
              invalid_api_key: 'Replace the Resend key and restart the server.',
              missing_api_key: 'Configure the Resend key and restart the server.',
              rate_limit_exceeded: 'Resend rate limit reached. Wait before retrying.',
              daily_quota_exceeded: 'Resend daily sending quota reached.',
              monthly_quota_exceeded: 'Resend monthly sending quota reached.'
            };
            const code = Object.hasOwn(hints, payload.name) ? payload.name : 'provider_error';
            logger.error(`Contact email: Resend HTTP ${result.status}, ${code}. ${hints[code] || 'Check the Resend dashboard for the failed request and domain verification status.'}`);
            return json(502, failure);
          }
          return json(200, 'Thank you! Your message has been submitted. We will be in touch soon.');
        } catch {
          logger.error('Contact email: could not complete the Resend request. Check internet access and provider availability.');
          return json(502, failure);
        }
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(405, 'Method not allowed.');
      const file = resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root.endsWith(sep) ? root : root + sep) || !types[extname(file)]) return json(404, 'Not found.');
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      json(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400, 'Request could not be completed.');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createApp().listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Harmony Homes server is ready.'));
}
