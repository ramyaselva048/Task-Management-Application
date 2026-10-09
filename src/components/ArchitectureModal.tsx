import React, { useState } from 'react';
import { X, Server, Database, Cloud, Terminal, Check, Copy, ExternalLink, FileText } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'postgres' | 'deployment'>('overview');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="relative bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                System Architecture & Deployment Guide
              </h2>
              <p className="text-xs text-slate-500">FastAPI, PostgreSQL / Neon, Render & Vercel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Architecture Overview', icon: <Server className="w-3.5 h-3.5" /> },
            { id: 'api', label: 'FastAPI REST Endpoints', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'postgres', label: 'PostgreSQL & Neon Schema', icon: <Database className="w-3.5 h-3.5" /> },
            { id: 'deployment', label: 'Render & Vercel Setup', icon: <Cloud className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/70 text-blue-900">
                <h4 className="font-semibold text-sm mb-1">Full-Stack SaaS Architecture</h4>
                <p className="text-xs leading-relaxed text-blue-800">
                  Built strictly according to specifications with complete separation of concerns:
                  Python FastAPI backend with SQLAlchemy ORM, Pydantic data schemas, bcrypt hashing, and JWT bearer tokens, integrated with a responsive React + Vite + Tailwind CSS frontend.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Frontend Layer
                  </div>
                  <div className="font-semibold text-slate-800">React 19 + Vite</div>
                  <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                    <li>Tailwind CSS Modern UI</li>
                    <li>JWT Bearer Token Auth</li>
                    <li>Dashboard KPI Analytics</li>
                    <li>Lucide Icons & Toast alerts</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Backend Layer
                  </div>
                  <div className="font-semibold text-slate-800">Python FastAPI</div>
                  <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                    <li>SQLAlchemy 2.0 ORM</li>
                    <li>Pydantic v2 validation</li>
                    <li>Passlib bcrypt password hash</li>
                    <li>Python-Jose JWT tokens</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Database Layer
                  </div>
                  <div className="font-semibold text-slate-800">PostgreSQL / Neon</div>
                  <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                    <li>Users & Tasks relations</li>
                    <li>User isolation (ownership)</li>
                    <li>Cascading deletions</li>
                    <li>Foreign key indices</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                All endpoints require <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">Authorization: Bearer &lt;token&gt;</code> except Register & Login.
              </p>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 font-mono text-xs">
                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">POST</span>
                    <span className="font-semibold text-slate-800">/api/auth/register</span>
                  </div>
                  <span className="text-slate-400 font-sans text-xs">Creates account & returns JWT</span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">POST</span>
                    <span className="font-semibold text-slate-800">/api/auth/login</span>
                  </div>
                  <span className="text-slate-400 font-sans text-xs">Authenticates & returns JWT</span>
                </div>

                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded text-[10px]">GET</span>
                    <span className="font-semibold text-slate-800">/api/tasks</span>
                  </div>
                  <span className="text-slate-400 font-sans text-xs">Search, filter & sort user tasks</span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded text-[10px]">GET</span>
                    <span className="font-semibold text-slate-800">/api/tasks/stats/summary</span>
                  </div>
                  <span className="text-slate-400 font-sans text-xs">Computes total, pending, overdue</span>
                </div>

                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">POST</span>
                    <span className="font-semibold text-slate-800">/api/tasks</span>
                  </div>
                  <span className="text-slate-400 font-sans text-xs">Create task for current user</span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded text-[10px]">PUT</span>
                    <span className="font-semibold text-slate-800">/api/tasks/{'{id}'}</span>
                  </div>
                  <span className="text-slate-400 font-sans text-xs">Update title, due date, status</span>
                </div>

                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[10px]">DELETE</span>
                    <span className="font-semibold text-slate-800">/api/tasks/{'{id}'}</span>
                  </div>
                  <span className="text-slate-400 font-sans text-xs">Delete task (owner verified)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'postgres' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                SQL schema defined in <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">backend/models.py</code> using SQLAlchemy. Supports both Neon serverless PostgreSQL and standard PostgreSQL instances.
              </p>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs relative overflow-x-auto">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table (Cascade on User Delete)
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium' NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);`,
                      'sql'
                    )
                  }
                  className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded bg-slate-800"
                >
                  {copiedIndex === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre>{`-- PostgreSQL Schema with User Isolation
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium' NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'deployment' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span>1. Deploying Backend to Render</span>
                </h4>
                <p className="text-xs text-slate-600">
                  Connect your GitHub repository to Render and use the included <code className="bg-slate-200 px-1 py-0.5 rounded">render.yaml</code> or configure:
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs">
                  <div>Build Command: pip install -r requirements.txt</div>
                  <div>Start Command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>2. Neon PostgreSQL Database</span>
                </h4>
                <p className="text-xs text-slate-600">
                  Create a free project at <span className="font-semibold text-slate-700">Neon.tech</span>, copy the Connection String, and paste it as the <code className="bg-slate-200 px-1 py-0.5 rounded">DATABASE_URL</code> environment variable on Render.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Terminal className="w-4 h-4 text-purple-600" />
                  <span>3. Deploying Frontend to Vercel</span>
                </h4>
                <p className="text-xs text-slate-600">
                  Import repository in Vercel with framework preset Vite, and set:
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs">
                  <div>VITE_API_BASE_URL=https://your-render-backend-url.onrender.com/api</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
