import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { generateAndSaveSlideImage, generateProfileCoverImage, generateCharacterAvatar } from './aiImageService.js';
import { generateStoryPlanWithGemini } from './aiTextService.js';
import { generateAndSaveSlideVoice } from './aiVoiceService.js';
import { sendOtpEmail, sendTeacherRequestToAdmin, sendPackagePurchaseEmail } from './emailService.js';
import { generateToken, authenticateUser, requireRole } from './authMiddleware.js';

import multer from 'multer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: 'uploads/' });
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const STORIES_DIR = path.join(__dirname, 'STORIES');
const USERS_DIR = path.join(__dirname, 'USERS');
const DB_FILE = path.join(STORIES_DIR, 'database.json');

// Serve static assets
app.use('/STORIES', express.static(STORIES_DIR));
app.use('/USERS', express.static(USERS_DIR));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Category Data
const DEFAULT_CATEGORIES = [
  { id: 'general', name: { ar: 'عام', en: 'General' }, icon: 'BookOpen', color: 'bg-indigo-600 text-white' },
  { id: 'adventure', name: { ar: 'مغامرة', en: 'Adventure' }, icon: 'Compass', color: 'bg-amber-500 text-white' },
  { id: 'fantasy', name: { ar: 'خيال', en: 'Fantasy' }, icon: 'Wand2', color: 'bg-purple-600 text-white' },
  { id: 'bedtime', name: { ar: 'قصص قبل النوم', en: 'Bedtime' }, icon: 'Moon', color: 'bg-blue-600 text-white' },
  { id: 'scifi', name: { ar: 'خيال علمي', en: 'Sci-Fi' }, icon: 'Rocket', color: 'bg-cyan-600 text-white' },
  { id: 'mystery', name: { ar: 'غموض', en: 'Mystery' }, icon: 'Search', color: 'bg-slate-800 text-white' },
  { id: 'educational', name: { ar: 'تعليمية', en: 'Educational' }, icon: 'GraduationCap', color: 'bg-emerald-600 text-white' },
  { id: 'fables', name: { ar: 'حكايات أخلاقية', en: 'Fables' }, icon: 'Heart', color: 'bg-rose-600 text-white' },
  { id: 'historical', name: { ar: 'تاريخية', en: 'Historical' }, icon: 'Landmark', color: 'bg-yellow-700 text-white' }
];

const DEFAULT_SETTINGS = {
  siteName: {
    ar: 'منصة قصص - مسومس للذكاء الإصطناعي',
    en: 'Qisas Platform by msoms.ai'
  },
  siteSubtitle: {
    ar: 'منصة تأليف ورواية القصص التفاعلية للأطفال بالذكاء الاصطناعي',
    en: 'AI-Powered Interactive Illustrated Story Creator & Narrator for Children'
  },
  arabicFont: 'Cairo',
  defaultRole: 'Story Reader',
  defaultFreeStories: 5,
  maintenanceMode: false
};

const DEFAULT_ROLES = [
  { id: 'Admin', name: { ar: 'مدير النظام', en: 'Administrator' }, permissions: ['all'] },
  { id: 'Story Maker', name: { ar: 'صانع القصص (معلم)', en: 'Story Maker (Teacher)' }, permissions: ['create_story', 'edit_story', 'delete_story', 'read_story'] },
  { id: 'Story Reader', name: { ar: 'قارئ القصص', en: 'Story Reader' }, permissions: ['read_story', 'create_limited_story'] }
];

function initDatabase() {
  if (!fs.existsSync(STORIES_DIR)) {
    fs.mkdirSync(STORIES_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }

  let db = {
    settings: DEFAULT_SETTINGS,
    categories: DEFAULT_CATEGORIES,
    roles: DEFAULT_ROLES,
    users: [],
    stories: [],
    roleRequests: [],
    transactions: []
  };

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const existing = JSON.parse(raw);
      db = {
        settings: { ...DEFAULT_SETTINGS, ...(existing.settings || {}) },
        categories: existing.categories && existing.categories.length > 0 ? existing.categories : DEFAULT_CATEGORIES,
        roles: existing.roles || DEFAULT_ROLES,
        users: existing.users || [],
        stories: existing.stories || [],
        roleRequests: existing.roleRequests || [],
        transactions: existing.transactions || []
      };
    } catch (e) {
      console.warn('[DB Init] Notice loading DB:', e.message);
    }
  }

  // Ensure at least 1 category is present in database
  if (!db.categories || db.categories.length === 0) {
    db.categories = DEFAULT_CATEGORIES;
  } else if (!db.categories.some(c => c.id === 'general')) {
    db.categories.unshift({ id: 'general', name: { ar: 'عام', en: 'General' }, icon: 'BookOpen', color: 'bg-indigo-600 text-white' });
  }

  // Ensure initial admin user exists
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'qisas.admin@msoms.ai';
  let adminUser = db.users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());

  const adminFolder = adminEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '_');
  const adminFolderPath = path.join(USERS_DIR, adminFolder);
  if (!fs.existsSync(adminFolderPath)) {
    fs.mkdirSync(adminFolderPath, { recursive: true });
  }

  if (!adminUser) {
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Adm!n@2026&';
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    adminUser = {
      id: 'u_admin',
      email: adminEmail,
      passwordHash,
      firstName: 'مدير',
      lastName: 'النظام',
      role: 'Admin',
      isVerified: true,
      status: 'active',
      freeStoriesLeft: 99999,
      userFolder: adminFolder,
      createdAt: new Date().toISOString(),
      mobileNumber: '',
      socialLinks: { instagram: '', linkedin: '', facebook: '' }
    };
    db.users.push(adminUser);
    console.log(`[DB Init] Initial Admin user seeded: ${adminEmail}`);
  } else {
    adminUser.role = 'Admin';
    adminUser.isVerified = true;
    adminUser.status = 'active';
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

initDatabase();

function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {
      settings: DEFAULT_SETTINGS,
      categories: DEFAULT_CATEGORIES,
      roles: DEFAULT_ROLES,
      users: [],
      stories: [],
      roleRequests: [],
      transactions: []
    };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, otpCode, otpExpiresAt, pendingEmailOtp, pendingOtpExpiresAt, ...safe } = user;
  return safe;
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & REGISTRATION ENDPOINTS (OTP VIA EMAIL)
// -------------------------------------------------------------

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, firstName, lastName, lang = 'ar' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  // Strong password constraints: min 8 chars, 1 number, 1 special character
  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>_\-=+])[a-zA-Z0-9!@#$%^&*(),.?":{}|<>_\-=+]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long and contain at least one number and one special character'
    });
  }

  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();
  let existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (existingUser && existingUser.isVerified) {
    return res.status(400).json({ success: false, message: 'This email is already registered and verified. Please log in.' });
  }

  // Generate 4-digit OTP code (e.g. 4829)
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  const otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

  // Create isolated user folder (without @domain.com)
  const usernamePart = normalizedEmail.split('@')[0].replace(/[^a-z0-9_.]/g, '_');
  const userFolder = `${usernamePart}_${Date.now() % 10000}`;
  const userFolderPath = path.join(USERS_DIR, userFolder);
  if (!fs.existsSync(userFolderPath)) {
    fs.mkdirSync(userFolderPath, { recursive: true });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  if (existingUser) {
    // Update unverified user with new credentials and OTP
    existingUser.passwordHash = passwordHash;
    existingUser.firstName = firstName || existingUser.firstName || '';
    existingUser.lastName = lastName || existingUser.lastName || '';
    existingUser.otpCode = otpCode;
    existingUser.otpExpiresAt = otpExpiresAt;
    existingUser.userFolder = existingUser.userFolder || userFolder;
  } else {
    const newUser = {
      id: `u_${Date.now()}`,
      email: normalizedEmail,
      passwordHash,
      firstName: firstName || '',
      lastName: lastName || '',
      role: db.settings.defaultRole || 'Story Reader',
      isVerified: false,
      status: 'active',
      freeStoriesLeft: db.settings.defaultFreeStories !== undefined ? db.settings.defaultFreeStories : 5,
      userFolder,
      otpCode,
      otpExpiresAt,
      createdAt: new Date().toISOString(),
      mobileNumber: '',
      socialLinks: { instagram: '', linkedin: '', facebook: '' }
    };
    db.users.push(newUser);
  }

  writeDB(db);

  // Dispatch OTP email via SMTP
  await sendOtpEmail({
    toEmail: normalizedEmail,
    otpCode,
    lang,
    purpose: 'signup'
  });

  res.json({
    success: true,
    message: 'OTP verification code sent to your email',
    email: normalizedEmail,
    otpExpiresInSeconds: 300,
    devOtp: process.env.NODE_ENV === 'production' ? undefined : otpCode
  });
});

