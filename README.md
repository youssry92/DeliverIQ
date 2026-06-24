# DeliverIQ - Delivery Intelligence Dashboard

## Quick Start (Local)
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Deploy to Vercel (Free)
1. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "DeliverIQ v1"
   gh repo create deliveriq --public --push
   ```
   Or create repo at github.com and push manually.

2. Go to https://vercel.com → Sign in with GitHub
3. Click "Add New Project" → Select your repo
4. Click "Deploy" — done!

## Deploy to Netlify (Free)
1. Go to https://app.netlify.com
2. Drag the `dist/` folder onto the page
3. Done — instant deploy!

## How It Works
- **Upload CSV**: Drop your backlog/billing CSV on the upload screen
- **AI Maps Columns**: Auto-detects project refs, milestones, PMs, values
- **Dashboard Populates**: Portfolio, Revenue, PM Performance views
- **Data Persists**: Stored in localStorage — survives page refreshes
- **Demo Mode**: Click "Try Demo Mode" to see sample data

## Tech Stack
- React + Vite
- PapaParse (CSV parsing)
- localStorage (data persistence)
- Zero backend required
