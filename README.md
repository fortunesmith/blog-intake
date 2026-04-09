# Developer Blog Markdown Editor

A purpose-built blog intake experience for contributing authors. Write directly in a familiar rich text editor — no Markdown knowledge required — and export clean, valid Markdown automatically.

## Stack

| Layer | Technology |
|---|---|
| Language | Python |
| Backend | Flask (scaffolded in V1, activated in V2) |
| Frontend | React (Vite) |
| Rich Text Editor | TipTap with tiptap-markdown extension |
| Styling | Tailwind CSS |
| Local Server | Flask dev server (V1) / Gunicorn (V3 hosted) |

## Local Development (V1)

V1 runs as a locally served web app. Each user pulls down the repo and runs the dev server on their own machine.

### Prerequisites

- Python 3.10+
- Node.js 20+ (Vite 8 requires Node 20.19+ or 22.12+)

### Setup

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend**

```bash
cd frontend
npm install
```

### Running the app

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> The Flask backend is scaffolded but has no active role in V1. All Markdown conversion happens client-side via TipTap.

### Build and serve via Flask (optional)

```bash
cd frontend
npm run build

cd ../backend
source venv/bin/activate
python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Project Structure

```
blog-intake/
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```