// POST /api/auth/verify-otp
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otpCode } = req.body;

  if (!email || !otpCode) {
    return res.status(400).json({ success: false, message: 'Email and 4-digit OTP code are required' });
  }

  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User account not found' });
  }

  if (Date.now() > user.otpExpiresAt) {
    return res.status(400).json({
      success: false,
      expired: true,
      message: 'OTP verification code has expired. Please request a new code.'
    });
  }

  if (user.otpCode !== otpCode.trim()) {
    return res.status(400).json({ success: false, message: 'Incorrect 4-digit verification code' });
  }

  // Activate user account
  user.isVerified = true;
  user.otpCode = null;
  user.otpExpiresAt = null;
  user.lastLoginAt = new Date().toISOString();
  writeDB(db);

  const token = generateToken(user);
  res.json({
    success: true,
    message: 'Account verified and activated successfully!',
    token,
    user: sanitizeUser(user)
  });
});

// POST /api/auth/resend-otp
app.post('/api/auth/resend-otp', async (req, res) => {
  const { email, lang = 'ar' } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User account not found' });
  }

  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  user.otpCode = otpCode;
  user.otpExpiresAt = Date.now() + 5 * 60 * 1000;
  writeDB(db);

  await sendOtpEmail({
    toEmail: normalizedEmail,
    otpCode,
    lang,
    purpose: 'signup'
  });

  res.json({
    success: true,
    message: 'A new 4-digit verification code has been dispatched to your email',
    otpExpiresInSeconds: 300,
    devOtp: process.env.NODE_ENV === 'production' ? undefined : otpCode
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const db = readDB();
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      success: false,
      unverified: true,
      email: user.email,
      message: 'Your email is not verified yet. Please enter the 4-digit code sent to your email.'
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      suspended: true,
      message: 'Your account has been deactivated or suspended. Please contact platform administration.'
    });
  }

  user.lastLoginAt = new Date().toISOString();
  writeDB(db);

  const token = generateToken(user);
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: sanitizeUser(user)
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateUser, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, user: sanitizeUser(user) });
});

// -------------------------------------------------------------
// 2. USER PROFILE & AVATAR ENDPOINTS
// -------------------------------------------------------------

// PUT /api/user/profile
app.put('/api/user/profile', authenticateUser, (req, res) => {
  const { firstName, lastName, mobileNumber, socialLinks } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.firstName = firstName !== undefined ? firstName : user.firstName;
  user.lastName = lastName !== undefined ? lastName : user.lastName;
  user.mobileNumber = mobileNumber !== undefined ? mobileNumber : user.mobileNumber;
  user.socialLinks = socialLinks ? { ...(user.socialLinks || {}), ...socialLinks } : user.socialLinks;

  writeDB(db);
  res.json({ success: true, message: 'Profile updated successfully', user: sanitizeUser(user) });
});

// POST /api/user/change-email-otp - Request OTP for email update
app.post('/api/user/change-email-otp', authenticateUser, async (req, res) => {
  const { newEmail, lang = 'ar' } = req.body;
  if (!newEmail) {
    return res.status(400).json({ success: false, message: 'New email address required' });
  }

  const normalizedNewEmail = newEmail.trim().toLowerCase();
  const db = readDB();

  if (db.users.some(u => u.email.toLowerCase() === normalizedNewEmail && u.id !== req.user.id)) {
    return res.status(400).json({ success: false, message: 'This email is already in use by another account' });
  }

  const user = db.users.find(u => u.id === req.user.id);
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

  user.pendingEmail = normalizedNewEmail;
  user.pendingEmailOtp = otpCode;
  user.pendingOtpExpiresAt = Date.now() + 5 * 60 * 1000;
  writeDB(db);

  await sendOtpEmail({
    toEmail: normalizedNewEmail,
    otpCode,
    lang,
    purpose: 'email_change'
  });

  res.json({
    success: true,
    message: 'Verification code sent to your new email',
    pendingEmail: normalizedNewEmail,
    devOtp: process.env.NODE_ENV === 'production' ? undefined : otpCode
  });
});

