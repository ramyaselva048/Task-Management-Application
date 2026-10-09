import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'super-secret-jwt-key-taskflow-ai-studio';

app.use(express.json());

// TiDB Cloud MySQL Configuration
const TIDB_URI =
  process.env.DATABASE_URL ||
  'mysql://4XXTzBfEArgpf8v.root:7owWoheWqVI3wLy7@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/taskflow';

let pool: Pool | null = null;
let useDatabase = false;

interface UserRecord {
  id: number;
  email: string;
  full_name: string;
  hashed_password: string;
  created_at: string;
  updated_at?: string;
}

interface TaskRecord {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// Fallback JSON in-memory store
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  users: UserRecord[];
  tasks: TaskRecord[];
  nextUserId: number;
  nextTaskId: number;
}

let fileDb: DatabaseSchema = {
  users: [],
  tasks: [],
  nextUserId: 1,
  nextTaskId: 1,
};

function initFileDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch {}
  }
  return { users: [], tasks: [], nextUserId: 1, nextTaskId: 1 };
}

fileDb = initFileDb();

async function initTiDB() {
  try {
    // Clean uri if starting with mysql+pymysql
    const cleanUri = TIDB_URI.replace('mysql+pymysql://', 'mysql://').split('?')[0];

    pool = mysql.createPool({
      uri: cleanUri,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('✓ Successfully connected to TiDB Cloud MySQL database!');

    // Ensure database and tables
    await connection.execute(`CREATE DATABASE IF NOT EXISTS taskflow;`);
    await connection.execute(`USE taskflow;`);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        due_date TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tasks_user_id (user_id),
        INDEX idx_tasks_status (status),
        INDEX idx_tasks_priority (priority),
        CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed Demo User if not exists
    const [existingUsers] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      ['demo@taskflow.dev']
    );

    if (existingUsers.length === 0) {
      const demoHashedPassword = bcrypt.hashSync('password123', 10);
      const [userResult] = await connection.execute<ResultSetHeader>(
        'INSERT INTO users (email, full_name, hashed_password) VALUES (?, ?, ?)',
        ['demo@taskflow.dev', 'Alex Johnson', demoHashedPassword]
      );
      const demoUserId = userResult.insertId;

      // Seed initial tasks
      const sampleTasks = [
        {
          title: 'Review Quarterly System Architecture & API Security',
          description: 'Conduct a thorough code audit of backend JWT auth, rate limits, and TiDB queries.',
          status: 'in_progress',
          priority: 'high',
          due_date: new Date(Date.now() + 2 * 86400000),
        },
        {
          title: 'Design Dark Mode & Accessible Color Palette',
          description: 'Ensure color contrast meets WCAG AAA standards for all status badges.',
          status: 'completed',
          priority: 'medium',
          due_date: new Date(Date.now() - 2 * 86400000),
        },
        {
          title: 'Implement Database Connection Pooling for TiDB',
          description: 'Configure SSL certificates and connection pool for optimal serverless performance.',
          status: 'pending',
          priority: 'high',
          due_date: new Date(Date.now() - 1 * 86400000), // overdue
        },
        {
          title: 'Draft User Onboarding Documentation and Guides',
          description: 'Create interactive guides for quick task creation and keyboard shortcuts.',
          status: 'in_progress',
          priority: 'low',
          due_date: new Date(Date.now() + 5 * 86400000),
        },
        {
          title: 'Setup Automated CI/CD Pipeline on Render & Vercel',
          description: 'Write GitHub actions workflow for linting and frontend build verification.',
          status: 'completed',
          priority: 'medium',
          due_date: new Date(Date.now() - 4 * 86400000),
        },
      ];

      for (const t of sampleTasks) {
        await connection.execute(
          'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
          [demoUserId, t.title, t.description, t.status, t.priority, t.due_date]
        );
      }
      console.log('✓ Seeded demo account in TiDB MySQL database.');
    }

    connection.release();
    useDatabase = true;
  } catch (err: unknown) {
    console.warn('⚠️ Could not connect to TiDB MySQL, falling back to local storage:', err);
    useDatabase = false;
  }
}

// Auth Middleware
interface AuthRequest extends Request {
  user?: UserRecord;
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or invalid authentication token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string | number };
    const userId = typeof payload.sub === 'number' ? payload.sub : parseInt(payload.sub, 10);

    if (useDatabase && pool) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, email, full_name, hashed_password, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );
      if (rows.length === 0) {
        return res.status(401).json({ detail: 'User no longer exists' });
      }
      const u = rows[0];
      req.user = {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        hashed_password: u.hashed_password,
        created_at: new Date(u.created_at).toISOString(),
        updated_at: u.updated_at ? new Date(u.updated_at).toISOString() : undefined,
      };
    } else {
      const user = fileDb.users.find((u) => u.id === userId);
      if (!user) {
        return res.status(401).json({ detail: 'User no longer exists' });
      }
      req.user = user;
    }

    next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

