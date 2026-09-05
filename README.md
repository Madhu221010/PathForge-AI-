# PathForge AI

AI-powered personalized career roadmap platform for CoBuild 1.0.

## MVP flow

Resume / current skills + target career
→ AI skill-gap analysis
→ personalized learning roadmap
→ recommended resources + projects
→ progress tracking

## Proposed stack

- Frontend: React + Vite
- Backend: Node.js + Express
- AI: Google Gemini API (`@google/genai`)
- Database: MongoDB + Mongoose
- Resume parsing: PDF text extraction
- Styling: plain CSS

## Team branches

- `madhu-ui`
- `sumaiya-ai`
- `ojaswi-backend`

## Requirements

- Node.js 20.19+ recommended for the current Vite release.
- A Gemini API key.
- MongoDB Atlas connection string (optional for local demo; the server can run without MongoDB and keeps data in memory).

## 1. Install

Open a terminal in this project folder:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 2. Environment variables

Create `backend/.env`:

```env
PORT=5000
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3-flash-preview
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
CLIENT_URL=http://localhost:5173
```

If you do not have MongoDB yet, leave `MONGODB_URI=` empty. The app will still run for the demo, but generated roadmaps will not persist after a server restart.

## 3. Start backend

```bash
cd backend
npm run dev
```

Backend: http://localhost:5000

## 4. Start frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:5173

## 5. Test the MVP

1. Open the frontend.
2. Enter a target role such as `Frontend Developer`.
3. Add current skills such as `HTML, CSS, JavaScript`.
4. Add interests.
5. Optionally upload a text/PDF resume.
6. Click **Generate My Roadmap**.
7. Review skill gaps, roadmap, resources, projects and progress.

## GitHub workflow

After cloning the repo:

```bash
git checkout main
git pull origin main

git checkout -b madhu-ui
# work...
git add .
git commit -m "Build PathForge UI"
git push -u origin madhu-ui
```

Then open a Pull Request on GitHub from `madhu-ui` → `main`.

For teammates:

```bash
git checkout main
git pull origin main
git checkout -b sumaiya-ai
```

and

```bash
git checkout main
git pull origin main
git checkout -b ojaswi-backend
```

Do not push directly to `main`.

## Security

Never put `GEMINI_API_KEY` in the React frontend. It belongs only in `backend/.env`, which must not be committed.

The `.gitignore` already excludes `.env` and `node_modules`.