// POST /api/user/verify-new-email - Confirm new email with OTP
app.post('/api/user/verify-new-email', authenticateUser, (req, res) => {
  const { otpCode } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);

  if (!user || !user.pendingEmail) {
    return res.status(400).json({ success: false, message: 'No pending email change request found' });
  }

  if (Date.now() > user.pendingOtpExpiresAt) {
    return res.status(400).json({ success: false, message: 'Verification code expired' });
  }

  if (user.pendingEmailOtp !== otpCode.trim()) {
    return res.status(400).json({ success: false, message: 'Incorrect verification code' });
  }

  user.email = user.pendingEmail;
  user.pendingEmail = null;
  user.pendingEmailOtp = null;
  user.pendingOtpExpiresAt = null;
  writeDB(db);

  res.json({ success: true, message: 'Email updated successfully', user: sanitizeUser(user) });
});

// GET /api/user/public/:id - Fetch public profile
app.get('/api/user/public/:id', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id);
  
  if (!user || user.publicProfileEnabled === false) {
    return res.status(404).json({ success: false, message: 'Profile not found or private' });
  }

  const userStories = db.stories.filter(s => (s.authorId === user.id || s.userId === user.id) && s.status === 'published');
  
  const publicProfile = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    socialLinks: user.socialLinks || {},
    role: user.role,
    stories: userStories
  };

  res.json({ success: true, profile: publicProfile });
});

// PUT /api/user/profile - Update basic profile info
app.put('/api/user/profile', authenticateUser, (req, res) => {
  const { firstName, lastName, mobileNumber, socialLinks, publicProfileEnabled } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
  if (socialLinks !== undefined) user.socialLinks = socialLinks;
  if (publicProfileEnabled !== undefined) user.publicProfileEnabled = publicProfileEnabled;

  writeDB(db);
  res.json({ success: true, user: sanitizeUser(user) });
});

// Avatar storage configuration (max 1MB, image only)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    const userFolderPath = path.join(USERS_DIR, user?.userFolder || 'default');
    if (!fs.existsSync(userFolderPath)) fs.mkdirSync(userFolderPath, { recursive: true });
    cb(null, userFolderPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `avatar${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WebP images under 1MB are allowed'));
    }
  }
});

// POST /api/user/avatar - Upload profile avatar
app.post('/api/user/avatar', authenticateUser, (req, res) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    const avatarUrl = `/USERS/${user.userFolder}/${req.file.filename}?t=${Date.now()}`;
    user.avatarUrl = avatarUrl;
    writeDB(db);

    res.json({ success: true, message: 'Avatar updated successfully', avatarUrl, user: sanitizeUser(user) });
  });
});

// POST /api/user/cover/upload - Upload profile cover
app.post('/api/user/cover/upload', authenticateUser, (req, res) => {
  avatarUpload.single('cover')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    const coverUrl = `/USERS/${user.userFolder}/${req.file.filename}?t=${Date.now()}`;
    user.coverUrl = coverUrl;
    writeDB(db);

    res.json({ success: true, message: 'Cover updated successfully', coverUrl, user: sanitizeUser(user) });
  });
});

// POST /api/user/cover/generate - Generate profile cover with AI
app.post('/api/user/cover/generate', authenticateUser, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

  try {
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    const userFolderPath = path.join(USERS_DIR, user.userFolder || 'default');
    if (!fs.existsSync(userFolderPath)) fs.mkdirSync(userFolderPath, { recursive: true });

    const fileName = await generateProfileCoverImage(prompt, userFolderPath);
    const coverUrl = `/USERS/${user.userFolder}/${fileName}?t=${Date.now()}`;
    
    user.coverUrl = coverUrl;
    writeDB(db);

    res.json({ success: true, message: 'Cover generated successfully', coverUrl, user: sanitizeUser(user) });
  } catch (error) {
    console.error('[Generate Cover Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate cover' });
  }
});

// Teacher School ID Upload (Max 2MB)
const teacherIdStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    const userFolderPath = path.join(USERS_DIR, user?.userFolder || 'default');
    if (!fs.existsSync(userFolderPath)) fs.mkdirSync(userFolderPath, { recursive: true });
    cb(null, userFolderPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `school_id_proof${ext}`);
  }
});

const teacherIdUpload = multer({
  storage: teacherIdStorage,
  limits: { fileSize: 2 * 1024 * 1024 }
});

// POST /api/user/request-story-maker - Apply for Teacher role
app.post('/api/user/request-story-maker', authenticateUser, teacherIdUpload.single('schoolIdProof'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'School ID proof photo is mandatory' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);

  if (user.role === 'Story Maker' || user.role === 'Admin') {
    return res.status(400).json({ success: false, message: 'You already have story maker or admin access' });
  }

  const proofUrl = `/USERS/${user.userFolder}/${req.file.filename}`;

  const requestRecord = {
    id: `req_${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    schoolName: req.body.schoolName || '',
    schoolIdProofUrl: proofUrl,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  db.roleRequests.unshift(requestRecord);
  user.teacherRequestStatus = 'pending';
  writeDB(db);

  await sendTeacherRequestToAdmin({
    userEmail: user.email,
    userName: requestRecord.userName,
    schoolIdPath: proofUrl
  });

  res.json({
    success: true,
    message: 'Teacher verification request submitted successfully and sent to admin for review',
    request: requestRecord,
    user: sanitizeUser(user)
  });
});

// -------------------------------------------------------------
// 3. SUBSCRIPTION PACKAGES & SIMULATED PAYMENT CHECKOUT
// -------------------------------------------------------------

const PACKAGES = [
  { id: 'pack_20', storiesCount: 20, price: 29, currency: 'AED', name: { ar: 'باقة 20 قصة', en: '20 Stories Package' } },
  { id: 'pack_50', storiesCount: 50, price: 59, currency: 'AED', name: { ar: 'باقة 50 قصة (الأكثر شعبية)', en: '50 Stories Package (Most Popular)' }, popular: true },
  { id: 'pack_100', storiesCount: 100, price: 99, currency: 'AED', name: { ar: 'باقة 100 قصة (باقة المدارس)', en: '100 Stories Package (Schools Tier)' } }
];

