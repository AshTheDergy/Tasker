# Tasker 

A social task-management app with family/group competition features.

---

This code is not made to be run on local machine directly, some changes in configs need to be made beforehand, will be updated accordingly.

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- An [Airtable](https://airtable.com) account with a configured base

---

## Getting Started

### 1 · Set up your environment

Create a `.env` file in the **root** of the repository using the template below:

```env
AIRTABLE_TOKEN=
AIRTABLE_BASE_ID=
BASE_URL=
ALLOWED_ORIGINS=
PORT=5001
FLASK_SECRET_KEY=

# OAuth providers (fill in only the ones you intend to use)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

X_CLIENT_ID=
X_CLIENT_SECRET=

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

> **Tip:** `ALLOWED_ORIGINS` should be a comma-separated list of the origins that are allowed to reach the API (e.g. `http://localhost:5173,https://yourapp.com`). `BASE_URL` is the public-facing URL of the backend.

---

### 2 · Start the backend

```bash
cd server
pip install -r requirements.txt
python main.py
```

The Flask server will start on the port defined in your `.env` (default **5001**).

---

### 3 · Start the frontend

Open a **separate terminal**, then:

```bash
cd client
npm install
npm run build
npm run dev
```

The Vite dev server will start at **http://localhost:5173** by default.

---

## Project Structure

```
tasker/
├── .env             ← create this
├── server/          # Python / Flask backend
│   ├── main.py
│   └── requirements.txt
└── client/          # React / Vite frontend
    ├── src/
    └── package.json
```

---

## Environment Variable Reference

| Variable | Description |
|---|---|
| `AIRTABLE_TOKEN` | Personal access token from Airtable |
| `AIRTABLE_BASE_ID` | ID of your Airtable base (starts with `app`) |
| `BASE_URL` | Public URL of the backend (e.g. `https://api.yourapp.com`) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |
| `PORT` | Port the Flask server listens on (default `5001`) |
| `FLASK_SECRET_KEY` | Random secret string for Flask sessions |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Google OAuth credentials |
| `FACEBOOK_CLIENT_ID` / `_SECRET` | Facebook OAuth credentials |
| `X_CLIENT_ID` / `_SECRET` | X (Twitter) OAuth credentials |
| `DISCORD_CLIENT_ID` / `_SECRET` | Discord OAuth credentials |

---

> OAuth providers are all optional — only configure the ones you plan to offer as login options.
