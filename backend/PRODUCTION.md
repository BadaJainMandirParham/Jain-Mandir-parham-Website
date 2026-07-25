Production setup and deployment notes

Environment variables (important):
- `PORT` (optional) — server port
- `MONGODB_URI` — MongoDB connection string for production
- `JWT_SECRET` — strong secret used to sign JWTs (change from default)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — initial seeded admin credentials (optional)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Razorpay API credentials
- `DONATION_CURRENCY` — e.g., `INR`
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` or `RESEND_API_KEY` — mail provider credentials
- `FRONTEND_URL` — production frontend URL
- `CLOUDINARY_URL` or `CLOUDINARY_*` — optional Cloudinary config
- `APP_CONTENT_API_BASE_URL` / `APP_CONTENT_ADMIN_TOKEN` — optional remote content API

PDF generation (Puppeteer)
- The `/api/donations/receipt-pdf/:id` endpoint uses `puppeteer` to render HTML to PDF.
- Install Puppeteer in production if you require server-side PDF generation:
  - `npm install puppeteer --save`
  - In many Linux hosts you must provide additional Chromium dependencies and use `puppeteer-core` with a system Chrome. If using Docker, use an image that includes Chromium or add the required apt packages (fonts, libgtk, libx11, etc.).
  - If Puppeteer is not installed or fails to launch, the endpoint returns HTTP 501 with a helpful message.
  - The server will attempt these strategies (in order):
    1. Use `puppeteer` (or `puppeteer-core` with `PUPPETEER_EXECUTABLE_PATH`) when available.
    2. If `PUPPETEER` fails, call an external PDF service defined by `PDF_SERVICE_URL` (POST `{ html }` returning application/pdf).
    3. Finally, return HTML as a fallback so the client can Print → Save as PDF.

  Environment variables for PDF fallback:
  - `PUPPETEER_EXECUTABLE_PATH` — optional path to Chromium/Chrome binary when using `puppeteer-core`.
  - `PDF_SERVICE_URL` — optional URL of an external PDF generation service that accepts `{ html }` and returns PDF bytes.

Authentication and admin access
- Admin-protected endpoints (receipts, export, PDF, storage) require a valid JWT signed with `JWT_SECRET`.
- Create an admin user by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first run (the server will seed that user).
- After login via `/api/auth/login` you receive `{ session: { access_token } }`. Use `Authorization: Bearer <access_token>` for admin requests.
- Committee session tokens are issued via `/api/functions/committee-auth` and are signed with the same `JWT_SECRET`.

CSV exports
- Two endpoints exist for CSV export:
  - `GET /api/donations/export` — legacy, accepts query params
  - `POST /api/donations/export` — accepts JSON body `{ start_date, end_date, receipt_id, order_id, payment_id, status }` and returns a CSV attachment with a "Grand Total" row appended.

Paginated listing
- `POST /api/donations/list` accepts `{ page, limit, start_date, end_date, receipt_id, order_id, payment_id, status, search }` and returns `{ data, total, page, limit }` for admin UI pagination.

Security notes
- Use a strong `JWT_SECRET` and rotate if compromised.
- Ensure `FRONTEND_URL` and `CORS_ORIGINS` limit allowed origins.
- Do not commit secrets to version control.

Running locally
- Install dependencies in `backend` and `frontend`.
- Backend: `npm install` then `npm run build` then `node src/server.js` (or use a process manager).

Docker recommendations
- Use a base image with Chrome/Chromium for Puppeteer if PDFs are required (e.g., `puppeteer` official examples).
- Expose only the backend port and secure the instance behind a TLS-terminating proxy (nginx / cloud load balancer).