// GET /api/packages
app.get('/api/packages', (req, res) => {
  res.json({ success: true, packages: PACKAGES });
});

// POST /api/packages/checkout - Simulated payment & credit allocation
app.post('/api/packages/checkout', authenticateUser, async (req, res) => {
  const { packageId, cardHolder, cardNumber, expiryDate, cvv, lang = 'ar' } = req.body;

  const pkg = PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    return res.status(404).json({ success: false, message: 'Package not found' });
  }

  if (!cardHolder || !cardNumber || !expiryDate || !cvv) {
    return res.status(400).json({ success: false, message: 'All payment card details are required' });
  }

  // Simulated card validation
  const cleanCardNumber = cardNumber.replace(/\s+/g, '');
  if (cleanCardNumber.length < 14) {
    return res.status(400).json({ success: false, message: 'Invalid card number format' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Allocate stories
  user.freeStoriesLeft = (user.freeStoriesLeft || 0) + pkg.storiesCount;

  const transactionId = `TXN_${Date.now()}`;
  const transaction = {
    id: transactionId,
    userId: user.id,
    userEmail: user.email,
    packageId: pkg.id,
    packageName: pkg.name[lang] || pkg.name.ar,
    storiesCount: pkg.storiesCount,
    amount: pkg.price,
    currency: pkg.currency,
    cardLast4: cleanCardNumber.slice(-4),
    status: 'completed',
    createdAt: new Date().toISOString()
  };

  db.transactions.unshift(transaction);
  writeDB(db);

  await sendPackagePurchaseEmail({
    toEmail: user.email,
    packageName: pkg.name[lang] || pkg.name.ar,
    storiesAdded: pkg.storiesCount,
    price: pkg.price,
    transactionId,
    lang
  });

  res.json({
    success: true,
    message: 'Payment completed successfully and story credits added!',
    transactionId,
    storiesAdded: pkg.storiesCount,
    freeStoriesLeft: user.freeStoriesLeft,
    user: sanitizeUser(user)
  });
});

// -------------------------------------------------------------
// 4. PLATFORM SETTINGS & ADMIN DASHBOARD ENDPOINTS
// -------------------------------------------------------------

// GET /api/settings - Public settings (font, site name, maintenance)
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json({ success: true, settings: db.settings });
});

// GET /api/admin/settings - Admin settings
app.get('/api/admin/settings', authenticateUser, requireRole('Admin'), (req, res) => {
  const db = readDB();
  res.json({ success: true, settings: db.settings });
});

// GET /api/admin/stats - Admin Dashboard Analytics
app.get('/api/admin/stats', authenticateUser, requireRole('Admin'), (req, res) => {
  const db = readDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const totalUsers = db.users.length;
  const activeToday = db.users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt).getTime() >= startOfToday).length;
  const pendingVerifications = db.users.filter(u => !u.isVerified).length;
  const pendingTeacherRequests = db.roleRequests.filter(r => r.status === 'pending').length;

  const totalStories = db.stories.length;
  const storiesToday = db.stories.filter(s => new Date(s.createdAt).getTime() >= startOfToday).length;
  const storiesThisWeek = db.stories.filter(s => new Date(s.createdAt).getTime() >= oneWeekAgo).length;

  // Category comparison
  const categoryStats = db.categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    count: db.stories.filter(s => s.category === cat.id).length
  }));

  res.json({
    success: true,
    stats: {
      totalUsers,
      activeToday,
      pendingVerifications,
      pendingTeacherRequests,
      totalStories,
      storiesToday,
      storiesThisWeek,
      categoryStats
    }
  });
});

// GET /api/admin/users - User Management Table
app.get('/api/admin/users', authenticateUser, requireRole('Admin'), (req, res) => {
  const db = readDB();
  const safeUsers = db.users.map(u => ({
    ...sanitizeUser(u),
    storiesCount: db.stories.filter(s => s.authorId === u.id).length
  }));
  res.json({ success: true, users: safeUsers });
});

// PUT /api/admin/users/:id - Change user role, status or credits
app.put('/api/admin/users/:id', authenticateUser, requireRole('Admin'), (req, res) => {
  const { role, status, freeStoriesLeft, firstName, lastName } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (role) user.role = role;
  if (status) user.status = status;
  if (freeStoriesLeft !== undefined) user.freeStoriesLeft = parseInt(freeStoriesLeft, 10);
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;

  writeDB(db);
  res.json({ success: true, message: 'User updated successfully', user: sanitizeUser(user) });
});

// GET /api/admin/story-maker-requests - List teacher upgrade requests
app.get('/api/admin/story-maker-requests', authenticateUser, requireRole('Admin'), (req, res) => {
  const db = readDB();
  res.json({ success: true, requests: db.roleRequests });
});

// POST /api/admin/story-maker-requests/:id/decide - Approve / Reject teacher request
app.post('/api/admin/story-maker-requests/:id/decide', authenticateUser, requireRole('Admin'), (req, res) => {
  const { action, feedback } = req.body;
  const db = readDB();
  const request = db.roleRequests.find(r => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }

  const user = db.users.find(u => u.id === request.userId);

  if (action === 'approve') {
    request.status = 'approved';
    request.decidedAt = new Date().toISOString();
    if (user) {
      user.role = 'Story Maker';
      user.teacherRequestStatus = 'approved';
    }
  } else {
    request.status = 'rejected';
    request.feedback = feedback || '';
    request.decidedAt = new Date().toISOString();
    if (user) {
      user.teacherRequestStatus = 'rejected';
    }
  }

  writeDB(db);
  res.json({ success: true, message: `Request ${action}d successfully`, request });
});

