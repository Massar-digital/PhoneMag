# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Backend (Django)
- **Install Python dependencies**
  ```bash
  pip install -r backend/requirements.txt
  ```
- **Create/Update database schema**
  ```bash
  python manage.py makemigrations   # generate migration files
  python manage.py migrate          # apply migrations
  ```
- **Run development server**
  ```bash
  python manage.py runserver
  ```
- **Run backend tests** (pytest configured)
  ```bash
  pytest
  ```
- **Open a Django shell**
  ```bash
  python manage.py shell
  ```
- **Collect static files (for production)**
  ```bash
  python manage.py collectstatic
  ```

### Frontend (Vite + React)
- **Install JavaScript dependencies**
  ```bash
  cd frontend-vite
  npm install
  ```
- **Start Vite dev server**
  ```bash
  npm run dev
  ```
- **Build for production**
  ```bash
  npm run build
  ```
- **Run linting**
  ```bash
  npm run lint
  ```
- **Run unit tests (Vitest)**
  ```bash
  npm run test          # watch mode
  npm run test:run      # single run with coverage
  npm run test:coverage # run with coverage report
  ```
- **Run the Electron wrapper (bundles frontend + backend)**
  ```bash
  npm run electron:dev   # builds frontend then starts Electron
  ```

### Combined Development Workflow
1. `pip install -r backend/requirements.txt` (once).
2. `cd frontend-vite && npm install` (once).
3. Run the backend server (`python manage.py runserver`).
4. In another terminal, start the frontend (`npm run dev`).
5. For full desktop experience, use `npm run electron:dev` which builds the frontend and launches the Electron app with the bundled Django backend.

## High‑Level Architecture

- **Frontend (Vite React)** – Located under `frontend-vite/src`. It uses Vite for fast hot‑module reloading, React for UI, Tailwind for styling, and Axios (`frontend-vite/src/services/api.jsx`) for communicating with the backend API. The API service automatically detects the host IP and uses port **8000** for the Django server.

- **Backend (Django + DRF)** – Root package `backend`. Configuration lives in `backend/config`. Settings are loaded via `python-decouple` from a `.env` file and support both SQLite (local) and PostgreSQL (production). The project follows a **modular app layout** (`apps/*`) for distinct domains:
  - `apps.core` – shared utilities and pagination.
  - `apps.authentication` – JWT auth, throttling, and user‑related endpoints.
  - `apps.phones` – phone inventory models, serializers, and viewsets.
  - `apps.sales` – sales, returns, and related business logic (e.g., `ProductReturnItem.clean` contains the fallback logic for legacy sales).
  - `apps.inventory`, `apps.shop`, etc., each encapsulating their domain.

  The API is built with **Django REST Framework** and documented via **drf‑spectacular** (see `SPECTACULAR_SETTINGS`). JWT authentication is configured (`rest_framework_simplejwt`). CORS is explicitly allowed for local development IPs and can be extended via environment variables.

- **Electron Wrapper** – Defined in `package.json` scripts. When building (`npm run build`), Vite outputs static files that Electron serves. The Electron build configuration (`package.json > build > extraResources`) copies the backend source into the packaged app, enabling the desktop version to run the Django server from the bundled `backend` directory.

- **Environment Variables** – Managed with `python-decouple`. Key variables include `SECRET_KEY`, `DEBUG`, `CORS_ALLOWED_ORIGINS`, `IMEI_VALIDATION_*`, and standard Django/email settings. A `.env` file is present at the repository root for local development.

- **Testing Stack** – Frontend tests use Vitest with React Testing Library. Backend tests can be run with `pytest` (configured in `backend/pytest.ini`). No test suite is present yet, but the scaffolding is ready.

- **Static & Media Files** – `STATIC_ROOT` and `MEDIA_ROOT` are configured to work both in development and in the Electron bundled environment. Media files are stored alongside the SQLite DB when running inside Electron.

- **Security** – The settings include comprehensive headers (CSP, HSTS, X‑Frame‑Options, etc.) and CSRF protection configured for AJAX usage. CORS origins are driven by environment variables.

---

Feel free to add or adjust commands as the project evolves.