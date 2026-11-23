import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORIES_DIR = path.join(__dirname, 'STORIES');
const DB_JSON_FILE = path.join(STORIES_DIR, 'database.json');
const BACKUP_JSON_FILE = path.join(STORIES_DIR, 'database.backup.json');

// Ensure STORIES directory exists
if (!fs.existsSync(STORIES_DIR)) {
  fs.mkdirSync(STORIES_DIR, { recursive: true });
}

// -------------------------------------------------------------
// High-Performance In-Memory Indexed Engine with Atomic JSON Persistence
// - Zero OS compilers required (No g++, No make, No Python)
// - Zero Node.js experimental flag dependency
// - Sub-millisecond (O(1)) in-memory indexed lookups
// - Atomic POSIX temporary-rename disk writes
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
        console.log(`[Memory Engine] Loaded ${this.cache.stories.size} stories and ${this.cache.users.size} users from database.json.`);
      } catch (e) {
        console.warn('[Memory Engine] Load warning:', e.message);
      }
    } else {
      console.warn('[Memory Engine] database.json not found, initializing baseline defaults.');
      this.seedDefaults();
    }

    // Ensure baseline admin and categories exist if DB is newly created or empty (e.g. CI/CD test runners)
    if (this.cache.users.size === 0) {
      this.seedDefaults();
    }
  }

  seedDefaults() {
    // Default system settings
    if (!this.cache.settings || Object.keys(this.cache.settings).length === 0) {
      this.cache.settings = {
        platformName: 'منصة قصص',
        allowRegistration: true,
        defaultUserRole: 'Author',
        maintenanceMode: false
      };
    }

    // Default categories
    if (this.cache.categories.size === 0) {
      const defaultCategories = [
        { id: 'general', name: { ar: 'عام', en: 'General' }, icon: 'BookOpen', color: 'bg-indigo-600 text-white' },
        { id: 'adventure', name: { ar: 'مغامرات', en: 'Adventure' }, icon: 'Compass', color: 'bg-amber-500 text-white' },
        { id: 'educational', name: { ar: 'تعليمي', en: 'Educational' }, icon: 'GraduationCap', color: 'bg-emerald-500 text-white' },
        { id: 'fantasy', name: { ar: 'خيالي', en: 'Fantasy' }, icon: 'Sparkles', color: 'bg-purple-500 text-white' },
        { id: 'bedtime', name: { ar: 'قبل النوم', en: 'Bedtime' }, icon: 'Moon', color: 'bg-blue-500 text-white' }
      ];
      for (const cat of defaultCategories) {
        this.cache.categories.set(cat.id, cat);
      }
    }

    // Default admin user
    const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'qisas.admin@msoms.ai').toLowerCase().trim();
    if (!this.cache.usersByEmail.has(adminEmail)) {
      const defaultAdmin = {
        id: 'u_admin',
        email: adminEmail,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        firstName: 'مدير',
        lastName: 'النظام',
        role: 'Admin',
        isVerified: true,
        status: 'active',
        freeStoriesLeft: 99999,
        userFolder: 'qisas_admin',
        createdAt: new Date().toISOString(),
        mobileNumber: '',
        socialLinks: { instagram: '', linkedin: '', facebook: '' }
      };
      this.cache.users.set(defaultAdmin.id, defaultAdmin);
      this.cache.usersByEmail.set(adminEmail, defaultAdmin);
    }
  }

  populate(data) {
    if (!data || typeof data !== 'object') return;
    if (data.settings && typeof data.settings === 'object') {
      this.cache.settings = { ...data.settings };
    }
    if (Array.isArray(data.categories)) {
      this.cache.categories.clear();
      for (const c of data.categories) {
        if (c && c.id) this.cache.categories.set(String(c.id), { ...c });
      }
    }
    if (Array.isArray(data.roles)) {
      this.cache.roles.clear();
      for (const r of data.roles) {
        const rid = r.id || r.name;
        if (rid) this.cache.roles.set(String(rid), { ...r });
      }
    }
    if (Array.isArray(data.users)) {
      this.cache.users.clear();
      this.cache.usersByEmail.clear();
      for (const u of data.users) {
        if (u && u.id) {
          const uid = String(u.id);
          this.cache.users.set(uid, { ...u });
          if (u.email) this.cache.usersByEmail.set(String(u.email).toLowerCase().trim(), { ...u });
        }
      }
    }
    if (Array.isArray(data.stories)) {
      this.cache.stories.clear();
      for (const s of data.stories) {
        if (s && s.id) this.cache.stories.set(String(s.id), { ...s });
      }
    }
    if (Array.isArray(data.roleRequests)) {
      this.cache.roleRequests.clear();
      for (const req of data.roleRequests) {
        if (req && req.id) this.cache.roleRequests.set(String(req.id), { ...req });
      }
    }
    if (Array.isArray(data.transactions)) {
      this.cache.transactions.clear();
      for (const tx of data.transactions) {
        if (tx && tx.id) this.cache.transactions.set(String(tx.id), { ...tx });
      }
    }
  }

  snapshot() {
    return {
      settings: this.cache.settings || {},
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

export const sqliteDB = {
  raw: null,
  getSettings() {
    return { ...memDB.cache.settings };
  },
  saveSettings(settings) {
    memDB.cache.settings = { ...settings };
    memDB.persistSync();
  },
  getCategories() {
    return Array.from(memDB.cache.categories.values());
  },
  getCategory(id) {
    if (!id) return null;
    return memDB.cache.categories.get(String(id)) || null;
  },
  saveCategory(cat) {
    if (!cat || !cat.id) return;
    memDB.cache.categories.set(String(cat.id), { ...cat });
    memDB.persistSync();
  },
  getRoles() {
    return Array.from(memDB.cache.roles.values());
  },
  getUsers() {
    return Array.from(memDB.cache.users.values());
  },
  getUser(id) {
    if (!id) return null;
    return memDB.cache.users.get(String(id)) || null;
  },
  getUserByEmail(email) {
    if (!email) return null;
    return memDB.cache.usersByEmail.get(String(email).toLowerCase().trim()) || null;
  },
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
    if (!id) return;
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
    if (filter.userId) {
      list = list.filter(s => String(s.userId || s.authorId) === String(filter.userId));
    }
    if (filter.category) {
      list = list.filter(s => String(s.category) === String(filter.category) && (s.status === 'published' || !s.status));
    }
    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },
  getStory(id) {
    if (!id) return null;
    return memDB.cache.stories.get(String(id)) || null;
  },
  saveStory(story) {
    if (!story || !story.id) return;
    memDB.cache.stories.set(String(story.id), { ...story });
    memDB.persistSync();
  },
  deleteStory(id) {
    if (!id) return;
    memDB.cache.stories.delete(String(id));
    memDB.persistSync();
  },
  getRoleRequests() {
    return Array.from(memDB.cache.roleRequests.values());
  },
  getRoleRequest(id) {
    if (!id) return null;
    return memDB.cache.roleRequests.get(String(id)) || null;
  },
  saveRoleRequest(req) {
    if (!req || !req.id) return;
    memDB.cache.roleRequests.set(String(req.id), { ...req });
    memDB.persistSync();
  },
  getTransactions() {
    return Array.from(memDB.cache.transactions.values());
  },
  saveTransaction(tx) {
    if (!tx || !tx.id) return;
    memDB.cache.transactions.set(String(tx.id), { ...tx });
    memDB.persistSync();
  }
};

export const readDB = function() {
  try {
    return memDB.snapshot();
  } catch (err) {
    console.error('[readDB Error]:', err);
    return { settings: {}, categories: [], roles: [], users: [], stories: [], roleRequests: [], transactions: [] };
  }
};

export const writeDB = function(data) {
  if (data) {
    memDB.populate(data);
    memDB.persistSync();
  }
};