// Helper for backend category icon auto-detection
function suggestBackendCategoryIcon(nameAr = '', nameEn = '') {
  const text = (nameAr + ' ' + nameEn).toLowerCase();
  if (/(فضاء|صاروخ|كواكب|نجوم|علمي|scifi|sci-fi|space|rocket|planet|galaxy|alien)/i.test(text)) return 'Rocket';
  if (/(سحر|خيال|جني|أسطورة|ساحر|fantasy|magic|wizard|fairy|wand)/i.test(text)) return 'Wand2';
  if (/(نوم|هلال|قمر|ليل|أحلام|bedtime|sleep|night|moon|dream)/i.test(text)) return 'Moon';
  if (/(غموض|تحري|محقق|لغز|بحث|سر|mystery|detective|investigation|search|secret)/i.test(text)) return 'Search';
  if (/(تعليم|مدرسة|دراسة|معلم|طالب|علوم|education|school|learn|teacher|study|science)/i.test(text)) return 'GraduationCap';
  if (/(أخلاق|قيم|حب|عائلة|أسرة|صداقة|حكايات|fable|moral|heart|love|family|friend)/i.test(text)) return 'Heart';
  if (/(تاريخ|تراث|أجداد|قديم|حضارة|historical|history|heritage|ancient|monument)/i.test(text)) return 'Landmark';
  if (/(مغامرة|رحلة|استكشاف|سفر|طريق|adventure|explore|journey|travel|quest)/i.test(text)) return 'Compass';
  if (/(حيوان|قط|كلب|أليف|طيور|animal|pet|cat|dog|bird|creature)/i.test(text)) return /(كلب|dog)/i.test(text) ? 'Dog' : 'Cat';
  if (/(طبيعة|غابة|شجر|حديقة|زهور|بيئة|nature|forest|tree|garden|jungle)/i.test(text)) return 'Trees';
  if (/(ضحك|مرح|فكاهة|نكتة|ابتسامة|كوميديا|funny|comedy|humor|laugh|joke|smile)/i.test(text)) return 'Smile';
  if (/(رسم|فن|ألوان|إبداع|art|draw|color|paint|palette)/i.test(text)) return 'Palette';
  if (/(رياضة|كأس|بطولة|فوز|سباق|كرة|sport|champion|trophy|race|win)/i.test(text)) return 'Trophy';
  if (/(سيف|فارس|معركة|شجاعة|knight|sword|warrior|battle|brave)/i.test(text)) return 'Sword';
  if (/(درع|أبطال|بطل|حماية|shield|hero|superhero|protect)/i.test(text)) return 'Shield';
  if (/(ملك|أمير|أميرة|تاج|قصر|royal|king|queen|prince|princess|crown)/i.test(text)) return 'Crown';
  if (/(موسيقى|أغنية|لحن|عزف|أنشودة|music|song|melody|sound)/i.test(text)) return 'Music';
  if (/(عالم|ثقافة|دول|شعوب|بلدان|world|global|globe|culture|country)/i.test(text)) return 'Globe';
  if (/(طفل|أطفال|رضيع|صغار|baby|toddler|kid|child)/i.test(text)) return 'Baby';
  if (/(فكرة|ذكاء|ابتكار|عقل|اختراع|idea|brain|smart|invent|lightbulb)/i.test(text)) return 'Lightbulb';
  return 'BookOpen';
}

// PUT /api/admin/settings - Update system configurations
app.put('/api/admin/settings', authenticateUser, requireRole('Admin'), (req, res) => {
  const { siteName, siteSubtitle, arabicFont, defaultRole, defaultFreeStories, maintenanceMode, categories } = req.body;
  const db = readDB();

  let formattedSiteName = db.settings.siteName;
  if (siteName !== undefined) {
    if (typeof siteName === 'object' && siteName !== null) {
      formattedSiteName = {
        ar: (siteName.ar || '').trim(),
        en: (siteName.en || '').trim()
      };
    } else {
      formattedSiteName = {
        ar: String(siteName).trim(),
        en: String(siteName).trim()
      };
    }
  }

  let formattedSiteSubtitle = db.settings.siteSubtitle;
  if (siteSubtitle !== undefined) {
    if (typeof siteSubtitle === 'object' && siteSubtitle !== null) {
      formattedSiteSubtitle = {
        ar: (siteSubtitle.ar || '').trim(),
        en: (siteSubtitle.en || '').trim()
      };
    } else {
      formattedSiteSubtitle = {
        ar: String(siteSubtitle).trim(),
        en: String(siteSubtitle).trim()
      };
    }
  }

  db.settings = {
    ...db.settings,
    siteName: formattedSiteName,
    siteSubtitle: formattedSiteSubtitle,
    arabicFont: arabicFont || db.settings.arabicFont,
    defaultRole: defaultRole || db.settings.defaultRole,
    defaultFreeStories: defaultFreeStories !== undefined ? parseInt(defaultFreeStories, 10) : db.settings.defaultFreeStories,
    maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : db.settings.maintenanceMode
  };

  if (categories && Array.isArray(categories)) {
    if (categories.length === 0) {
      db.categories = [{ id: 'general', name: { ar: 'عام', en: 'General' }, icon: 'BookOpen', color: 'bg-indigo-600 text-white' }];
    } else {
      db.categories = categories;
    }
  }

  writeDB(db);
  res.json({ success: true, message: 'Platform settings saved successfully', settings: db.settings });
});

// POST /api/admin/categories - Create a new category with generated icon and color
app.post('/api/admin/categories', authenticateUser, requireRole('Admin'), (req, res) => {
  const { name, icon, color } = req.body;
  if (!name || (!name.ar && !name.en)) {
    return res.status(400).json({ success: false, message: 'Category name in Arabic or English is required' });
  }

  const db = readDB();
  const rawId = (name.en || name.ar || '').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
  const id = rawId && !db.categories.some(c => c.id === rawId) ? rawId : `cat_${Date.now() % 100000}`;
  
  const generatedIcon = icon || suggestBackendCategoryIcon(name.ar, name.en);
  const colorPalette = [
    'bg-indigo-600 text-white', 'bg-amber-500 text-white', 'bg-purple-600 text-white',
    'bg-blue-600 text-white', 'bg-cyan-600 text-white', 'bg-emerald-600 text-white',
    'bg-rose-600 text-white', 'bg-yellow-700 text-white', 'bg-orange-600 text-white'
  ];
  const generatedColor = color || colorPalette[db.categories.length % colorPalette.length];

  const newCategory = {
    id,
    name: {
      ar: (name.ar || name.en || '').trim(),
      en: (name.en || name.ar || '').trim()
    },
    icon: generatedIcon,
    color: generatedColor
  };

  db.categories.push(newCategory);
  writeDB(db);

  const categoriesWithCounts = db.categories.map(c => ({
    ...c,
    storiesCount: db.stories.filter(s => s.category === c.id).length
  }));

  res.json({
    success: true,
    message: 'Category created successfully',
    category: newCategory,
    categories: categoriesWithCounts
  });
});

