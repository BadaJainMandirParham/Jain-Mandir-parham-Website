Frontend production notes

Build
- `cd frontend`
- `npm install`
- `npm run build`

Environment
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` should be set in your hosting environment as required by the app.
- `FRONTEND_URL` should point to the public URL of the frontend.

Admin usage
- Log in via the app (Admin or Committee) to obtain a valid session token. The app stores `committeeToken` for committee/admin actions; the Admin panel uses this token when calling protected backend endpoints (export, receipt HTML/PDF).

Puppeteer / PDF
- PDF generation is implemented server-side in the backend. The frontend will download the PDF returned from `/api/donations/receipt-pdf/:id`.
- Ensure the backend has Puppeteer installed and working if you need PDF generation.