// ----------------- AUTH ENDPOINTS -----------------
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ detail: 'Email, password, and full name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ detail: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  if (useDatabase && pool) {
    try {
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [normalizedEmail]
      );
      if (existing.length > 0) {
        return res.status(400).json({ detail: 'An account with this email address already exists' });
      }

      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO users (email, full_name, hashed_password) VALUES (?, ?, ?)',
        [normalizedEmail, full_name.trim(), hashedPassword]
      );

      const userId = result.insertId;
      const token = jwt.sign({ sub: userId.toString() }, JWT_SECRET, { expiresIn: '24h' });

      return res.status(201).json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: userId,
          email: normalizedEmail,
          full_name: full_name.trim(),
          created_at: now,
        },
      });
    } catch (err: unknown) {
      console.error('Registration database error:', err);
      return res.status(500).json({ detail: 'Internal server error during registration' });
    }
  } else {
    const existing = fileDb.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ detail: 'An account with this email address already exists' });
    }

    const newUser: UserRecord = {
      id: fileDb.nextUserId++,
      email: normalizedEmail,
      full_name: full_name.trim(),
      hashed_password: hashedPassword,
      created_at: now,
      updated_at: now,
    };
    fileDb.users.push(newUser);
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2));

    const token = jwt.sign({ sub: newUser.id.toString() }, JWT_SECRET, { expiresIn: '24h' });
    return res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        created_at: newUser.created_at,
      },
    });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (useDatabase && pool) {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, email, full_name, hashed_password, created_at, updated_at FROM users WHERE email = ?',
        [normalizedEmail]
      );
      if (rows.length === 0) {
        return res.status(401).json({ detail: 'Incorrect email or password' });
      }

      const user = rows[0];
      if (!bcrypt.compareSync(password, user.hashed_password)) {
        return res.status(401).json({ detail: 'Incorrect email or password' });
      }

      const token = jwt.sign({ sub: user.id.toString() }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          created_at: new Date(user.created_at).toISOString(),
          updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : undefined,
        },
      });
    } catch (err: unknown) {
      console.error('Login error:', err);
      return res.status(500).json({ detail: 'Database error during login' });
    }
  } else {
    const user = fileDb.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || !bcrypt.compareSync(password, user.hashed_password)) {
      return res.status(401).json({ detail: 'Incorrect email or password' });
    }

    const token = jwt.sign({ sub: user.id.toString() }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  return res.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  });
});

// ----------------- USER PROFILE ENDPOINTS -----------------
app.get('/api/users/profile', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  return res.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  });
});

app.put('/api/users/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { full_name, email } = req.body;

  let newName = user.full_name;
  let newEmail = user.email;

  if (full_name !== undefined) {
    if (!full_name || full_name.trim().length < 2) {
      return res.status(400).json({ detail: 'Full name must be at least 2 characters long' });
    }
    newName = full_name.trim();
  }

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ detail: 'Please enter a valid email address' });
    }

    if (normalizedEmail !== user.email.toLowerCase()) {
      if (useDatabase && pool) {
        const [existing] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [normalizedEmail, user.id]
        );
        if (existing.length > 0) {
          return res.status(400).json({ detail: 'This email address is already in use by another account' });
        }
      } else {
        const existing = fileDb.users.find(
          (u) => u.email.toLowerCase() === normalizedEmail && u.id !== user.id
        );
        if (existing) {
          return res.status(400).json({ detail: 'This email address is already in use by another account' });
        }
      }
      newEmail = normalizedEmail;
    }
  }

  if (useDatabase && pool) {
    await pool.execute(
      'UPDATE users SET full_name = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [newName, newEmail, user.id]
    );
  } else {
    user.full_name = newName;
    user.email = newEmail;
    user.updated_at = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2));
  }

  return res.json({
    id: user.id,
    email: newEmail,
    full_name: newName,
    created_at: user.created_at,
    updated_at: new Date().toISOString(),
  });
});

