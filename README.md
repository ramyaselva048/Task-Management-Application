# TaskFlow - Production Task Management SaaS

A full-stack, enterprise-grade **Task Management Application** built with **React 19 + Vite + Tailwind CSS** on the frontend, **Python FastAPI + SQLAlchemy + Pydantic** on the backend, and **PostgreSQL** for persistent relational storage.

---

## 🌟 Key Features

- **Authentication & Security:**
  - User registration, login, logout, and protected route access.
  - JWT Bearer Token authentication with 24-hour expiration.
  - Secure password hashing with `bcrypt`.
  - Strict user-level data isolation (users can only access and modify their own tasks).

- **Task Management (CRUD):**
  - Create, view, edit, delete, and toggle completion of tasks.
  - Comprehensive task fields: `title`, `description`, `status` (*pending*, *in_progress*, *completed*), `priority` (*low*, *medium*, *high*), and `due_date`.
  - Live full-text search across task titles and descriptions.
  - Filter tasks by status and priority.
  - Sort tasks by creation date, due date, priority, or title.
  - List View and Grid/Kanban view options.

- **Responsive Analytics Dashboard:**
  - Real-time statistics: Total Tasks, Pending, In Progress, Completed, Overdue, and Completion Rate.
  - Visual progress bar and overdue task alerts.
  - High Priority focus section for urgent deadlines.
  - Interactive metric cards with one-click filtering.

- **Account & Profile Settings:**
  - Editable full name with database synchronization.
  - Password update functionality with verification of current password.
  - Session details and account metrics.

- **Modern SaaS UI:**
  - Polished Tailwind CSS design with blue accents.
  - Lucide icons, responsive mobile drawer navigation, accessible modals, and toast alerts.

---

## 🏗️ Project Architecture

```
├── backend/                  # Python FastAPI Backend
│   ├── __init__.py
│   ├── main.py               # FastAPI entry point, CORS, and routing
│   ├── config.py             # Settings and environment configuration
│   ├── database.py           # SQLAlchemy engine & session factory
│   ├── models.py             # SQLAlchemy User and Task models
│   ├── schemas.py            # Pydantic v2 validation schemas
│   ├── auth.py               # JWT tokens, bcrypt hashing, and dependencies
│   ├── routers/              # Modular REST API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py           # /api/auth/register, /login, /me
│   │   ├── users.py          # /api/users/profile, /change-password
│   │   └── tasks.py          # /api/tasks (CRUD, filters, statistics)
│   └── .env.example
├── src/                      # React 19 Frontend
│   ├── components/           # Reusable UI components
│   │   ├── Navbar.tsx        # Responsive navigation & user menu
│   │   ├── TaskCard.tsx      # Task card with badges and action buttons
│   │   ├── TaskFormModal.tsx # Task creation and editing modal
│   │   ├── DeleteConfirmModal.tsx # Accessible delete confirmation
│   │   └── ArchitectureModal.tsx  # In-app architecture and deployment viewer
│   ├── context/              # React Context Providers
│   │   ├── AuthContext.tsx   # Global authentication state
│   │   └── ToastContext.tsx  # Toast notification system
│   ├── pages/                # Application views
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── TasksPage.tsx
│   │   └── ProfilePage.tsx
│   ├── services/
│   │   └── api.ts            # Centralized API service with JWT handling
│   ├── types/
│   │   └── index.ts          # TypeScript domain models and interfaces
│   ├── App.tsx               # Root application router
│   ├── main.tsx
│   └── index.css             # Tailwind CSS & keyframe animations
├── server.ts                 # Full-stack Node/Express runner for AI Studio live preview
├── requirements.txt          # Python backend dependencies
├── render.yaml               # Render Blueprint for backend + PostgreSQL
├── vercel.json               # Vercel deployment configuration
├── Dockerfile                # Production Docker container for FastAPI
└── package.json
```

---

## 🗄️ PostgreSQL Database Schema

```sql
-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table with User Foreign Key & Cascading Deletions
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium' NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for Query Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

---

## 🚀 Local Development Setup

### 1. Backend (FastAPI + PostgreSQL)

```bash
# 1. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables in .env
cat <<EOF > .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow_db
JWT_SECRET_KEY=your-super-secret-jwt-key-minimum-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF

# 4. Start the FastAPI server
uvicorn backend.main:app --reload --port 8000
```
The FastAPI interactive Swagger documentation is available at `http://localhost:8000/docs`.

### 2. Frontend (React + Vite)

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

---

## 🌐 Production Deployment Guide

### A. Database Deployment (Neon Serverless PostgreSQL)
1. Go to [Neon.tech](https://neon.tech) and create a new project `taskflow-prod`.
2. Copy the PostgreSQL connection string:
   `postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`

### B. Backend Deployment (Render)
1. Push this repository to GitHub.
2. In the Render Dashboard, select **New > Blueprint** and select your repository (uses the included `render.yaml`).
3. Alternatively, create a **Web Service**:
   - **Environment:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables:**
     - `DATABASE_URL`: *Your Neon PostgreSQL connection string*
     - `JWT_SECRET_KEY`: *Random 32+ character string*
     - `ACCESS_TOKEN_EXPIRE_MINUTES`: `1440`

### C. Frontend Deployment (Vercel)
1. Import your GitHub repository in [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-render-backend.onrender.com/api`

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | No |
| `GET` | `/api/auth/me` | Get profile of logged-in user | Yes |
| `GET` | `/api/users/profile` | Retrieve user profile details | Yes |
| `PUT` | `/api/users/profile` | Update user display name | Yes |
| `PUT` | `/api/users/change-password` | Verify current & set new password | Yes |
| `GET` | `/api/tasks/stats/summary` | Dashboard metrics (total, pending, overdue, etc.) | Yes |
| `GET` | `/api/tasks` | Get tasks with search, status/priority filter & sorting | Yes |
| `POST` | `/api/tasks` | Create a new task | Yes |
| `GET` | `/api/tasks/{id}` | Get single task by ID | Yes |
| `PUT` | `/api/tasks/{id}` | Update task title, description, priority, deadline | Yes |
| `PATCH`| `/api/tasks/{id}/complete` | Toggle complete / pending | Yes |
| `DELETE`| `/api/tasks/{id}` | Permanently delete task | Yes |

---

## 🔒 Security Best Practices
- Passwords are encrypted using salted `bcrypt`.
- All requests validate JWT bearer tokens.
- Cross-user data isolation is enforced at the database query layer.
- Cross-Origin Resource Sharing (CORS) is properly configured.
