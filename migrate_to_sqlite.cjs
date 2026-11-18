const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'STORIES', 'database.json');
const sqlitePath = path.join(__dirname, 'STORIES', 'database.sqlite');

console.log('Loading existing database.json from:', jsonPath);
if (!fs.existsSync(jsonPath)) {
  console.error('database.json not found!');
  process.exit(1);
}

const rawJson = fs.readFileSync(jsonPath, 'utf-8');
const data = JSON.parse(rawJson);

console.log('Connecting to SQLite at:', sqlitePath);
const db = new Database(sqlitePath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Create tables
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

console.log('Schema created successfully. Importing data...');

// Insert settings
const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
if (data.settings) {
  insertSetting.run('general', JSON.stringify(data.settings));
}

// Insert categories
const insertCategory = db.prepare('INSERT OR REPLACE INTO categories (id, title, data) VALUES (?, ?, ?)');
const catTx = db.transaction((categories) => {
  for (const cat of categories) {
    const rawTitle = cat.title || cat.titleAr || cat.name || '';
    const title = typeof rawTitle === 'object' ? (rawTitle.ar || rawTitle.en || JSON.stringify(rawTitle)) : String(rawTitle);
    insertCategory.run(String(cat.id), title, JSON.stringify(cat));
  }
});
if (Array.isArray(data.categories)) catTx(data.categories);

// Insert roles
const insertRole = db.prepare('INSERT OR REPLACE INTO roles (id, name, data) VALUES (?, ?, ?)');
const roleTx = db.transaction((roles) => {
  for (const r of roles) {
    const rawName = r.name || r.id || '';
    const name = typeof rawName === 'object' ? (rawName.ar || rawName.en || JSON.stringify(rawName)) : String(rawName);
    insertRole.run(String(r.id || r.name), name, JSON.stringify(r));
  }
});
if (Array.isArray(data.roles)) roleTx(data.roles);

// Insert users
const insertUser = db.prepare('INSERT OR REPLACE INTO users (id, email, role, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
const userTx = db.transaction((users) => {
  for (const u of users) {
    const email = (u.email || '').toLowerCase().trim();
    const role = String(u.role || 'Student');
    const now = Date.now();
    insertUser.run(String(u.id), email, role, JSON.stringify(u), Number(u.createdAt || now), Number(u.updatedAt || now));
  }
});
if (Array.isArray(data.users)) userTx(data.users);

// Insert stories
const insertStory = db.prepare('INSERT OR REPLACE INTO stories (id, user_id, category, status, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
const storyTx = db.transaction((stories) => {
  for (const s of stories) {
    const userId = String(s.userId || s.authorId || 'anonymous');
    const cat = String(s.category || 'general');
    const status = String(s.status || 'published');
    const now = Date.now();
    insertStory.run(String(s.id), userId, cat, status, JSON.stringify(s), Number(s.createdAt || now), Number(s.updatedAt || now));
  }
});
if (Array.isArray(data.stories)) storyTx(data.stories);

// Insert role requests
const insertReq = db.prepare('INSERT OR REPLACE INTO role_requests (id, user_id, status, data, created_at) VALUES (?, ?, ?, ?, ?)');
const reqTx = db.transaction((requests) => {
  for (const r of requests) {
    insertReq.run(String(r.id), String(r.userId || ''), String(r.status || 'pending'), JSON.stringify(r), Number(r.createdAt || Date.now()));
  }
});
if (Array.isArray(data.roleRequests)) reqTx(data.roleRequests);

// Insert transactions
const insertTx = db.prepare('INSERT OR REPLACE INTO transactions (id, user_id, data, created_at) VALUES (?, ?, ?, ?)');
const transTx = db.transaction((transactions) => {
  for (const t of transactions) {
    insertTx.run(String(t.id), String(t.userId || ''), JSON.stringify(t), Number(t.createdAt || Date.now()));
  }
});
if (Array.isArray(data.transactions)) transTx(data.transactions);

// Verify counts
const uCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
const sCount = db.prepare('SELECT COUNT(*) AS count FROM stories').get().count;
const cCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;

console.log('Migration complete!');
console.log(`Imported: ${uCount} users, ${sCount} stories, ${cCount} categories.`);

db.close();
