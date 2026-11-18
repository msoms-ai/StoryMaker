import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORIES_DIR = path.join(__dirname, 'STORIES');
const DB_SQLITE_FILE = path.join(STORIES_DIR, 'database.sqlite');
const DB_JSON_FILE = path.join(STORIES_DIR, 'database.json');
const BACKUP_JSON_FILE = path.join(STORIES_DIR, 'database.backup.json');

// Ensure STORIES directory exists
if (!fs.existsSync(STORIES_DIR)) {
  fs.mkdirSync(STORIES_DIR, { recursive: true });
}

// -------------------------------------------------------------
// Engine Detection:
// 1. Native Node.js SQLite (`node:sqlite` - Built into Node 22+ & Node 26, ZERO compiler required)
// 2. better-sqlite3 (if installed)
// 3. High-Performance In-Memory Indexed Engine (zero-dependency fallback)
// -------------------------------------------------------------
let DatabaseEngine = null;
let engineType = 'memory';

// Try loading built-in node:sqlite (available on Node 22.5.0+ and Node 26)
try {
  const mod = await import('node:sqlite');
  if (mod && mod.DatabaseSync) {
    DatabaseEngine = mod.DatabaseSync;
    engineType = 'node:sqlite';
  }
} catch (_) {}

// Fallback: check if better-sqlite3 is installed
if (!DatabaseEngine) {
  try {
    const { createRequire } = await import('module');
    const req = createRequire(import.meta.url);
    const bSqlite = req('better-sqlite3');
    if (bSqlite) {
      DatabaseEngine = bSqlite;
      engineType = 'better-sqlite3';
    }
  } catch (_) {}
}

console.log(`[Database Engine] Active persistence mode: ${engineType}`);

// -------------------------------------------------------------
// Implementation: REAL SQLite Engine (if node:sqlite or better-sqlite3 is available)
// -------------------------------------------------------------
let sqliteDBInstance = null;
let readDBInstance = null;
let writeDBInstance = null;

