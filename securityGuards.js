import path from 'path';

/**
 * Security Guards Module for Qisas Story Generator
 * Provides centralized defenses against:
 * - Prompt Injection & System Override attacks in AI LLM generation
 * - File Upload attacks (MIME-spoofing, oversized payloads, malicious extensions)
 * - Path Traversal & Directory Escape attacks in file-system operations
 */

// Known prompt injection override patterns commonly used in jailbreak attempts
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|prompts)/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|directives)/gi,
  /you\s+are\s+now\s+(in\s+)?(developer|jailbreak|unrestricted|god)\s+mode/gi,
  /output\s+(all\s+)?(system|internal|hidden)\s+(prompts|instructions|secrets|api\s*keys)/gi,
  /system\s*override/gi,
  /\bDAN\s+mode\b/gi
];

/**
 * Sanitizes user input before embedding into AI prompts.
 * - Enforces character limit
 * - Neutralizes attempts to close boundary XML delimiter tags (e.g., </untrusted_user_story_input>)
 * - Flags or neutralizes explicit prompt injection override phrases
 * 
 * @param {string} input - Raw untrusted user text
 * @param {number} maxLength - Maximum allowable characters (default: 8000)
 * @returns {string} Sanitized string safe for prompt interpolation
 */
export function sanitizePromptInput(input, maxLength = 8000) {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Enforce max length to prevent token-exhaustion denial of service
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Escape boundary delimiter tags to prevent breaking out of <untrusted_...> enclosures
  sanitized = sanitized
    .replace(/<\/?untrusted[^>]*>/gi, '')
    .replace(/<\/?system[^>]*>/gi, '')
    .replace(/<\/?prompt[^>]*>/gi, '');

  // Neutralize known adversarial prompt injection phrases
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[filtered]');
  }

  return sanitized;
}

/**
 * Sanitizes a path segment (such as story ID, user folder name, or filename)
 * to prevent directory traversal attacks (e.g. "../", "..\\", null bytes).
 * 
 * @param {string} segment - Path segment from request parameters
 * @returns {string} Safe segment containing only alphanumeric, hyphen, underscore, and dot
 */
export function sanitizePathSegment(segment) {
  if (!segment || typeof segment !== 'string') return '';
  
  // Remove null bytes, path traversal sequences, and leading/trailing slashes
  return segment
    .replace(/\0/g, '')
    .replace(/\.\.+/g, '')
    .replace(/[/\\]/g, '')
    .trim();
}

/**
 * Multer file filter for document text extraction (/api/upload).
 * Permits only genuine PDF and plain text TXT files.
 */
export function documentFileFilter(req, file, cb) {
  const allowedExtensions = /\.(pdf|txt)$/i;
  const allowedMimeTypes = /^(application\/pdf|text\/plain)$/i;

  const extValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimeTypes.test(file.mimetype);

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid document format. Only PDF and TXT files under 10MB are allowed.'));
  }
}

/**
 * Multer file filter for Teacher School ID proof documents.
 * Permits only JPG, PNG, WebP images, or PDF documents.
 */
export function teacherProofFileFilter(req, file, cb) {
  const allowedExtensions = /\.(jpg|jpeg|png|webp|pdf)$/i;
  const allowedMimeTypes = /^(image\/(jpeg|png|webp)|application\/pdf)$/i;

  const extValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimeTypes.test(file.mimetype);

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid ID proof file. Only JPG, PNG, WebP images and PDF documents under 5MB are allowed.'));
  }
}
