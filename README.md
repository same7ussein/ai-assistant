# AI Learning Assistant

AI Learning Assistant is a full-stack study platform built with Angular and Node.js. Users can upload PDF documents, generate quizzes and exams, create flashcards, build study roadmaps and plans, track activity, and review analytics from one application.

## Stack

- Frontend: Angular 21, Angular Material, Tailwind CSS, Transloco
- Backend: Node.js, Express, MongoDB, Mongoose, JWT auth
- AI integration: Gemini with local fallback behavior in parts of the backend
- Deployment: Railway

## Main Features

- User registration and login
- PDF upload and document viewer
- AI chat and document-based learning tools
- Flashcard generation and flashcard batches
- Quiz generation from uploaded documents
- Exam generation with mixed question types
- Study roadmap and weekly study plan generation
- Study sessions and progress tracking
- Activity feed and analytics dashboard
- Profile management

## Project Structure

```text
backend/    Express API, MongoDB models, controllers, routes
frontend/   Angular application
package.json
railway.json
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection string

## Environment Variables

Create a `backend/.env` file for local development.

```env
PORT=3030
MONGODB_URI=mongodb://localhost:27017/ai-learning-assistant
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=
GEMINI_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite
```

Notes:

- The frontend development environment currently calls `http://localhost:3030/api`, so using `PORT=3030` locally keeps frontend and backend aligned.
- In production, the frontend uses `/api` and the Express app serves the built Angular app.
- `GEMINI_API_KEY` is optional. If it is missing, some generators fall back to local content generation.

## Install

Install dependencies for both apps:

```bash
npm install --prefix backend
npm install --prefix frontend
```

You can also install from the repository root with:

```bash
npm install
```

The root `postinstall` script installs both backend and frontend dependencies.

## Run Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm start
```

Local URLs:

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3030/api`
- Health check: `http://localhost:3030/api/health`

## Production Build

Build the Angular frontend:

```bash
cd frontend
npm run build
```

Or from the repository root:

```bash
npm run build
```

Start the production server from the root:

```bash
npm start
```

This starts the Express backend and serves the Angular build from `frontend/dist/frontend/browser` when the build output exists.

## API Overview

Main backend route groups:

- `/api/auth`
- `/api/ai`
- `/api/documents`
- `/api/flashcards`
- `/api/flashcard-batches`
- `/api/quiz-gen`
- `/api/document-quizzes`
- `/api/exam-gen`
- `/api/exams`
- `/api/study-roadmap`
- `/api/study-plan`
- `/api/study-sessions`
- `/api/activities`
- `/api/analytics`

## Deploy to Railway

This repository is prepared for single-service Railway deployment.

Railway uses:

- Build command: `npm run build`
- Start command: `npm start`
- Health check: `/api/health`

Deployment steps:

1. Push the repository to GitHub.
2. Create a new Railway project from the repo.
3. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, optional `GEMINI_API_KEY`, optional `GEMINI_MODELS`.
4. Deploy.

The root `package.json` installs backend and frontend dependencies, builds the Angular app, and starts the Express server.

## Current Notes

- The backend serves uploaded files from `/uploads`.
- The backend disables `etag` and sends `Cache-Control: no-cache, no-store, must-revalidate` headers.
- Rate limiting is present in the server but currently commented out.

## License

No license file is currently included in this repository.