// DELETE /api/admin/categories/:id - Delete category with safe story shifting and 1-category minimum rule
app.delete('/api/admin/categories/:id', authenticateUser, requireRole('Admin'), (req, res) => {
  const catId = req.params.id;
  const shiftTo = req.body?.shiftTo || req.query?.shiftTo;
  const db = readDB();

  // Enforce at least 1 category must always be available
  if (!db.categories || db.categories.length <= 1) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete the only remaining category. At least 1 category must remain available at all times.'
    });
  }

  const catIndex = db.categories.findIndex(c => c.id === catId);
  if (catIndex === -1) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const assignedStories = db.stories.filter(s => s.category === catId);

  // If category has stories, require a valid shiftTo target
  if (assignedStories.length > 0) {
    if (!shiftTo) {
      return res.status(400).json({
        success: false,
        error: 'HAS_STORIES',
        storiesCount: assignedStories.length,
        message: `This category has ${assignedStories.length} stories assigned to it. Please select another category to shift them before deleting.`
      });
    }

    if (shiftTo === catId) {
      return res.status(400).json({
        success: false,
        message: 'Destination category must be different from the category being deleted.'
      });
    }

    const targetCategory = db.categories.find(c => c.id === shiftTo);
    if (!targetCategory) {
      return res.status(400).json({
        success: false,
        message: 'Selected destination category does not exist.'
      });
    }

    // Shift all assigned stories to the destination category
    assignedStories.forEach(s => {
      s.category = shiftTo;
    });
    console.log(`[Categories] Reassigned ${assignedStories.length} stories from category "${catId}" to "${shiftTo}".`);
  }

  const deletedCategory = db.categories[catIndex];
  db.categories.splice(catIndex, 1);

  // Fallback safety check: ensure general exists if list became empty
  if (db.categories.length === 0) {
    db.categories.push({ id: 'general', name: { ar: 'عام', en: 'General' }, icon: 'BookOpen', color: 'bg-indigo-600 text-white' });
  }

  writeDB(db);

  const categoriesWithCounts = db.categories.map(c => ({
    ...c,
    storiesCount: db.stories.filter(s => s.category === c.id).length
  }));

  res.json({
    success: true,
    message: assignedStories.length > 0
      ? `Category deleted successfully and ${assignedStories.length} stories were reassigned to "${shiftTo}".`
      : 'Category deleted successfully.',
    shiftedCount: assignedStories.length,
    deletedCategory,
    categories: categoriesWithCounts
  });
});

// -------------------------------------------------------------
// 5. FILE EXTRACTION & STORY CREATION ENGINE
// -------------------------------------------------------------

// POST /api/upload - Extract text from PDF / TXT / Word files with Gemini Vision OCR fallback
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname.toLowerCase();
    let extractedText = '';

    if (originalName.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      try {
        const parsedData = await pdfParse(dataBuffer);
        extractedText = (parsedData.text || '').trim();
      } catch (e) {
        console.warn(`[File Extractor] pdf-parse notice: ${e.message}`);
      }

      if (extractedText.length < 50 && process.env.GEMINI_API_KEY) {
        console.log(`[File Extractor] Using Gemini Multimodal OCR Vision API to extract text from PDF...`);
        try {
          const pdfBase64 = dataBuffer.toString('base64');
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
          const visionRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: pdfBase64
                    }
                  },
                  {
                    text: 'You are an expert OCR document reader. Extract 100% of the verbatim Arabic story text printed on this document page. Output ONLY the raw story text verbatim without commentary.'
                  }
                ]
              }]
            })
          });

          if (visionRes.ok) {
            const visionData = await visionRes.json();
            const ocrText = visionData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (ocrText && ocrText.length > 50) {
              extractedText = ocrText.trim();
              console.log(`[File Extractor] Successfully extracted ${extractedText.length} chars via Gemini OCR Vision!`);
            } else {
              console.log(`[File Extractor] Gemini OCR returned short text:`, ocrText);
            }
          } else {
            const errorText = await visionRes.text();
            console.error(`[File Extractor] Gemini Vision OCR failed: ${visionRes.status} ${visionRes.statusText}`, errorText);
          }
        } catch (visionErr) {
          console.warn(`[File Extractor] Gemini Vision OCR notice: ${visionErr.message}`);
        }
      }
    } else {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    }

    fs.unlinkSync(filePath);

    console.log(`[File Extractor] Successfully extracted ${extractedText.length} characters from ${originalName}`);
    res.json({
      success: true,
      text: extractedText,
      fileName: req.file.originalname
    });
  } catch (err) {
    console.error('[File Extractor Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to extract text' });
  }
});

// GET /api/categories
app.get('/api/categories', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const db = readDB();
  const categoriesWithCounts = db.categories.map((cat) => {
    const totalCount = db.stories.filter((s) => s.category === cat.id).length;
    const publishedCount = db.stories.filter((s) => s.category === cat.id && s.status === 'published').length;
    return {
      ...cat,
      storiesCount: totalCount,
      publishedStoriesCount: publishedCount
    };
  });
  res.json({ success: true, categories: categoriesWithCounts });
});

// GET /api/stories
app.get('/api/stories', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const db = readDB();
  let list = db.stories.filter((s) => s.status === 'published');
  
  if (req.query.category) {
    list = list.filter((s) => s.category === req.query.category);
  }
  
  if (req.query.random === 'true' && list.length > 0) {
    const randomStory = list[Math.floor(Math.random() * list.length)];
    return res.json({ success: true, story: randomStory });
  }

  res.json({ success: true, stories: list });
});

// GET /api/stories/:id
app.get('/api/stories/:id', (req, res) => {
  const db = readDB();
  const story = db.stories.find((s) => s.id === req.params.id);
  if (!story) {
    return res.status(404).json({ success: false, message: 'Story not found' });
  }
  res.json({ success: true, story });
});