app.put('/api/users/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ detail: 'Current and new password are required' });
  }

  if (!bcrypt.compareSync(current_password, user.hashed_password)) {
    return res.status(400).json({ detail: 'Current password does not match' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ detail: 'New password must be at least 6 characters' });
  }

  const newHashed = bcrypt.hashSync(new_password, 10);

  if (useDatabase && pool) {
    await pool.execute(
      'UPDATE users SET hashed_password = ?, updated_at = NOW() WHERE id = ?',
      [newHashed, user.id]
    );
  } else {
    user.hashed_password = newHashed;
    user.updated_at = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2));
  }

  return res.json({ message: 'Password updated successfully' });
});

// ----------------- TASK ENDPOINTS -----------------
app.get('/api/tasks/stats/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const now = new Date();

  if (useDatabase && pool) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status, due_date FROM tasks WHERE user_id = ?',
      [userId]
    );

    const total = rows.length;
    const pending = rows.filter((t) => t.status === 'pending').length;
    const in_progress = rows.filter((t) => t.status === 'in_progress').length;
    const completed = rows.filter((t) => t.status === 'completed').length;

    const overdue = rows.filter((t) => {
      if (t.status === 'completed' || !t.due_date) return false;
      const due = new Date(t.due_date);
      return due.getTime() < now.getTime();
    }).length;

    const completion_rate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

    return res.json({
      total,
      pending,
      in_progress,
      completed,
      overdue,
      completion_rate,
    });
  } else {
    const userTasks = fileDb.tasks.filter((t) => t.user_id === userId);
    const total = userTasks.length;
    const pending = userTasks.filter((t) => t.status === 'pending').length;
    const in_progress = userTasks.filter((t) => t.status === 'in_progress').length;
    const completed = userTasks.filter((t) => t.status === 'completed').length;
    const overdue = userTasks.filter((t) => {
      if (t.status === 'completed' || !t.due_date) return false;
      const due = new Date(t.due_date);
      return due.getTime() < now.getTime();
    }).length;
    const completion_rate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

    return res.json({
      total,
      pending,
      in_progress,
      completed,
      overdue,
      completion_rate,
    });
  }
});

app.get('/api/tasks', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { search, status, priority, sort_by = 'created_at', sort_order = 'desc' } = req.query;

  if (useDatabase && pool) {
    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params: (string | number)[] = [userId];

    if (search && typeof search === 'string' && search.trim() !== '') {
      query += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (priority && typeof priority === 'string' && priority !== 'all') {
      query += ' AND priority = ?';
      params.push(priority);
    }

    const isDesc = sort_order === 'desc' ? 'DESC' : 'ASC';
    if (sort_by === 'priority') {
      query += ` ORDER BY CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END ${isDesc}`;
    } else if (sort_by === 'due_date') {
      query += ` ORDER BY due_date ${isDesc}`;
    } else if (sort_by === 'title') {
      query += ` ORDER BY title ${isDesc}`;
    } else {
      query += ` ORDER BY created_at ${isDesc}`;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    const tasks = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      due_date: r.due_date ? new Date(r.due_date).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date(r.created_at).toISOString(),
    }));

    return res.json(tasks);
  } else {
    let tasks = fileDb.tasks.filter((t) => t.user_id === userId);
    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim().toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term))
      );
    }
    if (status && typeof status === 'string' && status !== 'all') {
      tasks = tasks.filter((t) => t.status === status);
    }
    if (priority && typeof priority === 'string' && priority !== 'all') {
      tasks = tasks.filter((t) => t.priority === priority);
    }

    const isDesc = sort_order === 'desc';
    const priorityWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
    tasks.sort((a, b) => {
      if (sort_by === 'priority') {
        const diff = (priorityWeights[a.priority] || 0) - (priorityWeights[b.priority] || 0);
        return isDesc ? -diff : diff;
      }
      if (sort_by === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        return isDesc ? -diff : diff;
      }
      if (sort_by === 'title') {
        const diff = a.title.localeCompare(b.title);
        return isDesc ? -diff : diff;
      }
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return isDesc ? -diff : diff;
    });

    return res.json(tasks);
  }
});

