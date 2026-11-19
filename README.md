# NexoneZ Attendance System: Frontend

React (Vite) web app for the NexoneZ Hub. It works on phones and desktops.

- **Employees and interns**: log in, check in/out, see their month, request leave, tasks, notices and payslips.
- **Students**: courses, lessons, assignments (upload files or links), daily and weekly quizzes, presentations
  (own topic, slides, marks), class attendance, progress and fees.
- **Teachers**: courses, batches, class attendance (Saturday and Sunday), quizzes, assignments, presentations and marking.
- **Admin**: dashboard, attendance board, people, batches, leave approval, reports, fees and payroll,
  projects, letters, office QR, settings and the **audit log**.

## Run locally

```bash
npm install
cp .env.example .env     # set VITE_API_URL to your backend, e.g. http://localhost:5000
npm run dev              # http://localhost:5173
```

## Deploy on Vercel

1. Push this folder to its own GitHub repo.
2. In Vercel choose **Add New, Project** and import the repo. Framework preset: **Vite** (auto-detected).
3. Add the environment variable `VITE_API_URL` with your Render backend URL (no trailing slash),
   for example `https://nexonez-attendance-api.onrender.com`.
4. Deploy. `vercel.json` already makes page refreshes and QR links (`/scan`) work.
5. Copy the Vercel URL into the backend's `CLIENT_URL` setting on Render (otherwise the browser blocks requests).

If you change `VITE_API_URL` later, redeploy the frontend so the new value is built in.

## Tests

```bash
npm test      # fee schedule maths (advance + monthly installments), no browser needed
```

## Using the QR check-in

Open **Office QR** (admin menu) on a screen at the office. Staff scan it with their normal phone camera.
The link opens `/scan`, asks them to log in once if needed, and records the check-in or check-out.
Turn on **QR code only** in Settings if you want to disable the Check in button completely.

## Branding

NexoneZ Time uses its own icon (`public/time-icon.svg`, `favicon.svg`) and shows the NexoneZ Software House icon (`public/nexonez-icon.png`) as "A product of NexoneZ Software House" (see `src/brand.jsx`). `public/logo.jpg` is the original NexoneZ logo. Colors and fonts live at the top of `src/styles.css` (CSS variables).

## Phones

The app is built for phones first: admins get a slide-in menu, staff get a bottom tab bar, tables turn into cards under 720px, and dialogs become bottom sheets (see the phone section at the end of `src/styles.css`, and `TableLabels` in `src/components.jsx`). Add `className="table cards"` to a new table to get the card layout on phones.
