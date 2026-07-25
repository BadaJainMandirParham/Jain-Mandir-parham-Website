# Bada Jain Mandir Parham MERN

Production-ready split project:

- `frontend`: React + Vite UI, same existing design.
- `backend`: Node.js + Express + MongoDB API, auth, Razorpay donations, Cloudinary/local uploads and Nodemailer email.

The website has its own MongoDB database. Only these content tables are synced from the app backend through the website backend proxy:

`gallery`, `projects`, `committee`, `committee_public`, `events`

Everything else is website-owned: website users, admin login, committee login, forget/reset password, roles, profiles, donations, receipts, notifications, contact messages, banners, announcements, promotions, recent work and live darshan settings.

## Local Setup

```bash
npm run install:all
npm run dev:backend
npm run dev:frontend
```

Frontend runs on `http://localhost:8080`.
Backend runs on `http://localhost:5000`.

Set real values in:

- `frontend/.env`
- `backend/.env`

Use `VITE_API_BASE_URL=http://localhost:5000/api` locally. On deploy, point it to the website backend URL, not the app backend.

## Render Backend

Use `backend` as the Root Directory, `npm ci` as Build Command and `npm start` as Start Command. Set the backend environment variables from `backend/.env.example`.

Important production env:

- `MONGODB_URI`: separate website MongoDB database
- `APP_CONTENT_API_BASE_URL`: app backend API for shared content fetches
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY` or `GMAIL_APP_PASSWORD`

## Production Build

```bash
npm run install:all
npm run build
```

### Netlify Frontend
- Build command: `npm --prefix frontend install && npm --prefix frontend run build`
- Publish directory: `frontend/dist`
- SPA routing: `frontend/public/_redirects`

### Render Backend
- Build command: `npm --prefix backend ci`
- Start command: `npm --prefix backend start`

For frontend hosting, set:

```bash
VITE_API_BASE_URL=https://YOUR-WEBSITE-BACKEND.onrender.com/api
```

Keep `frontend/.env` for local development only. Use the hosting provider's environment settings for production.

In production, Razorpay is strict: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` must be set. Local development can create mock orders when those keys are blank.