// POST /api/stories/plan - Step 4: AI Analysis & Verbatim Breakdown
app.post('/api/stories/plan', async (req, res) => {
  const { title, category, sourceText, lang, comments, userId } = req.body;
  if (!title && !sourceText) {
    return res.status(400).json({ success: false, message: 'Story title or content required' });
  }

  // Check story creation limit for Story Reader users
  if (userId) {
    const db = readDB();
    const user = db.users.find(u => u.id === userId);
    if (user && user.role === 'Story Reader' && user.freeStoriesLeft <= 0) {
      return res.status(403).json({
        success: false,
        limitReached: true,
        message: 'لقد استنفدت رصيد القصص المجانية المتاح. يرجى الترقية وشراء باقة للاستمرار في التأليف.'
      });
    }
  }

  try {
    const plan = await generateStoryPlanWithGemini({
      title,
      category,
      sourceText,
      lang,
      comments
    });

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (plan && plan.characters && plan.characters.length > 0) {
      // Use Promise.all to generate avatars in parallel
      await Promise.all(
        plan.characters.map(async (char) => {
          try {
            const avatarFileName = await generateCharacterAvatar(char, 'Anime / Manga', uploadsDir);
            char.avatarFilename = `/uploads/${avatarFileName}`;
          } catch (e) {
            console.warn(`[Avatar Generation Error] failed for ${char.name}: ${e.message}`);
          }
        })
      );
    }

    res.json({
      success: true,
      plan
    });
  } catch (err) {
    console.error('[API /api/stories/plan Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to generate story plan' });
  }
});