app.post('/api/tasks', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, description, status = 'pending', priority = 'medium', due_date } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ detail: 'Title is required' });
  }

  const validStatuses = ['pending', 'in_progress', 'completed'];
  const validPriorities = ['low', 'medium', 'high'];
  const cleanStatus = validStatuses.includes(status) ? status : 'pending';
  const cleanPriority = validPriorities.includes(priority) ? priority : 'medium';
  const parsedDueDate = due_date ? new Date(due_date) : null;

  if (useDatabase && pool) {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userId,
        title.trim(),
        description ? description.trim() : null,
        cleanStatus,
        cleanPriority,
        parsedDueDate,
      ]
    );

    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM tasks WHERE id = ?', [
      result.insertId,
    ]);
    const r = rows[0];

    return res.status(201).json({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      due_date: r.due_date ? new Date(r.due_date).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date(r.created_at).toISOString(),
    });
  } else {
    const now = new Date().toISOString();
    const newTask: TaskRecord = {
      id: fileDb.nextTaskId++,
      user_id: userId,
      title: title.trim(),
      description: description ? description.trim() : null,
      status: cleanStatus as 'pending' | 'in_progress' | 'completed',
      priority: cleanPriority as 'low' | 'medium' | 'high',
      due_date: due_date || null,
      created_at: now,
      updated_at: now,
    };
    fileDb.tasks.unshift(newTask);
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2));

    return res.status(201).json(newTask);
  }
});

app.get('/api/tasks/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const taskId = parseInt(req.params.id, 10);

  if (useDatabase && pool) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    const r = rows[0];
    return res.json({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      due_date: r.due_date ? new Date(r.due_date).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date(r.created_at).toISOString(),
    });
  } else {
    const task = fileDb.tasks.find((t) => t.id === taskId && t.user_id === userId);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    return res.json(task);
  }
});

app.put('/api/tasks/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const taskId = parseInt(req.params.id, 10);
  const { title, description, status, priority, due_date } = req.body;

  if (useDatabase && pool) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    const current = rows[0];
    const newTitle = title !== undefined ? title.trim() : current.title;
    const newDesc = description !== undefined ? (description ? description.trim() : null) : current.description;
    const newStatus = status !== undefined ? status : current.status;
    const newPriority = priority !== undefined ? priority : current.priority;
    const newDueDate = due_date !== undefined ? (due_date ? new Date(due_date) : null) : current.due_date;

    await pool.execute(
      'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [newTitle, newDesc, newStatus, newPriority, newDueDate, taskId, userId]
    );

    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );
    const r = updatedRows[0];
    return res.json({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      due_date: r.due_date ? new Date(r.due_date).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    });
  } else {
    const task = fileDb.tasks.find((t) => t.id === taskId && t.user_id === userId);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description ? description.trim() : null;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (due_date !== undefined) task.due_date = due_date;
    task.updated_at = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2));

    return res.json(task);
  }
});

app.patch('/api/tasks/:id/complete', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const taskId = parseInt(req.params.id, 10);

  if (useDatabase && pool) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT status FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    const nextStatus = rows[0].status === 'completed' ? 'pending' : 'completed';
    await pool.execute(
      'UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [nextStatus, taskId, userId]
    );

    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );
    const r = updatedRows[0];
    return res.json({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      due_date: r.due_date ? new Date(r.due_date).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    });
  } else {
    const task = fileDb.tasks.find((t) => t.id === taskId && t.user_id === userId);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    task.updated_at = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2));
    return res.json(task);
  }
});

app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const taskId = parseInt(req.params.id, 10);

  if (useDatabase && pool) {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    return res.status(204).send();
  } else {
    const index = fileDb.tasks.findIndex((t) => t.id === taskId && t.user_id === userId);
    if (index === -1) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    fileDb.tasks.splice(index, 1);
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2));
    return res.status(204).send();
  }
});

// Production / Dev Vite Integration
async function startServer() {
  await initTiDB();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaskFlow Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