if (DatabaseEngine) {
  const db = new DatabaseEngine(DB_SQLITE_FILE);
  try { db.exec('PRAGMA journal_mode = WAL;'); } catch (_) {}
  try { db.exec('PRAGMA synchronous = NORMAL;'); } catch (_) {}
  try { db.exec('PRAGMA foreign_keys = ON;'); } catch (_) {}

  // Create Schema & Indexes
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, title TEXT, data TEXT);
    CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT, data TEXT);
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

  // Auto-seed from JSON if SQLite database is empty
  const storyCountRow = db.prepare('SELECT COUNT(*) AS count FROM stories').get();
  const storyCount = storyCountRow ? (storyCountRow.count || 0) : 0;
  if (storyCount === 0 && fs.existsSync(DB_JSON_FILE)) {
    try {
      console.log('[SQLite Engine] Seeding SQLite database from database.json...');
      const raw = fs.readFileSync(DB_JSON_FILE, 'utf-8');
      const seed = JSON.parse(raw);

      if (seed.settings) {
        stmts.setSetting.run('general', JSON.stringify(seed.settings));
      }
      if (Array.isArray(seed.categories)) {
        for (const c of seed.categories) {
          const rawTitle = c.title || c.titleAr || c.name || '';
          const title = typeof rawTitle === 'object' ? (rawTitle.ar || rawTitle.en || JSON.stringify(rawTitle)) : String(rawTitle);
          stmts.upsertCategory.run(String(c.id), title, JSON.stringify(c));
        }
      }
      if (Array.isArray(seed.roles)) {
        const insertRole = db.prepare('INSERT OR REPLACE INTO roles (id, name, data) VALUES (?, ?, ?)');
        for (const r of seed.roles) {
          const rawName = r.name || r.id || '';
          const name = typeof rawName === 'object' ? (rawName.ar || rawName.en || JSON.stringify(rawName)) : String(rawName);
          insertRole.run(String(r.id || r.name), name, JSON.stringify(r));
        }
      }
      if (Array.isArray(seed.users)) {
        for (const u of seed.users) {
          const email = (u.email || '').toLowerCase().trim();
          const role = String(u.role || 'Student');
          const now = Date.now();
          stmts.upsertUser.run(String(u.id), email, role, JSON.stringify(u), Number(u.createdAt || now), Number(u.updatedAt || now));
        }
      }
      if (Array.isArray(seed.stories)) {
        for (const s of seed.stories) {
          const userId = String(s.userId || s.authorId || 'anonymous');
          const cat = String(s.category || 'general');
          const status = String(s.status || 'published');
          const now = Date.now();
          stmts.upsertStory.run(String(s.id), userId, cat, status, JSON.stringify(s), Number(s.createdAt || now), Number(s.updatedAt || now));
        }
      }
      console.log('[SQLite Engine] SQLite seeding completed successfully.');
    } catch (e) {
      console.warn('[SQLite Engine] Seed warning:', e.message);
    }
  }

  function writeJsonBackup(data) {
    try {
      const tmp = `${DB_JSON_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmp, DB_JSON_FILE);
    } catch (_) {}
  }

  sqliteDBInstance = {
    raw: db,
    getSettings() {
      const row = stmts.getSetting.get('general');
      return row ? JSON.parse(row.value) : null;
    },
    saveSettings(settings) {
      stmts.setSetting.run('general', JSON.stringify(settings));
      writeJsonBackup(readDBInstance());
    },
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
      writeJsonBackup(readDBInstance());
    },
    getRoles() {
      return stmts.getAllRoles.all().map(r => JSON.parse(r.data));
    },
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
      writeJsonBackup(readDBInstance());
    },
    deleteUser(id) {
      stmts.deleteUser.run(String(id));
      writeJsonBackup(readDBInstance());
    },
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
      writeJsonBackup(readDBInstance());
    },
    deleteStory(id) {
      stmts.deleteStory.run(String(id));
      writeJsonBackup(readDBInstance());
    },
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
      writeJsonBackup(readDBInstance());
    },
    getTransactions() {
      return stmts.getAllTransactions.all().map(r => JSON.parse(r.data));
    },
    saveTransaction(tx) {
      if (!tx || !tx.id) return;
      stmts.upsertTransaction.run(String(tx.id), String(tx.userId || ''), JSON.stringify(tx), Number(tx.createdAt || Date.now()));
      writeJsonBackup(readDBInstance());
    }
  };

  readDBInstance = function() {
    return {
      settings: sqliteDBInstance.getSettings() || {},
      categories: sqliteDBInstance.getCategories(),
      roles: sqliteDBInstance.getRoles(),
      users: sqliteDBInstance.getUsers(),
      stories: sqliteDBInstance.getStories(),
      roleRequests: sqliteDBInstance.getRoleRequests(),
      transactions: sqliteDBInstance.getTransactions()
    };
  };

  writeDBInstance = function(data) {
    if (!data) return;
    if (data.settings) sqliteDBInstance.saveSettings(data.settings);
    if (Array.isArray(data.categories)) {
      for (const c of data.categories) sqliteDBInstance.saveCategory(c);
    }
    if (Array.isArray(data.users)) {
      for (const u of data.users) sqliteDBInstance.saveUser(u);
    }
    if (Array.isArray(data.stories)) {
      for (const s of data.stories) sqliteDBInstance.saveStory(s);
    }
    if (Array.isArray(data.roleRequests)) {
      for (const r of data.roleRequests) sqliteDBInstance.saveRoleRequest(r);
    }
    if (Array.isArray(data.transactions)) {
      for (const t of data.transactions) sqliteDBInstance.saveTransaction(t);
    }
    writeJsonBackup(data);
  };

} else {
  // -------------------------------------------------------------
  // Implementation: In-Memory Indexed Engine with Atomic POSIX Writes
  // -------------------------------------------------------------
  class MemoryDatabase {
    constructor() {
      this.cache = {
        settings: {},
        categories: new Map(),
        roles: new Map(),
        users: new Map(),
        usersByEmail: new Map(),
        stories: new Map(),
        roleRequests: new Map(),
        transactions: new Map()
      };
      this.init();
    }

    init() {
      if (fs.existsSync(DB_JSON_FILE)) {
        try {
          const raw = fs.readFileSync(DB_JSON_FILE, 'utf-8');
          const data = JSON.parse(raw);
          this.populate(data);
          console.log(`[Memory Engine] Loaded ${this.cache.stories.size} stories and ${this.cache.users.size} users.`);
        } catch (e) {
          console.warn('[Memory Engine] Load warning:', e.message);
        }
      }
    }

    populate(data) {
      if (!data) return;
      if (data.settings) this.cache.settings = { ...data.settings };
      if (Array.isArray(data.categories)) {
        this.cache.categories.clear();
        for (const c of data.categories) if (c && c.id) this.cache.categories.set(String(c.id), c);
      }
      if (Array.isArray(data.roles)) {
        this.cache.roles.clear();
        for (const r of data.roles) {
          const rid = r.id || r.name;
          if (rid) this.cache.roles.set(String(rid), r);
        }
      }
      if (Array.isArray(data.users)) {
        this.cache.users.clear();
        this.cache.usersByEmail.clear();
        for (const u of data.users) {
          if (u && u.id) {
            const uid = String(u.id);
            this.cache.users.set(uid, u);
            if (u.email) this.cache.usersByEmail.set(u.email.toLowerCase().trim(), u);
          }
        }
      }
      if (Array.isArray(data.stories)) {
        this.cache.stories.clear();
        for (const s of data.stories) if (s && s.id) this.cache.stories.set(String(s.id), s);
      }
      if (Array.isArray(data.roleRequests)) {
        this.cache.roleRequests.clear();
        for (const req of data.roleRequests) if (req && req.id) this.cache.roleRequests.set(String(req.id), req);
      }
      if (Array.isArray(data.transactions)) {
        this.cache.transactions.clear();
        for (const tx of data.transactions) if (tx && tx.id) this.cache.transactions.set(String(tx.id), tx);
      }
    }

    snapshot() {
      return {
        settings: this.cache.settings,
        categories: Array.from(this.cache.categories.values()),
        roles: Array.from(this.cache.roles.values()),
        users: Array.from(this.cache.users.values()),
        stories: Array.from(this.cache.stories.values()),
        roleRequests: Array.from(this.cache.roleRequests.values()),
        transactions: Array.from(this.cache.transactions.values())
      };
    }

    persistSync() {
      try {
        const data = this.snapshot();
        const tmpFile = `${DB_JSON_FILE}.tmp`;
        const serialized = JSON.stringify(data, null, 2);
        fs.writeFileSync(tmpFile, serialized, 'utf-8');
        fs.renameSync(tmpFile, DB_JSON_FILE);
      } catch (err) {
        console.error('[Memory Engine] Atomic write error:', err.message);
      }
    }
  }

  const memDB = new MemoryDatabase();

  sqliteDBInstance = {
    raw: null,
    getSettings() { return { ...memDB.cache.settings }; },
    saveSettings(settings) { memDB.cache.settings = { ...settings }; memDB.persistSync(); },
    getCategories() { return Array.from(memDB.cache.categories.values()); },
    getCategory(id) { return memDB.cache.categories.get(String(id)) || null; },
    saveCategory(cat) { if (cat && cat.id) { memDB.cache.categories.set(String(cat.id), { ...cat }); memDB.persistSync(); } },
    getRoles() { return Array.from(memDB.cache.roles.values()); },
    getUsers() { return Array.from(memDB.cache.users.values()); },
    getUser(id) { return memDB.cache.users.get(String(id)) || null; },
    getUserByEmail(email) { return email ? (memDB.cache.usersByEmail.get(String(email).toLowerCase().trim()) || null) : null; },
    saveUser(user) {
      if (!user || !user.id) return;
      const uid = String(user.id);
      const cleanEmail = (user.email || '').toLowerCase().trim();
      const existing = memDB.cache.users.get(uid);
      if (existing && existing.email && existing.email.toLowerCase().trim() !== cleanEmail) {
        memDB.cache.usersByEmail.delete(existing.email.toLowerCase().trim());
      }
      memDB.cache.users.set(uid, { ...user });
      if (cleanEmail) memDB.cache.usersByEmail.set(cleanEmail, { ...user });
      memDB.persistSync();
    },
    deleteUser(id) {
      const uid = String(id);
      const user = memDB.cache.users.get(uid);
      if (user) {
        if (user.email) memDB.cache.usersByEmail.delete(user.email.toLowerCase().trim());
        memDB.cache.users.delete(uid);
        memDB.persistSync();
      }
    },
    getStories(filter = {}) {
      let list = Array.from(memDB.cache.stories.values());
      if (filter.userId) list = list.filter(s => String(s.userId || s.authorId) === String(filter.userId));
      if (filter.category) list = list.filter(s => String(s.category) === String(filter.category) && (s.status === 'published' || !s.status));
      return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    },
    getStory(id) { return memDB.cache.stories.get(String(id)) || null; },
    saveStory(story) { if (story && story.id) { memDB.cache.stories.set(String(story.id), { ...story }); memDB.persistSync(); } },
    deleteStory(id) { if (id) { memDB.cache.stories.delete(String(id)); memDB.persistSync(); } },
    getRoleRequests() { return Array.from(memDB.cache.roleRequests.values()); },
    getRoleRequest(id) { return memDB.cache.roleRequests.get(String(id)) || null; },
    saveRoleRequest(req) { if (req && req.id) { memDB.cache.roleRequests.set(String(req.id), { ...req }); memDB.persistSync(); } },
    getTransactions() { return Array.from(memDB.cache.transactions.values()); },
    saveTransaction(tx) { if (tx && tx.id) { memDB.cache.transactions.set(String(tx.id), { ...tx }); memDB.persistSync(); } }
  };

  readDBInstance = function() { return memDB.snapshot(); };
  writeDBInstance = function(data) { if (data) { memDB.populate(data); memDB.persistSync(); } };
}

export const sqliteDB = sqliteDBInstance;
export const readDB = readDBInstance;
export const writeDB = writeDBInstance;
