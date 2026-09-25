# Harmony Homes website

The HTML/CSS site is served by a dependency-free Node 24 backend. The contact form sends to `/api/contact`, which sends email through Resend. The Google Forms waitlist and payment links remain external links.

## Activate email

1. Create a free account at https://resend.com. Its free transactional tier allows 3,000 emails/month and 100/day: https://resend.com/pricing.
2. Verify a sending subdomain you own, such as `send.harmonyhomeslivingllc.com`, using Resend's DNS records. Keep your existing mailbox DNS records intact. See https://resend.com/docs/dashboard/domains/introduction.
3. Create a sending API key restricted to that domain. Put it in `RESEND_API_KEY` in the host's secret environment settings. Never put it in browser files or commit it.
4. Set `CONTACT_FROM` to `Harmony Homes <contact@send.harmonyhomeslivingllc.com>` using your verified domain, and `CONTACT_TO` to your receiving inbox. The visitor's email becomes Reply-To.
5. Set `PUBLIC_ORIGIN` to your exact website origin, e.g. `https://www.harmonyhomeslivingllc.com`. Multiple origins (including the Render URL if needed) can be comma-separated. No trailing slash.

Until configured, submissions show an error and retain the visitor's answers. Success means Resend accepted the email, not guaranteed inbox delivery. Check delivery logs and your inbox/spam folder after a live test.

## Run locally

Install Node 24. Copy `.env.example` to `.env`, fill in your settings, and run `npm start`. Open http://localhost:3000. Opening HTML directly or using a static Live Server does not run the backend.

Run `npm test` for automated tests with mocked delivery; no real emails are sent.

## Deploy on Render

Use a **Web Service**, not a Static Site. Import this repository with the included `render.yaml` Blueprint, or select Node manually with the repository root as the root directory, `npm install --package-lock-only --ignore-scripts` as the build command, and `npm start` as the start command. Set the environment values above, add your custom domain in Render, and update website DNS records as directed.

The Blueprint selects a free instance. Free web services sleep after 15 minutes without traffic and can take about a minute to wake, delaying the first page load. See https://render.com/docs/free. An always-on instance is paid. Resend's free allowance is separate from Render hosting.

## Safeguards and limits

The backend validates fields and request size, checks the browser origin, uses a honeypot, fixes the recipient server-side, and sends plain text. It does not log form answers or credentials. Provider requests time out; failed submissions retain answers in the page.

The single-process backend permits at most 5 provider attempts per minute and 90 per rolling day globally, including failures. Counters reset on restart/deploy and are not shared across instances, so they do not guarantee staying within provider quotas. Origin checks and honeypots are basic deterrents, not bot-proof protection. If traffic or abuse grows, add shared persistent rate limiting and stronger bot verification before scaling.

Live deployment and delivery require your Resend account, verified domain, API key, and hosting settings. No credentials are included.
