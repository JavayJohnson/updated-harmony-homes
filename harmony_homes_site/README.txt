# Harmony Homes Independent Living, LLC Website

This HTML/CSS/JavaScript website now uses the Node backend in the repository root for contact email via Resend. Follow ../README.md for current setup and deployment instructions. Static-only hosting will not process the contact form.

## Pages Included
- Home
- About Us
- Rooms
- Amenities
- Waitlist
- Pay Rent
- Foundation
- Resources
- FAQ
- Contact Us

## What to Replace Before Launch

### Google Form
Open `apply.html` and replace:
https://forms.google.com/REPLACE-WITH-YOUR-GOOGLE-FORM-LINK

with your real Google Form link or embed iframe.

### Payment Link
Open `pay-rent.html` and replace:
https://buy.stripe.com/REPLACE-WITH-YOUR-STRIPE-PAYMENT-LINK

with your real Stripe Payment Link, PayPal link, or other approved payment URL.

### Logo
A web-safe SVG placeholder logo is included in `/assets/logo.svg`.
You can replace it with your final transparent PNG logo and update the image path in the HTML.

### Photos
Photos are stored in `/assets/`.
Replace with final approved photography if needed.

## Local Preview
Run `npm start` from the repository root, then open http://localhost:3000.

## Deployment
Deploy the full repository as a Node web service. See ../README.md and ../render.yaml.

## Brand Colors
- Malibu Blue: #008CC2
- Classic Green: #38A849
- Blazing Yellow: #FEE815
- Carrot Curl Orange: #F78D22
- Black: #111827
- White: #FFFFFF
