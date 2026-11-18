import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORIES_DIR = path.join(__dirname, 'STORIES');
const DB_SQLITE_FILE = path.join(STORIES_DIR, 'database.sqlite');
const DB_JSON_FILE = path.join(STORIES_DIR, 'database.json');

// Ensure STORIES directory exists
if (!fs.existsSync(STORIES_DIR)) {
  fs.mkdirSync(STORIES_DIR, { recursive: true });
}

// Initialize SQLite with WAL (Write-Ahead Logging) mode for high-concurrency read/write
const db = new Database(DB_SQLITE_FILE);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// 1. Create Core Tables and High-Performance Indices
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    title TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT,
    data TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    category TEXT,
    status TEXT,
    data TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
  CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(category);
  CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);

  CREATE TABLE IF NOT EXISTS role_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    status TEXT,
    data TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT,
    created_at INTEGER
  );
`);

// 2. Prepared Statements for Maximum Performance
const stmts = {
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),

  getAllCategories: db.prepare('SELECT data FROM categories'),
  getCategory: db.prepare('SELECT data FROM categories WHERE id = ?'),
  upsertCategory: db.prepare('INSERT OR REPLACE INTO categories (id, title, data) VALUES (?, ?, ?)'),

  getAllRoles: db.prepare('SELECT data FROM roles'),

  getAllUsers: db.prepare('SELECT data FROM users'),
  getUserById: db.prepare('SELECT data FROM users WHERE id = ?'),
  getUserByEmail: db.prepare('SELECT data FROM users WHERE email = ?'),
  upsertUser: db.prepare('INSERT OR REPLACE INTO users (id, email, role, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),

  getAllStories: db.prepare('SELECT data FROM stories ORDER BY created_at DESC'),
  getStoryById: db.prepare('SELECT data FROM stories WHERE id = ?'),
  getStoriesByUser: db.prepare('SELECT data FROM stories WHERE user_id = ? ORDER BY created_at DESC'),
  getStoriesByCategory: db.prepare("SELECT data FROM stories WHERE category = ? AND status = 'published' ORDER BY created_at DESC"),
  upsertStory: db.prepare('INSERT OR REPLACE INTO stories (id, user_id, category, status, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  deleteStory: db.prepare('DELETE FROM stories WHERE id = ?'),

  getAllRoleRequests: db.prepare('SELECT data FROM role_requests ORDER BY created_at DESC'),
  getRoleRequestById: db.prepare('SELECT data FROM role_requests WHERE id = ?'),
  upsertRoleRequest: db.prepare('INSERT OR REPLACE INTO role_requests (id, user_id, status, data, created_at) VALUES (?, ?, ?, ?, ?)'),

  getAllTransactions: db.prepare('SELECT data FROM transactions ORDER BY created_at DESC'),
  upsertTransaction: db.prepare('INSERT OR REPLACE INTO transactions (id, user_id, data, created_at) VALUES (?, ?, ?, ?)')
};

// 3. Auto-seed or initial migration from JSON if SQLite is empty
function ensureInitialSeed() {
  const storyCount = db.prepare('SELECT COUNT(*) AS count FROM stories').get().count;
  if (storyCount === 0 && fs.existsSync(DB_JSON_FILE)) {
    try {
      console.log('[SQLite] Database is empty. Auto-migrating from existing database.json...');
      const raw = fs.readFileSync(DB_JSON_FILE, 'utf-8');
      const seed = JSON.parse(raw);

      if (seed.settings) {
        stmts.setSetting.run('general', JSON.stringify(seed.settings));
      }

      if (Array.isArray(seed.categories)) {
        const catTx = db.transaction((items) => {
          for (const c of items) {
            const rawTitle = c.title || c.titleAr || c.name || '';
            const title = typeof rawTitle === 'object' ? (rawTitle.ar || rawTitle.en || JSON.stringify(rawTitle)) : String(rawTitle);
            stmts.upsertCategory.run(String(c.id), title, JSON.stringify(c));
          }
        });
        catTx(seed.categories);
      }

      if (Array.isArray(seed.roles)) {
        const insertRole = db.prepare('INSERT OR REPLACE INTO roles (id, name, data) VALUES (?, ?, ?)');
        const roleTx = db.transaction((items) => {
          for (const r of items) {
            const rawName = r.name || r.id || '';
            const name = typeof rawName === 'object' ? (rawName.ar || rawName.en || JSON.stringify(rawName)) : String(rawName);
            insertRole.run(String(r.id || r.name), name, JSON.stringify(r));
          }
        });
        roleTx(seed.roles);
      }

      if (Array.isArray(seed.users)) {
        const userTx = db.transaction((items) => {
          for (const u of items) {
            const email = (u.email || '').toLowerCase().trim();
            const role = String(u.role || 'Student');
            const now = Date.now();
            stmts.upsertUser.run(String(u.id), email, role, JSON.stringify(u), Number(u.createdAt || now), Number(u.updatedAt || now));
          }
        });
        userTx(seed.users);
      }

      if (Array.isArray(seed.stories)) {
        const storyTx = db.transaction((items) => {
          for (const s of items) {
            const userId = String(s.userId || s.authorId || 'anonymous');
            const cat = String(s.category || 'general');
            const status = String(s.status || 'published');
            const now = Date.now();
            stmts.upsertStory.run(String(s.id), userId, cat, status, JSON.stringify(s), Number(s.createdAt || now), Number(s.updatedAt || now));
          }
        });
        storyTx(seed.stories);
      }

      console.log('[SQLite] Initial migration completed successfully.');
    } catch (e) {
      console.warn('[SQLite] Auto-seed warning:', e.message);
    }
  }
}

ensureInitialSeed();

// 4. Granular CRUD API
export const sqliteDB = {
  // Direct connection
  raw: db,

  // Settings
  getSettings() {
    const row = stmts.getSetting.get('general');
    return row ? JSON.parse(row.value) : null;
  },
  saveSettings(settings) {
    stmts.setSetting.run('general', JSON.stringify(settings));
  },

  // Categories
  getCategories() {
    return stmts.getAllCategories.all().map(r => JSON.parse(r.data));
  },
  getCategory(id) {
    const row = stmts.getCategory.get(String(id));
    return row ? JSON.parse(row.data) : null;
  },
  saveCategory(cat) {
    const rawTitle = cat.title || cat.titleAr || cat.name || '';
    const title = typeof rawTitle === 'object' ? (rawTitle.ar || rawTitle.en || JSON.stringify(rawTitle)) : String(rawTitle);
    stmts.upsertCategory.run(String(cat.id), title, JSON.stringify(cat));
  },

  // Roles
  getRoles() {
    return stmts.getAllRoles.all().map(r => JSON.parse(r.data));
  },

  // Users
  getUsers() {
    return stmts.getAllUsers.all().map(r => JSON.parse(r.data));
  },
  getUser(id) {
    if (!id) return null;
    const row = stmts.getUserById.get(String(id));
    return row ? JSON.parse(row.data) : null;
  },
  getUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    const row = stmts.getUserByEmail.get(cleanEmail);
    return row ? JSON.parse(row.data) : null;
  },
  saveUser(user) {
    if (!user || !user.id) return;
    const email = (user.email || '').toLowerCase().trim();
    const role = String(user.role || 'Student');
    const now = Date.now();
    stmts.upsertUser.run(String(user.id), email, role, JSON.stringify(user), Number(user.createdAt || now), Number(user.updatedAt || now));
  },
  deleteUser(id) {
    stmts.deleteUser.run(String(id));
  },

  // Stories
  getStories(filter = {}) {
    if (filter.userId) {
      return stmts.getStoriesByUser.all(String(filter.userId)).map(r => JSON.parse(r.data));
    }
    if (filter.category) {
      return stmts.getStoriesByCategory.all(String(filter.category)).map(r => JSON.parse(r.data));
    }
    return stmts.getAllStories.all().map(r => JSON.parse(r.data));
  },
  getStory(id) {
    if (!id) return null;
    const row = stmts.getStoryById.get(String(id));
    return row ? JSON.parse(row.data) : null;
  },
  saveStory(story) {
    if (!story || !story.id) return;
    const userId = String(story.userId || story.authorId || 'anonymous');
    const cat = String(story.category || 'general');
    const status = String(story.status || 'published');
    const now = Date.now();
    stmts.upsertStory.run(String(story.id), userId, cat, status, JSON.stringify(story), Number(story.createdAt || now), Number(story.updatedAt || now));
  },
  deleteStory(id) {
    stmts.deleteStory.run(String(id));
  },

  // Role Requests
  getRoleRequests() {
    return stmts.getAllRoleRequests.all().map(r => JSON.parse(r.data));
  },
  getRoleRequest(id) {
    const row = stmts.getRoleRequestById.get(String(id));
    return row ? JSON.parse(row.data) : null;
  },
  saveRoleRequest(req) {
    if (!req || !req.id) return;
    stmts.upsertRoleRequest.run(String(req.id), String(req.userId || ''), String(req.status || 'pending'), JSON.stringify(req), Number(req.createdAt || Date.now()));
  },

  // Transactions
  getTransactions() {
    return stmts.getAllTransactions.all().map(r => JSON.parse(r.data));
  },
  saveTransaction(tx) {
    if (!tx || !tx.id) return;
    stmts.upsertTransaction.run(String(tx.id), String(tx.userId || ''), JSON.stringify(tx), Number(tx.createdAt || Date.now()));
  }
};

// 5. Full Backward-Compatibility Layer for existing readDB() & writeDB()
export function readDB() {
  return {
    settings: sqliteDB.getSettings() || {},
    categories: sqliteDB.getCategories(),
    roles: sqliteDB.getRoles(),
    users: sqliteDB.getUsers(),
    stories: sqliteDB.getStories(),
    roleRequests: sqliteDB.getRoleRequests(),
    transactions: sqliteDB.getTransactions()
  };
}

export function writeDB(data) {
  if (!data) return;

  const fullTx = db.transaction((d) => {
    if (d.settings) sqliteDB.saveSettings(d.settings);

    if (Array.isArray(d.categories)) {
      for (const c of d.categories) sqliteDB.saveCategory(c);
    }

    if (Array.isArray(d.users)) {
      for (const u of d.users) sqliteDB.saveUser(u);
    }

    if (Array.isArray(d.stories)) {
      for (const s of d.stories) sqliteDB.saveStory(s);
    }

    if (Array.isArray(d.roleRequests)) {
      for (const r of d.roleRequests) sqliteDB.saveRoleRequest(r);
    }

    if (Array.isArray(d.transactions)) {
      for (const t of d.transactions) sqliteDB.saveTransaction(t);
    }
  });

  fullTx(data);

  // Atomic JSON backup file write (writes to .tmp and renames to prevent partial write corruption)
  try {
    const tmpFile = `${DB_JSON_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_JSON_FILE);
  } catch (err) {
    console.warn('[SQLite] Notice: atomic JSON backup write failed:', err.message);
  }
}