// 1. POST /api/stories/start-generation
app.post('/api/stories/start-generation', async (req, res) => {
  const { title } = req.body;
  const currentStoryId = (Date.now() % 100000).toString().padStart(4, '0');
  let sanitizedTitle = (title || 'New_Story').replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '_');
  let folderName = `[ID#${currentStoryId}]_${sanitizedTitle}`;
  let storyFolderPath = path.join(STORIES_DIR, folderName);

  // Ensure uniqueness if a folder with the exact same name already exists
  let counter = 1;
  while (fs.existsSync(storyFolderPath)) {
    folderName = `${sanitizedTitle}_${counter}`;
    storyFolderPath = path.join(STORIES_DIR, folderName);
    counter++;
  }

  const imgDir = path.join(storyFolderPath, 'story_images');
  const voiceDir = path.join(storyFolderPath, 'story_voice');

  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(voiceDir, { recursive: true });

  // Generate an AI-themed access restricted page for directory protection
  const restrictedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Restricted - Qisas AI</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #020617; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; }
    .card { background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(30, 41, 59, 0.8); padding: 3rem; border-radius: 1.5rem; max-width: 90%; width: 450px; }
    h1 { font-size: 2rem; font-weight: 900; background: linear-gradient(to right, #f59e0b, #f43f5e, #4f46e5); -webkit-background-clip: text; color: transparent; margin: 1rem 0; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; font-weight: 500; }
    .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #f59e0b; color: white; text-decoration: none; border-radius: 0.75rem; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 4rem;">🛡️</div>
    <h1>Access Restricted</h1>
    <p>This directory is protected by Qisas AI magic. Direct browsing of story assets is not permitted.</p>
    <a href="/" class="btn">Return to Safety</a>
  </div>
</body>
</html>`;

  // Write to all created folders to prevent listing
  fs.writeFileSync(path.join(storyFolderPath, 'index.html'), restrictedHtml);
  fs.writeFileSync(path.join(imgDir, 'index.html'), restrictedHtml);
  fs.writeFileSync(path.join(voiceDir, 'index.html'), restrictedHtml);

  res.json({
    success: true,
    storyId: currentStoryId,
    folderName
  });
});

// 2. POST /api/stories/generate-slide-image
app.post('/api/stories/generate-slide-image', async (req, res) => {
  const { folderName, slideIndex, slideText, storyTitle, category, characters, lang, userFeedback, artStyle } = req.body;
  const imgDir = path.join(STORIES_DIR, folderName, 'story_images');

  try {
    console.log(`[API] Generating Image for Slide ${slideIndex + 1} with character visual consistency and style ${artStyle}...`);
    const savedImgFilename = await generateAndSaveSlideImage({
      slideText,
      storyTitle,
      category,
      slideIndex,
      characters: characters || [],
      outputDir: imgDir,
      lang: lang || 'ar',
      userFeedback,
      artStyle
    });

    const imageFile = `/STORIES/${encodeURIComponent(folderName)}/story_images/${savedImgFilename}`;
    res.json({ success: true, slideIndex, imageFile });
  } catch (err) {
    console.error(`[API Image Error Slide ${slideIndex + 1}]:`, err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/stories/generate-slide-voice
app.post('/api/stories/generate-slide-voice', async (req, res) => {
  const { folderName, slideIndex, slideText, lang, voiceGender } = req.body;
  const voiceDir = path.join(STORIES_DIR, folderName, 'story_voice');

  try {
    console.log(`[API] Synthesizing Voice for Slide ${slideIndex + 1} via Gemini TTS API...`);
    const savedVoiceFilename = await generateAndSaveSlideVoice({
      slideText,
      slideIndex,
      outputDir: voiceDir,
      lang: lang || 'ar',
      voiceGender: voiceGender || 'male'
    });

    const voiceFile = `/STORIES/${encodeURIComponent(folderName)}/story_voice/${savedVoiceFilename}`;
    res.json({ success: true, slideIndex, voiceFile });
  } catch (err) {
    console.error(`[API Voice Error Slide ${slideIndex + 1}]:`, err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. POST /api/stories/finalize-generation
app.post('/api/stories/finalize-generation', async (req, res) => {
  const { storyId, folderName, title, category, lang, slides, comments, userId } = req.body;
  const db = readDB();

  const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(title);

  let authorName = 'مؤلف مجهول';
  if (userId) {
    const user = db.users.find(u => u.id === userId);
    if (user) {
      authorName = `${user.firstName} ${user.lastName}`.trim() || user.email;
      // Deduct 1 story if user is Story Reader
      if (user.role === 'Story Reader' && user.freeStoriesLeft > 0) {
        user.freeStoriesLeft--;
      }
    }
  }

  const newStory = {
    id: storyId,
    folderName,
    name: {
      ar: isArabic ? title : title,
      en: !isArabic ? title : title
    },
    category: category || 'adventure',
    lang: isArabic ? 'ar' : 'en',
    readTimeMinutes: Math.ceil(slides.length * 0.8),
    slidesCount: slides.length,
    status: 'draft',
    authorId: userId || null,
    authorName,
    readProgress: { currentSlide: 0, completed: false },
    createdAt: new Date().toISOString(),
    comments: comments || '',
    slides
  };

  db.stories.unshift(newStory);
  writeDB(db);

  console.log(`[API] Story generation finalized successfully: ${storyId} (${slides.length} slides)`);
  res.json({ success: true, story: newStory });
});

// POST /api/stories/:id/status - Approve / Publish or Delete
app.post('/api/stories/:id/status', (req, res) => {
  const { status } = req.body;
  const db = readDB();
  const storyIndex = db.stories.findIndex((s) => s.id === req.params.id);

  if (storyIndex === -1) {
    return res.status(404).json({ success: false, message: 'Story not found' });
  }

  const story = db.stories[storyIndex];

  if (status === 'deleted') {
    const storyFolderPath = path.join(STORIES_DIR, story.folderName);
    if (fs.existsSync(storyFolderPath)) {
      fs.rmSync(storyFolderPath, { recursive: true, force: true });
    }
    db.stories.splice(storyIndex, 1);
    writeDB(db);
    return res.json({ success: true, action: 'deleted' });
  } else {
    story.status = 'published';
    writeDB(db);
    return res.json({ success: true, action: 'published', story });
  }
});

// -------------------------------------------------------------
// 6. STORIES MODERATOR ENDPOINTS (Admin & Story Maker)
// -------------------------------------------------------------

// GET /api/moderation/stories - List stories with moderation info
app.get('/api/moderation/stories', authenticateUser, (req, res) => {
  const db = readDB();
  const currentUser = req.user;
  const isAdminUser = currentUser.role === 'Admin';
  const isMaker = currentUser.role === 'Story Maker';

  if (!isAdminUser && !isMaker) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Only Admin and Story Maker can moderate stories.' });
  }

  let list = db.stories || [];

  // Story Maker can only see and moderate their own stories; Admin sees all
  if (!isAdminUser) {
    list = list.filter(s => s.authorId === currentUser.id);
  }

  // Include category metadata for display
  const enrichedStories = list.map(s => {
    const cat = db.categories.find(c => c.id === s.category);
    return {
      ...s,
      categoryName: cat ? cat.name : { ar: s.category, en: s.category }
    };
  });

  res.json({
    success: true,
    stories: enrichedStories,
    userRole: currentUser.role,
    totalCount: enrichedStories.length
  });
});

// PUT /api/moderation/stories/:id/toggle-status - Activate / Deactivate story
app.put('/api/moderation/stories/:id/toggle-status', authenticateUser, (req, res) => {
  const db = readDB();
  const currentUser = req.user;
  const story = db.stories.find(s => s.id === req.params.id);

  if (!story) {
    return res.status(404).json({ success: false, message: 'Story not found' });
  }

  const isAdminUser = currentUser.role === 'Admin';
  const isOwner = story.authorId === currentUser.id;

  if (!isAdminUser && !isOwner) {
    return res.status(403).json({ success: false, message: 'Unauthorized. You can only moderate your own stories.' });
  }

  // Toggle status between published and draft
  const newStatus = story.status === 'published' ? 'draft' : 'published';
  story.status = newStatus;
  writeDB(db);

  console.log(`[Stories Moderator] Story "${story.name?.ar || story.id}" status toggled to "${newStatus}" by user ${currentUser.email}`);
  res.json({
    success: true,
    message: newStatus === 'published' ? 'تم تفعيل ونشر القصة بنجاح' : 'تم إلغاء تفعيل القصة وتحويلها لمسودة',
    status: newStatus,
    story
  });
});

// DELETE /api/moderation/stories/:id - Permanently delete story, wipe files/folder, update counters & quotas
app.delete('/api/moderation/stories/:id', authenticateUser, (req, res) => {
  const db = readDB();
  const currentUser = req.user;
  const storyIndex = db.stories.findIndex(s => s.id === req.params.id);

  if (storyIndex === -1) {
    return res.status(404).json({ success: false, message: 'Story not found' });
  }

  const story = db.stories[storyIndex];
  const isAdminUser = currentUser.role === 'Admin';
  const isOwner = story.authorId === currentUser.id;

  if (!isAdminUser && !isOwner) {
    return res.status(403).json({ success: false, message: 'Unauthorized. You cannot delete this story.' });
  }

  // 1. Permanently delete story folder and all photos / voices from disk
  if (story.folderName) {
    const storyFolderPath = path.join(STORIES_DIR, story.folderName);
    try {
      if (fs.existsSync(storyFolderPath)) {
        fs.rmSync(storyFolderPath, { recursive: true, force: true });
        console.log(`[Stories Moderator] Completely deleted folder on disk: ${storyFolderPath}`);
      }
    } catch (err) {
      console.error(`[Stories Moderator Error deleting folder]:`, err.message);
    }
  }

  // 2. Refund story quota to the author if applicable
  let refunded = false;
  if (story.authorId) {
    const authorUser = db.users.find(u => u.id === story.authorId);
    if (authorUser && authorUser.role !== 'Admin') {
      authorUser.freeStoriesLeft = (authorUser.freeStoriesLeft || 0) + 1;
      refunded = true;
      console.log(`[Stories Moderator] Refunded 1 story credit to author ${authorUser.email}. New balance: ${authorUser.freeStoriesLeft}`);
    }
  }

  // 3. Remove story from database
  const deletedStoryName = story.name?.ar || story.name?.en || story.id;
  db.stories.splice(storyIndex, 1);
  writeDB(db);

  // Recalculate categories count
  const updatedCategories = db.categories.map(cat => ({
    ...cat,
    storiesCount: db.stories.filter(s => s.category === cat.id && s.status === 'published').length
  }));

  console.log(`[Stories Moderator] Story "${deletedStoryName}" permanently deleted by ${currentUser.email}`);
  res.json({
    success: true,
    message: 'تم حذف القصة وكافة ملفاتها ورسوماتها وأصواتها نهائياً بنجاح وتحديث العدادات',
    deletedId: req.params.id,
    refunded,
    categories: updatedCategories
  });
});

// POST /api/stories/:id/progress - Save reader slide completion
app.post('/api/stories/:id/progress', (req, res) => {
  const { currentSlide, completed } = req.body;
  const db = readDB();
  const story = db.stories.find((s) => s.id === req.params.id);

  if (story) {
    story.readProgress = {
      currentSlide: currentSlide !== undefined ? currentSlide : story.readProgress.currentSlide,
      completed: completed !== undefined ? completed : story.readProgress.completed
    };
    writeDB(db);
  }

  res.json({ success: true });
});

// Serve Frontend
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Qisas Backend Server listening on http://localhost:${PORT}`);
});
