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
| Local Server | Flask dev server (V1–V2) / Gunicorn (V3 hosted) |

## Local Development

Each user pulls down the repo and runs the app on their own machine — no hosting required for V1 or V2.

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

### Running the app (two servers, for development)

As of V2, exporting a post that includes images calls a small Flask API
(`POST /api/export`) to bundle the Markdown and images into a `.zip`. During
development this means running **both** servers side by side:

```bash
# Terminal 1 — backend API (port 5000)
cd backend
source venv/bin/activate
python app.py
```

```bash
# Terminal 2 — frontend dev server (port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Vite
proxies any `/api/*` request to the Flask server on port 5000, so the app
talks to a single origin from the browser's point of view.

> If the Flask server isn't running, exporting a post with **no** images
> still works (it's a plain client-side `.md` download). Exporting a post
> **with** images requires Flask to be running, since it needs the server
> to build the `.zip`; the Export button will show "Export failed" with a
> tooltip if the request can't reach the backend.

### Build and serve via Flask (single server)

```bash
cd frontend
npm run build

cd ../backend
source venv/bin/activate
python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser. Flask
serves the built frontend and the `/api/export` route from the same origin,
so no proxy is needed.

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
