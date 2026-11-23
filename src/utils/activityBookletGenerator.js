import jsPDF from 'jspdf';

/**
 * Activity Booklet Generator for Qisas Platform
 * Generates a 7-page downloadable, printable A4 PDF Activity Center:
 * - Page 1: Cover page with story title, author, and child's name field
 * - Pages 2-4: Clean black-and-white line art coloring pages (Sobel edge detection)
 * - Page 5: Word Search puzzle with 10 words extracted from story text
 * - Page 6: Story Maze & Character-Action Matching activity
 * - Page 7: Certificate of Achievement ("شهادة بطل القراءة الذكي")
 */

// Canvas dimensions for high-resolution A4 (200 DPI: 1654 x 2338)
const A4_WIDTH = 1654;
const A4_HEIGHT = 2338;

// Common Arabic stop words to exclude when extracting story keywords
const ARABIC_STOP_WORDS = new Set([
  'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'هذان', 'هاتان', 'هؤلاء',
  'ذلك', 'تلك', 'أولئك', 'الذي', 'التي', 'الذين', 'اللواتي', 'اللاتي', 'هو', 'هي',
  'هما', 'هم', 'هن', 'أنا', 'نحن', 'أنت', 'أنتما', 'أنتم', 'أنتن', 'كان', 'كانت',
  'كانوا', 'يكون', 'تكون', 'أن', 'إن', 'لكن', 'لأن', 'كي', 'حتى', 'إذا', 'لو',
  'ما', 'ماذا', 'لم', 'لن', 'لا', 'نعم', 'كل', 'بعض', 'غير', 'سوى', 'ثم', 'أو',
  'أم', 'بل', 'فقد', 'قد', 'بين', 'تحت', 'فوق', 'أمام', 'خلف', 'حيث', 'كيف',
  'لماذا', 'متى', 'أين', 'أي', 'فإن', 'وقد', 'وهو', 'وهي', 'وكان', 'وكانت'
]);

const THEME_ARABIC_WORDS = [
  'شجاعة', 'صداقة', 'مغامرة', 'أبطال', 'حكاية',
  'نجمة', 'كتاب', 'سعادة', 'ذكاء', 'إبداع',
  'همة', 'نجاح', 'حكمة', 'وفاء', 'أمل'
];

const THEME_ENGLISH_WORDS = [
  'HERO', 'FRIEND', 'STORY', 'BRAVE', 'MAGIC',
  'DREAM', 'HAPPY', 'LEARN', 'SHINE', 'STAR',
  'COURAGE', 'WISDOM', 'JOURNEY', 'SMILE', 'BOOK'
];

/**
 * Loads an image from a URL or data URL and returns an HTMLImageElement
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      return reject(new Error('No image source provided'));
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.warn('Failed to load image:', src, err);
      reject(err);
    };
    img.src = src;
  });
}

/**
 * Converts an image to clean, crisp storybook coloring line art.
 * Employs Extended Difference of Gaussians (XDoG), chromatic boundary analysis,
 * local texture clutter suppression, and despeckling to ensure:
 * - Clean pure white (#ffffff) coloring regions (90-95% of the page)
 * - Zero muddy texture/shadow blackouts (animals & characters remain white inside)
 * - Solid, continuous 2-3px outlines for leak-proof flood filling.
 * 
 * @param {HTMLImageElement|HTMLCanvasElement|string} input - Image source, element, or canvas
 * @param {number} targetWidth - Desired output width
 * @param {number} targetHeight - Desired output height
 * @param {object} options - Configuration options
 * @returns {Promise<HTMLCanvasElement>} Canvas containing clean line art
 */
export async function convertImageToLineArt(input, targetWidth = 1000, targetHeight = 750, options = {}) {
  let imgElement;
  if (typeof input === 'string') {
    try {
      imgElement = await loadImage(input);
    } catch (e) {
      console.warn('convertImageToLineArt fallback due to image load failure:', e);
      return createFallbackLineArtCanvas(targetWidth, targetHeight, options.title || 'مشهد القصة');
    }
  } else {
    imgElement = input;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  try {
    // 1. Draw scaled original image
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    // Maintain aspect ratio with contain/fit
    const imgAspect = (imgElement.width || targetWidth) / (imgElement.height || targetHeight);
    const canvasAspect = targetWidth / targetHeight;
    let drawW = targetWidth;
    let drawH = targetHeight;
    let drawX = 0;
    let drawY = 0;

    if (imgAspect > canvasAspect) {
      drawH = targetWidth / imgAspect;
      drawY = (targetHeight - drawH) / 2;
    } else {
      drawW = targetHeight * imgAspect;
      drawX = (targetWidth - drawW) / 2;
    }

    ctx.drawImage(imgElement, drawX, drawY, drawW, drawH);

    // 2. Extract pixel data
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const pixels = imgData.data;
    const w = targetWidth;
    const h = targetHeight;

    // 3. Grayscale luminance and RGB color channels
    const total = w * h;
    const gray = new Float32Array(total);
    const rChan = new Float32Array(total);
    const gChan = new Float32Array(total);
    const bChan = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      rChan[i] = r;
      gChan[i] = g;
      bChan[i] = b;
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Helper: Fast Separable 1D Gaussian Blur
    function gaussianBlur1D(src, sigma) {
      const radius = Math.max(1, Math.ceil(sigma * 2.5));
      const size = radius * 2 + 1;
      const kernel = new Float32Array(size);
      let ksum = 0;
      for (let i = -radius; i <= radius; i++) {
        const val = Math.exp(-(i * i) / (2 * sigma * sigma));
        kernel[i + radius] = val;
        ksum += val;
      }
      for (let i = 0; i < size; i++) kernel[i] /= ksum;

      const temp = new Float32Array(total);
      const dst = new Float32Array(total);

      for (let y = 0; y < h; y++) {
        const rowOffset = y * w;
        for (let x = 0; x < w; x++) {
          let acc = 0;
          for (let k = -radius; k <= radius; k++) {
            const px = Math.min(w - 1, Math.max(0, x + k));
            acc += src[rowOffset + px] * kernel[k + radius];
          }
          temp[rowOffset + x] = acc;
        }
      }

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let acc = 0;
          for (let k = -radius; k <= radius; k++) {
            const py = Math.min(h - 1, Math.max(0, y + k));
            acc += temp[py * w + x] * kernel[k + radius];
          }
          dst[y * w + x] = acc;
        }
      }
      return dst;
    }

    // 4. Multi-Channel Edge-Preserving Surface Blur
    // Flattens complex color shading, skin tones, paper grain, and background gradients
    // while strictly locking high-contrast boundary transitions
    function surfaceBlurRGB(radius = 3, threshold = 38) {
      const dst = new Float32Array(total);
      for (let y = 0; y < h; y++) {
        const rC = y * w;
        for (let x = 0; x < w; x++) {
          const idx = rC + x;
          const cR = rChan[idx];
          const cG = gChan[idx];
          const cB = bChan[idx];
          const cGray = gray[idx];
          let acc = 0;
          let count = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            const ny = Math.min(h - 1, Math.max(0, y + dy));
            const nRow = ny * w;
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = Math.min(w - 1, Math.max(0, x + dx));
              const nIdx = nRow + nx;
              const diffR = Math.abs(rChan[nIdx] - cR);
              const diffG = Math.abs(gChan[nIdx] - cG);
              const diffB = Math.abs(bChan[nIdx] - cB);
              const colorDiff = (diffR + diffG + diffB) / 3;

              if (colorDiff <= threshold) {
                const weight = 1 - (colorDiff / threshold);
                acc += gray[nIdx] * weight;
                count += weight;
              }
            }
          }
          dst[idx] = count > 0 ? (acc / count) : cGray;
        }
      }
      return dst;
    }

    // 5. Extended Difference of Gaussians (XDoG) Line Extraction
    // Produces organic, continuous storybook contours without jagged NMS quantization
    const smooth = surfaceBlurRGB(3, 38);
    const g1 = gaussianBlur1D(smooth, 0.95);
    const g2 = gaussianBlur1D(smooth, 2.5);

    const rawLines = new Uint8Array(total);
    const gammaVal = 0.965;
    const cutoff = -3.8;

    for (let i = 0; i < total; i++) {
      const diff = g1[i] - gammaVal * g2[i];
      if (diff < cutoff) {
        rawLines[i] = 1;
      }
    }

    // 6. Morphological 1px Dilation: Produces bold, leak-proof 2-3px outlines
    // Ensures flood-fill color bucket never leaks across antialiased pinholes
    const boldLines = new Uint8Array(total);
    for (let y = 1; y < h - 1; y++) {
      const rC = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = rC + x;
        if (rawLines[idx] || rawLines[idx - 1] || rawLines[idx + 1] || rawLines[idx - w] || rawLines[idx + w]) {
          boldLines[idx] = 1;
        }
      }
    }

    // 7. Micro-despeckling Connected Component Filter (< 12 px)
    // Deletes stray dust and noise specks while preserving 100% of facial features, pupils, and clothing lines
    const visited = new Uint8Array(total);
    const finalLines = new Uint8Array(total);
    const minCompSize = 12;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (boldLines[idx] && !visited[idx]) {
          const comp = [idx];
          visited[idx] = 1;
          let q = 0;
          while (q < comp.length) {
            const c = comp[q++];
            const cx = c % w;
            const cy = Math.floor(c / w);
            if (cx <= 1 || cx >= w - 2 || cy <= 1 || cy >= h - 2) continue;
            const nbs = [c - 1, c + 1, c - w, c + w];
            for (let k = 0; k < 4; k++) {
              const nb = nbs[k];
              if (boldLines[nb] && !visited[nb]) {
                visited[nb] = 1;
                comp.push(nb);
              }
            }
          }
          if (comp.length >= minCompSize) {
            for (let k = 0; k < comp.length; k++) {
              finalLines[comp[k]] = 1;
            }
          }
        }
      }
    }

    // 8. Clean perimeter border so flood filling cannot leak outside the drawing area
    for (let x = 0; x < w; x++) {
      finalLines[x] = 1;
      finalLines[w + x] = 1;
      finalLines[(h - 1) * w + x] = 1;
      finalLines[(h - 2) * w + x] = 1;
    }
    for (let y = 0; y < h; y++) {
      finalLines[y * w] = 1;
      finalLines[y * w + 1] = 1;
      finalLines[y * w + (w - 1)] = 1;
      finalLines[y * w + (w - 2)] = 1;
    }

    // 9. Write crisp dark charcoal outlines (#181e28) on pure white paper (#ffffff)
    const output = ctx.createImageData(w, h);
    const outData = output.data;

    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      if (finalLines[i]) {
        // Deep crisp charcoal outline (luminance < 55 for flood-fill boundary detection)
        outData[idx] = 24;
        outData[idx + 1] = 30;
        outData[idx + 2] = 40;
        outData[idx + 3] = 255;
      } else {
        // Pure white colorable canvas
        outData[idx] = 255;
        outData[idx + 1] = 255;
        outData[idx + 2] = 255;
        outData[idx + 3] = 255;
      }
    }

    ctx.putImageData(output, 0, 0);

    // 10. Solid perimeter border to keep flood-fill sealed at canvas margins
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(3, 3, targetWidth - 6, targetHeight - 6);

    return canvas;
  } catch (err) {
    console.warn('Canvas pixel processing error (likely CORS SecurityError):', err);
    return createFallbackLineArtCanvas(targetWidth, targetHeight, options.title || 'مشهد القصة');
  }
}

/**
 * Creates a delightful kid-friendly vector line-art drawing if image processing fails or is blocked
 */
export function createFallbackLineArtCanvas(w, h, title = '') {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1e293b';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw framed landscape scene
  // Ground hills
  ctx.beginPath();
  ctx.moveTo(0, h * 0.75);
  ctx.bezierCurveTo(w * 0.25, h * 0.65, w * 0.5, h * 0.85, w, h * 0.7);
  ctx.stroke();

  // Background mountains
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.7);
  ctx.lineTo(w * 0.3, h * 0.35);
  ctx.lineTo(w * 0.5, h * 0.7);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(w * 0.4, h * 0.7);
  ctx.lineTo(w * 0.65, h * 0.28);
  ctx.lineTo(w * 0.9, h * 0.72);
  ctx.stroke();

  // Smiling Sun in sky
  const sunX = w * 0.82;
  const sunY = h * 0.22;
  const sunR = 45;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.stroke();

  // Sun rays
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(angle) * (sunR + 8), sunY + Math.sin(angle) * (sunR + 8));
    ctx.lineTo(sunX + Math.cos(angle) * (sunR + 25), sunY + Math.sin(angle) * (sunR + 25));
    ctx.stroke();
  }

  // Sun face
  ctx.beginPath();
  ctx.arc(sunX - 14, sunY - 10, 4, 0, Math.PI * 2);
  ctx.arc(sunX + 14, sunY - 10, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(sunX, sunY + 6, 18, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Floating clouds
  drawCloud(ctx, w * 0.22, h * 0.18, 50);
  drawCloud(ctx, w * 0.52, h * 0.14, 38);

  // Cute story castle / house in center
  const houseX = w * 0.38;
  const houseY = h * 0.52;
  ctx.strokeRect(houseX, houseY, 160, 130);
  // Roof triangle
  ctx.beginPath();
  ctx.moveTo(houseX - 15, houseY);
  ctx.lineTo(houseX + 80, houseY - 70);
  ctx.lineTo(houseX + 175, houseY);
  ctx.closePath();
  ctx.stroke();

  // Door
  ctx.beginPath();
  ctx.arc(houseX + 80, houseY + 80, 22, Math.PI, 0);
  ctx.lineTo(houseX + 102, houseY + 130);
  ctx.lineTo(houseX + 58, houseY + 130);
  ctx.closePath();
  ctx.stroke();

  // Window
  ctx.strokeRect(houseX + 22, houseY + 25, 32, 32);
  ctx.strokeRect(houseX + 106, houseY + 25, 32, 32);

  // Friendly tree
  drawTree(ctx, w * 0.16, h * 0.58, 120);
  drawTree(ctx, w * 0.78, h * 0.62, 90);

  // Border frame
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  return canvas;
}

function drawCloud(ctx, x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.45, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + size * 0.45, y - size * 0.3, size * 0.5, Math.PI * 1, Math.PI * 1.85);
  ctx.arc(x + size * 0.95, y - size * 0.2, size * 0.45, Math.PI * 1.3, Math.PI * 2.1);
  ctx.arc(x + size * 1.35, y, size * 0.4, Math.PI * 1.6, Math.PI * 0.5);
  ctx.closePath();
  ctx.stroke();
}

function drawTree(ctx, x, y, height) {
  // Trunk
  ctx.strokeRect(x - 12, y, 24, height);
  // Foliage
  ctx.beginPath();
  ctx.arc(x, y - 25, 45, 0, Math.PI * 2);
  ctx.arc(x - 25, y - 5, 35, 0, Math.PI * 2);
  ctx.arc(x + 25, y - 5, 35, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Text wrapping utility for HTML5 Canvas with RTL and LTR support
 */
export function wrapText(ctx, text, x, y, maxWidth, lineHeight, align = 'center') {
  if (!text) return y;
  const words = String(text).split(/\s+/);
  let line = '';
  let currentY = y;

  ctx.textAlign = align;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

/**
 * Draws an elegant double border with corner stars / flourishes
 */
function drawPageBorder(ctx, w, h, primaryColor = '#3b82f6', secondaryColor = '#f59e0b') {
  // Outer decorative border
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = primaryColor;
  ctx.strokeRect(40, 40, w - 80, h - 80);

  // Inner thin border
  ctx.lineWidth = 2;
  ctx.strokeStyle = secondaryColor;
  ctx.strokeRect(52, 52, w - 104, h - 104);

  // Corner star flourishes
  const corners = [
    [40, 40],
    [w - 40, 40],
    [40, h - 40],
    [w - 40, h - 40]
  ];

  for (const [cx, cy] of corners) {
    drawStar(ctx, cx, cy, 5, 14, 6, secondaryColor);
  }
  ctx.restore();
}

/**
 * Draws a 5-point star
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color = '#f59e0b') {
  ctx.save();
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();
  ctx.restore();
}

/**
 * Standard Header for Activity Booklet pages
 */
function drawPageHeader(ctx, w, title, subtitle, pageNum, totalPages = 7, lang = 'ar') {
  ctx.save();
  // Header bar
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(54, 54, w - 108, 110);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(54, 54, w - 108, 110);

  // Top badge
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 26px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText('مِنَصَّةُ قِصَصْ الذَّكِيَّةِ للأَطْفَالِ ★ QISAS.AI', w - 85, 96);

  // Page title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.fillText(title, w - 85, 142);

  // Page indicator badge (left side)
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 24px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  const pageStr = lang === 'ar' ? `الصفحة ${pageNum} من ${totalPages}` : `Page ${pageNum} of ${totalPages}`;
  ctx.fillText(pageStr, 85, 120);

  ctx.restore();
}

/**
 * Standard Footer for Activity Booklet pages
 */
function drawPageFooter(ctx, w, h, pageNum, totalPages = 7, lang = 'ar') {
  ctx.save();
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';

  const footerText = lang === 'ar'
    ? `كُتيّب الأنشطة والتلوين الذكي • منصة قصص للأطفال • صفحة ${pageNum} من ${totalPages} 🌟`
    : `Smart Activity & Coloring Booklet • Qisas Kids Platform • Page ${pageNum} of ${totalPages} 🌟`;

  ctx.fillText(footerText, w / 2, h - 65);
  ctx.restore();
}

/**
 * Extracts 10 meaningful vocabulary words from the story for Word Search
 */
export function extractStoryVocabularyWords(story, lang = 'ar') {
  const isAr = lang === 'ar' || !story?.lang || story?.lang === 'ar';
  const fullText = [
    typeof story.name === 'object' ? (story.name.ar || story.name.en || '') : (story.name || ''),
    story.title || '',
    ...(story.slides || []).map((s) => (s.title || '') + ' ' + (s.text || ''))
  ].join(' ');

  if (isAr) {
    // Strip diacritics / tashkeel and non-arabic characters
    const cleanStr = fullText.replace(/[\u064B-\u065F\u0670\u0640]/g, ' ');
    const rawTokens = cleanStr.split(/[^\u0621-\u064A]+/);
    const seen = new Set();
    const result = [];

    for (const token of rawTokens) {
      const w = token.trim();
      // Look for suitable words: 3 to 6 letters, not in stop words
      if (w.length >= 3 && w.length <= 6 && !ARABIC_STOP_WORDS.has(w) && !seen.has(w)) {
        seen.add(w);
        result.push(w);
        if (result.length >= 10) break;
      }
    }

    // Supplement with thematic words if fewer than 10 words extracted
    let fallbackIdx = 0;
    while (result.length < 10 && fallbackIdx < THEME_ARABIC_WORDS.length) {
      const candidate = THEME_ARABIC_WORDS[fallbackIdx++];
      if (!seen.has(candidate)) {
        seen.add(candidate);
        result.push(candidate);
      }
    }

    return result.slice(0, 10);
  } else {
    // English words extraction
    const rawTokens = fullText.toUpperCase().split(/[^A-Z]+/);
    const seen = new Set();
    const result = [];
    const enStop = new Set(['THE', 'AND', 'FOR', 'WITH', 'WAS', 'THAT', 'THIS', 'THEY', 'FROM', 'HAVE', 'WERE']);

    for (const token of rawTokens) {
      const w = token.trim();
      if (w.length >= 4 && w.length <= 7 && !enStop.has(w) && !seen.has(w)) {
        seen.add(w);
        result.push(w);
        if (result.length >= 10) break;
      }
    }

    let fallbackIdx = 0;
    while (result.length < 10 && fallbackIdx < THEME_ENGLISH_WORDS.length) {
      const candidate = THEME_ENGLISH_WORDS[fallbackIdx++];
      if (!seen.has(candidate)) {
        seen.add(candidate);
        result.push(candidate);
      }
    }

    return result.slice(0, 10);
  }
}

/**
 * Builds a 12x12 Word Search puzzle grid containing the given words
 */
export function buildWordSearchPuzzle(words, gridSize = 12, lang = 'ar') {
  const isAr = lang === 'ar';
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  const placedWords = [];

  // Directions: [dx, dy]
  // In Arabic, reading horizontally is right-to-left (dx = -1) or vertical down (dy = 1)
  const directions = isAr
    ? [
        [-1, 0], // Horizontal RTL
        [0, 1],  // Vertical down
        [-1, 1], // Diagonal down-left
        [1, 0]   // Horizontal LTR (occasionally)
      ]
    : [
        [1, 0],  // Horizontal LTR
        [0, 1],  // Vertical down
        [1, 1],  // Diagonal down-right
        [-1, 0]  // Horizontal RTL
      ];

  for (const word of words) {
    const letters = isAr ? word.replace(/[\u064B-\u065F\u0670\u0640]/g, '').split('') : word.toUpperCase().split('');
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 150) {
      attempts++;
      const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
      
      // Calculate valid start bounds
      let minX = 0;
      let maxX = gridSize - 1;
      let minY = 0;
      let maxY = gridSize - 1;

      if (dx === 1) maxX = gridSize - letters.length;
      if (dx === -1) minX = letters.length - 1;
      if (dy === 1) maxY = gridSize - letters.length;
      if (dy === -1) minY = letters.length - 1;

      if (minX > maxX || minY > maxY) continue;

      const startX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
      const startY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

      // Check collision
      let canPlace = true;
      for (let i = 0; i < letters.length; i++) {
        const cx = startX + i * dx;
        const cy = startY + i * dy;
        const currentCell = grid[cy][cx];
        if (currentCell !== '' && currentCell !== letters[i]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        for (let i = 0; i < letters.length; i++) {
          const cx = startX + i * dx;
          const cy = startY + i * dy;
          grid[cy][cx] = letters[i];
        }
        placed = true;
        placedWords.push(word);
      }
    }
  }

  // Fill empty cells with random letters
  const arabicLetters = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];
  const englishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letterPool = isAr ? arabicLetters : englishLetters;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letterPool[Math.floor(Math.random() * letterPool.length)];
      }
    }
  }

  return { grid, words, gridSize };
}

/**
 * Generates an authentic, solvable 2D maze using DFS backtracker
 */
export function generateMaze(cols = 14, rows = 10) {
  // Cells with 4 walls: top, right, bottom, left
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      visited: false,
      top: true,
      right: true,
      bottom: true,
      left: true
    }))
  );

  const stack = [];
  let current = { r: 0, c: 0 };
  cells[0][0].visited = true;

  while (true) {
    const { r, c } = current;
    const neighbors = [];

    // Top
    if (r > 0 && !cells[r - 1][c].visited) neighbors.push({ r: r - 1, c, dir: 'top' });
    // Right
    if (c < cols - 1 && !cells[r][c + 1].visited) neighbors.push({ r, c: c + 1, dir: 'right' });
    // Bottom
    if (r < rows - 1 && !cells[r + 1][c].visited) neighbors.push({ r: r + 1, c, dir: 'bottom' });
    // Left
    if (c > 0 && !cells[r][c - 1].visited) neighbors.push({ r, c: c - 1, dir: 'left' });

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      // Knock down wall
      if (next.dir === 'top') {
        cells[r][c].top = false;
        cells[next.r][next.c].bottom = false;
      } else if (next.dir === 'right') {
        cells[r][c].right = false;
        cells[next.r][next.c].left = false;
      } else if (next.dir === 'bottom') {
        cells[r][c].bottom = false;
        cells[next.r][next.c].top = false;
      } else if (next.dir === 'left') {
        cells[r][c].left = false;
        cells[next.r][next.c].right = false;
      }

      cells[next.r][next.c].visited = true;
      stack.push(current);
      current = { r: next.r, c: next.c };
    } else if (stack.length > 0) {
      current = stack.pop();
    } else {
      break;
    }
  }

  // Open entrance and exit
  cells[0][0].left = false;
  cells[rows - 1][cols - 1].right = false;

  return { cols, rows, cells };
}

// ==========================================
// PAGE RENDERERS (Returns Canvas for each page)
// ==========================================

/**
 * PAGE 1: Cover Page
 */
export async function renderPage1Cover(story, childName = '', lang = 'ar') {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH;
  canvas.height = A4_HEIGHT;
  const ctx = canvas.getContext('2d');

  // Pure white paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

  // Decorative border
  drawPageBorder(ctx, A4_WIDTH, A4_HEIGHT, '#4f46e5', '#f59e0b');

  const storyTitle = (typeof story.name === 'object' && story.name
    ? (story.name[lang] || story.name.ar || story.name.en)
    : story.name) || story.title || 'قصة الأبطال الذكية';

  const authorName = story.authorName || 'مبدعو منصة قصص';

  // 1. Top Platform Ribbon
  ctx.save();
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(100, 100, A4_WIDTH - 200, 75);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('🌟 مِنَصَّةُ قِصَصْ التَّفَاعُلِيَّةِ الذَّكِيَّةِ للأَطْفَالِ 🌟', A4_WIDTH / 2, 150);
  ctx.restore();

  // 2. Main Title Banner
  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(100, 220, A4_WIDTH - 200, 360);
  ctx.fillRect(100, 220, A4_WIDTH - 200, 360);

  // Big Header
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 44px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('🎨 كُتَيِّبُ الأَنْشِطَةِ وَالتَّلْوِينِ الشَّامِلِ 🎨', A4_WIDTH / 2, 290);

  // Story Name
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 64px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  wrapText(ctx, `« ${storyTitle} »`, A4_WIDTH / 2, 380, A4_WIDTH - 260, 75, 'center');

  // Author & Category Pill
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 30px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.fillText(`تأليف الكاتب: ${authorName}  •  سلسلة حكايات مسومس الذكية 2026`, A4_WIDTH / 2, 530);
  ctx.restore();

  // 3. Central Line-Art Feature Illustration / Vignette
  const slide1Img = story.slides?.[0]?.imageFile;
  let coverArtCanvas = null;
  if (slide1Img) {
    try {
      coverArtCanvas = await convertImageToLineArt(slide1Img, 1000, 560);
    } catch (e) {
      coverArtCanvas = createFallbackLineArtCanvas(1000, 560);
    }
  } else {
    coverArtCanvas = createFallbackLineArtCanvas(1000, 560);
  }

  ctx.save();
  // Frame for cover art
  const artX = (A4_WIDTH - 1000) / 2;
  const artY = 620;
  ctx.drawImage(coverArtCanvas, artX, artY, 1000, 560);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(artX, artY, 1000, 560);

  // Cute caption on art
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(artX + 350, artY + 520, 300, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('لوّن الغلاف بأجمل الألوان! 🖍️', artX + 500, artY + 545);
  ctx.restore();

  // 4. Child's Personalization Box (Required: "هذا الكتيب يخص البطل: _____")
  ctx.save();
  const boxY = 1220;
  ctx.fillStyle = '#fffbeb';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(100, boxY, A4_WIDTH - 200, 320);
  ctx.fillRect(100, boxY, A4_WIDTH - 200, 320);

  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 40px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('🌟 هذا الكتيب يخص البطل / البطلة الصغير(ة) 🌟', A4_WIDTH / 2, boxY + 70);

  // Name line
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('الاسم الكريم:', A4_WIDTH - 160, boxY + 150);
  
  // Dotted underline
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(160, boxY + 155);
  ctx.lineTo(A4_WIDTH - 360, boxY + 155);
  ctx.stroke();
  ctx.setLineDash([]);

  if (childName) {
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 42px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(childName, A4_WIDTH / 2, boxY + 145);
  }

  // Grade & Date fields
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 30px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('الصف الدراسي: ______________________', A4_WIDTH - 160, boxY + 230);
  ctx.fillText('التاريخ: ______________________', A4_WIDTH / 2 - 30, boxY + 230);

  ctx.fillStyle = '#64748b';
  ctx.font = '24px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('« اقرأ بتمعن، لوّن بإبداع، وحل التمارين لتنال شهادة بطل القراءة الذكي! »', A4_WIDTH / 2, boxY + 285);
  ctx.restore();

  // 5. Missions / Table of Contents Preview
  ctx.save();
  const missionsY = 1580;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(100, missionsY, A4_WIDTH - 200, 560);
  ctx.fillRect(100, missionsY, A4_WIDTH - 200, 560);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('🎯 ما ستجده داخل هذا الكتيب التعليمي الممتع:', A4_WIDTH / 2, missionsY + 60);

  const missions = [
    { num: '١', icon: '🎨', title: '٣ صفحات تلوين تفاعلية لمشاهد القصة (تحويل خطي عالي الدقة)', sub: 'الصفحات ٢ - ٤' },
    { num: '٢', icon: '🔍', title: 'لعبة البحث عن الكلمات الضائعة (١٠ كلمات من نص القصة)', sub: 'الصفحة ٥' },
    { num: '٣', icon: '🌀', title: 'متاهة البطل وتوصيل الشخصيات بأفعالها البطولية', sub: 'الصفحة ٦' },
    { num: '٤', icon: '🏆', title: 'شهادة إنجاز بطل القراءة الذكي المعتمدة مع ختم التميز', sub: 'الصفحة ٧' }
  ];

  missions.forEach((m, idx) => {
    const itemY = missionsY + 130 + idx * 95;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(140, itemY, A4_WIDTH - 280, 75);
    ctx.fillRect(140, itemY, A4_WIDTH - 280, 75);

    // Number & Icon
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 34px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${m.icon} ${m.num}.`, A4_WIDTH - 170, itemY + 48);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(m.title, A4_WIDTH - 250, itemY + 48);

    // Page tag
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 24px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.fillText(m.sub, 170, itemY + 48);
    ctx.direction = 'rtl';
  });

  ctx.restore();

  // Footer
  drawPageFooter(ctx, A4_WIDTH, A4_HEIGHT, 1, 7, lang);

  return canvas;
}

/**
 * PAGES 2, 3, 4: Story Coloring Pages
 */
export async function renderColoringPage(slide, pageNum, totalPages = 7, story = {}, lang = 'ar') {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH;
  canvas.height = A4_HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

  drawPageBorder(ctx, A4_WIDTH, A4_HEIGHT, '#0284c7', '#f59e0b');

  const coloringIdx = pageNum - 1; // 1, 2, or 3
  const slideTitle = slide?.title || `المشهد رقم ${coloringIdx}`;
  drawPageHeader(
    ctx,
    A4_WIDTH,
    `صفحة التلوين (${coloringIdx}): ${slideTitle}`,
    'لوّن المشهد بدقة مستمتعاً بتفاصيل القصة',
    pageNum,
    totalPages,
    lang
  );

  // 1. Convert slide image to Line Art via Sobel edge detection filter
  const imgUrl = slide?.imageFile;
  let lineArtCanvas = null;
  const targetW = 1450;
  const targetH = 1080;

  if (imgUrl) {
    try {
      lineArtCanvas = await convertImageToLineArt(imgUrl, targetW, targetH, {
        title: slideTitle
      });
    } catch (e) {
      lineArtCanvas = createFallbackLineArtCanvas(targetW, targetH, slideTitle);
    }
  } else {
    lineArtCanvas = createFallbackLineArtCanvas(targetW, targetH, slideTitle);
  }

  // 2. Render Line Art into a large framed area
  const artX = (A4_WIDTH - targetW) / 2;
  const artY = 200;

  ctx.save();
  ctx.drawImage(lineArtCanvas, artX, artY, targetW, targetH);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(artX, artY, targetW, targetH);
  ctx.restore();

  // 3. Story Snippet Reading Box
  ctx.save();
  const textY = 1320;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.strokeRect(artX, textY, targetW, 360);
  ctx.fillRect(artX, textY, targetW, 360);

  // Text title
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 32px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText('📖 اقرأ المشهد أثناء التلوين:', artX + targetW - 40, textY + 55);

  // Text content
  ctx.fillStyle = '#1e293b';
  ctx.font = '28px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  const slideText = slide?.text || 'في هذا المشهد الرائع، تتوالى أحداث القصة المثيرة المليئة بالدروس والعبر...';
  wrapText(ctx, slideText, artX + targetW - 40, textY + 115, targetW - 80, 48, 'right');
  ctx.restore();

  // 4. Color by Number / Palette Suggestions
  ctx.save();
  const paletteY = 1720;
  ctx.fillStyle = '#fffbeb';
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 3;
  ctx.strokeRect(artX, paletteY, targetW, 240);
  ctx.fillRect(artX, paletteY, targetW, 240);

  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 30px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText('🎨 لوحة الألوان المقترحة لهذا المشهد:', artX + targetW - 40, paletteY + 50);

  // 6 Palette Swatches
  const swatches = [
    { color: '#ef4444', name: 'أحمر زاهي' },
    { color: '#f59e0b', name: 'أصفر ذهبي' },
    { color: '#10b981', name: 'أخضر عشبي' },
    { color: '#06b6d4', name: 'أزرق سماوي' },
    { color: '#6366f1', name: 'نيلي ملكي' },
    { color: '#ec4899', name: 'وردي لطيف' }
  ];

  const swatchSpacing = (targetW - 100) / swatches.length;
  swatches.forEach((sw, idx) => {
    const cx = artX + targetW - 80 - idx * swatchSpacing;
    const cy = paletteY + 130;

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fillStyle = sw.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Color name label
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 22px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sw.name, cx, cy + 62);
  });

  ctx.restore();

  // Footer
  drawPageFooter(ctx, A4_WIDTH, A4_HEIGHT, pageNum, totalPages, lang);

  return canvas;
}

/**
 * PAGE 5: Word Search Puzzle Page
 */
export function renderWordSearchPage(story, lang = 'ar') {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH;
  canvas.height = A4_HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

  drawPageBorder(ctx, A4_WIDTH, A4_HEIGHT, '#10b981', '#f59e0b');

  drawPageHeader(
    ctx,
    A4_WIDTH,
    'لعبة البحث عن الكلمات الضائعة (Word Search)',
    'ابحث عن الكلمات الـ 10 المستوحاة من أحداث القصة في الشبكة',
    5,
    7,
    lang
  );

  // 1. Extract words and generate 12x12 grid
  const words = extractStoryVocabularyWords(story, lang);
  const { grid, gridSize } = buildWordSearchPuzzle(words, 12, lang);

  // 2. Instructions Box
  ctx.save();
  ctx.fillStyle = '#ecfdf5';
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 3;
  ctx.strokeRect(100, 190, A4_WIDTH - 200, 95);
  ctx.fillRect(100, 190, A4_WIDTH - 200, 95);

  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 28px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(
    '🔍 طريقة اللعب: ابحث عن كل كلمة أفقياً أو عمودياً أو مائلاً، ثم ضع علامة (✓) بجانبها عند العثور عليها!',
    A4_WIDTH / 2,
    250
  );
  ctx.restore();

  // 3. Draw 12x12 Word Search Grid
  ctx.save();
  const cellSize = 82;
  const gridTotalW = cellSize * gridSize;
  const gridX = (A4_WIDTH - gridTotalW) / 2;
  const gridY = 320;

  // Grid outer shadow box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(gridX - 10, gridY - 10, gridTotalW + 20, gridTotalW + 20);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(gridX - 10, gridY - 10, gridTotalW + 20, gridTotalW + 20);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cx = gridX + c * cellSize;
      const cy = gridY + r * cellSize;

      // Cell rectangle
      ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#f1f5f9';
      ctx.fillRect(cx, cy, cellSize, cellSize);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(cx, cy, cellSize, cellSize);

      // Letter inside cell
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 42px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(grid[r][c], cx + cellSize / 2, cy + cellSize / 2 + 2);
    }
  }
  ctx.restore();

  // 4. Checklist of the 10 words at the bottom
  ctx.save();
  const listY = 1380;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.strokeRect(100, listY, A4_WIDTH - 200, 580);
  ctx.fillRect(100, listY, A4_WIDTH - 200, 580);

  // List header
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('📋 قائمة الكلمات الـ ١٠ المطلوب البحث عنها:', A4_WIDTH / 2, listY + 65);

  // 2 Columns of 5 words
  const colW = (A4_WIDTH - 280) / 2;
  words.forEach((w, idx) => {
    const isCol1 = idx < 5;
    const colIdx = isCol1 ? 0 : 1;
    const rowIdx = idx % 5;

    const itemX = A4_WIDTH - 150 - colIdx * colW;
    const itemY = listY + 140 + rowIdx * 80;

    // Checkbox square
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#059669';
    ctx.strokeRect(itemX - 44, itemY - 30, 38, 38);

    // Number & Word
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 34px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(`${idx + 1}.  ${w}`, itemX - 60, itemY);
  });

  // Encouraging note
  ctx.fillStyle = '#64748b';
  ctx.font = '24px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌟 أحسنت! بعد إيجاد كل الكلمات، يمكنك تلوين الحروف بألوانك المفضلة! 🌟', A4_WIDTH / 2, listY + 540);
  ctx.restore();

  // Footer
  drawPageFooter(ctx, A4_WIDTH, A4_HEIGHT, 5, 7, lang);

  return canvas;
}

/**
 * PAGE 6: Story Maze & Matching Activity Page
 */
export function renderMazeAndMatchingPage(story, lang = 'ar') {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH;
  canvas.height = A4_HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

  drawPageBorder(ctx, A4_WIDTH, A4_HEIGHT, '#8b5cf6', '#f59e0b');

  drawPageHeader(
    ctx,
    A4_WIDTH,
    'توصيل الشخصيات ومتاهة البطل الذكي',
    'صل بين الأبطال وأفعالهم، ثم ساعد البطل لاجتياز المتاهة',
    6,
    7,
    lang
  );

  // ==========================================
  // PART A: Character Matching Activity (Top)
  // ==========================================
  ctx.save();
  const matchBoxY = 190;
  ctx.fillStyle = '#faf5ff';
  ctx.strokeStyle = '#d8b4fe';
  ctx.lineWidth = 3;
  ctx.strokeRect(100, matchBoxY, A4_WIDTH - 200, 680);
  ctx.fillRect(100, matchBoxY, A4_WIDTH - 200, 680);

  ctx.fillStyle = '#7e22ce';
  ctx.font = 'bold 34px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('🔗 النشاط الأول: صل بين شخصيات القصة والصفات أو الأفعال التي تناسبها:', A4_WIDTH / 2, matchBoxY + 55);

  // 4 items on Right (Characters), 4 on Left (Actions - shuffled)
  const leftActions = [
    { text: 'يقدم المساعدة والوفاء في وقت الشدة', id: 2 },
    { text: 'ينطلق بشجاعة في استكشاف المجهول', id: 1 },
    { text: 'تُمنح للمثابر الذي لا يستسلم أبداً', id: 4 },
    { text: 'يرشد الآخرين بنصائحه وتجاربه الحكيمة', id: 3 }
  ];

  const rightCharacters = [
    { text: '🦸‍♂️ بطل القصة الشجاع', id: 1 },
    { text: '🤝 الصديق المخلص', id: 2 },
    { text: '🦉 المرشد الحكيم', id: 3 },
    { text: '🏆 جائزة التميز', id: 4 }
  ];

  const colCardW = 560;
  const cardH = 95;

  rightCharacters.forEach((char, idx) => {
    const cardY = matchBoxY + 110 + idx * 135;

    // Right Card (Character)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(A4_WIDTH - 140 - colCardW, cardY, colCardW, cardH);
    ctx.fillRect(A4_WIDTH - 140 - colCardW, cardY, colCardW, cardH);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(char.text, A4_WIDTH - 170, cardY + 58);

    // Connector dot (Left of Right Card)
    ctx.beginPath();
    ctx.arc(A4_WIDTH - 140 - colCardW, cardY + cardH / 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#7e22ce';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Left Card (Action)
    const action = leftActions[idx];
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(140, cardY, colCardW, cardH);
    ctx.fillRect(140, cardY, colCardW, cardH);

    ctx.fillStyle = '#334155';
    ctx.font = '26px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(action.text, 140 + colCardW - 25, cardY + 58);

    // Connector dot (Right of Left Card)
    ctx.beginPath();
    ctx.arc(140 + colCardW, cardY + cardH / 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#7e22ce';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Light dashed connector guide
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(140 + colCardW + 12, cardY + cardH / 2);
    ctx.lineTo(A4_WIDTH - 140 - colCardW - 12, cardY + cardH / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  ctx.restore();

  // ==========================================
  // PART B: Story Maze Adventure (Bottom)
  // ==========================================
  ctx.save();
  const mazeBoxY = 910;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.strokeRect(100, mazeBoxY, A4_WIDTH - 200, 1050);
  ctx.fillRect(100, mazeBoxY, A4_WIDTH - 200, 1050);

  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('🌀 النشاط الثاني: متاهة البطل (ساعد البطل للوصول إلى خط النهاية والكنز!)', A4_WIDTH / 2, mazeBoxY + 60);

  // Generate 15 cols x 11 rows maze
  const maze = generateMaze(15, 11);
  const cellW = 86;
  const cellH = 74;
  const mazeW = maze.cols * cellW;
  const mazeH = maze.rows * cellH;
  const mazeX = (A4_WIDTH - mazeW) / 2;
  const mazeY = mazeBoxY + 120;

  // Draw maze walls
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = '#1e293b';
  ctx.lineCap = 'square';

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const cell = maze.cells[r][c];
      const cx = mazeX + c * cellW;
      const cy = mazeY + r * cellH;

      if (cell.top) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + cellW, cy);
        ctx.stroke();
      }
      if (cell.right) {
        ctx.beginPath();
        ctx.moveTo(cx + cellW, cy);
        ctx.lineTo(cx + cellW, cy + cellH);
        ctx.stroke();
      }
      if (cell.bottom) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + cellH);
        ctx.lineTo(cx + cellW, cy + cellH);
        ctx.stroke();
      }
      if (cell.left) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + cellH);
        ctx.stroke();
      }
    }
  }

  // Start Badge (Top Left Entrance)
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 30px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText('🚀 البداية', mazeX - 18, mazeY + cellH / 2 + 10);

  // Finish Badge (Bottom Right Exit)
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 30px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'left';
  ctx.direction = 'rtl';
  ctx.fillText('🏆 النهاية والكنز', mazeX + mazeW + 18, mazeY + mazeH - cellH / 2 + 10);

  // Maze Tips
  ctx.fillStyle = '#64748b';
  ctx.font = '24px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('نصيحة: استخدم قلم رصاص خفيف في البداية لتجربة المسارات وتجنب الممرات المغلقة! ✏️', A4_WIDTH / 2, mazeBoxY + 1000);

  ctx.restore();

  // Footer
  drawPageFooter(ctx, A4_WIDTH, A4_HEIGHT, 6, 7, lang);

  return canvas;
}

/**
 * PAGE 7: Certificate of Achievement Page
 */
export function renderCertificatePage(story, childName = '', lang = 'ar') {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH;
  canvas.height = A4_HEIGHT;
  const ctx = canvas.getContext('2d');

  // Luxurious parchment background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

  // Double Grand Ornate Gold Border
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#1e1b4b'; // Deep navy
  ctx.strokeRect(50, 50, A4_WIDTH - 100, A4_HEIGHT - 100);

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f59e0b'; // Gold
  ctx.strokeRect(70, 70, A4_WIDTH - 140, A4_HEIGHT - 140);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(82, 82, A4_WIDTH - 164, A4_HEIGHT - 164);

  // Corner Stars & Rosettes
  const corners = [
    [50, 50],
    [A4_WIDTH - 50, 50],
    [50, A4_HEIGHT - 50],
    [A4_WIDTH - 50, A4_HEIGHT - 50]
  ];
  for (const [cx, cy] of corners) {
    drawStar(ctx, cx, cy, 8, 26, 12, '#f59e0b');
  }
  ctx.restore();

  const storyTitle = (typeof story.name === 'object' && story.name
    ? (story.name[lang] || story.name.ar || story.name.en)
    : story.name) || story.title || 'قصة الأبطال';

  // 1. Top Organization Header
  ctx.save();
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('مِنَصَّةُ قِصَصْ الذَّكِيَّةِ للأَطْفَالِ ★ QISAS.AI', A4_WIDTH / 2, 160);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '26px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.fillText('مبادرة تطوير أدب الأطفال وسرد الحكايات التفاعلي', A4_WIDTH / 2, 210);
  ctx.restore();

  // 2. Certificate Grand Title
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 50px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('👑 شَهَادَةُ بَطَلِ القِرَاءَةِ الذَّكِيّ 👑', A4_WIDTH / 2, 330);

  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 32px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.fillText('CERTIFICATE OF SMART READING ACHIEVEMENT', A4_WIDTH / 2, 390);

  // Divider ribbon
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(350, 430);
  ctx.lineTo(A4_WIDTH - 350, 430);
  ctx.stroke();
  drawStar(ctx, A4_WIDTH / 2, 430, 5, 20, 8, '#f59e0b');
  ctx.restore();

  // 3. Presentation Statement
  ctx.save();
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('تُمنح هذه الشهادة بكل فخر واعتزاز إلى البطل / البطلة المبدعة:', A4_WIDTH / 2, 540);

  // 4. Prominent Recipient Name Line
  const nameY = 660;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(250, nameY + 20);
  ctx.lineTo(A4_WIDTH - 250, nameY + 20);
  ctx.stroke();
  ctx.setLineDash([]);

  if (childName) {
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 58px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.fillText(childName, A4_WIDTH / 2, nameY);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '36px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
    ctx.fillText('___________________ (اكتب اسم البطل هنا) ___________________', A4_WIDTH / 2, nameY);
  }
  ctx.restore();

  // 5. Commendation Description Body
  ctx.save();
  const descY = 800;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 34px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';

  const commendation = `تقديراً لإتمامه(ـا) قراءة قصة: « ${storyTitle} » بتمعن وإتقان، وإنجاز جميع صفحات التلوين وحل لعبة الكلمات الضائعة والمتاهة بذكاء وتفوق وتميز.`;
  wrapText(ctx, commendation, A4_WIDTH / 2, descY, A4_WIDTH - 360, 60, 'center');

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 32px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.fillText('✨ قارئ اليوم هو قائد الغد المبدع والمفكر الذكي ✨', A4_WIDTH / 2, descY + 230);
  ctx.restore();

  // 6. Gold Starburst Seal Badge
  ctx.save();
  const sealX = A4_WIDTH / 2;
  const sealY = 1290;
  const sealRadius = 120;

  // Starburst points
  ctx.fillStyle = '#f59e0b';
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12;
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealRadius + 14, angle, angle + Math.PI / 24);
    ctx.lineTo(sealX, sealY);
    ctx.fill();
  }

  // Inner circular medal
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#b45309';
  ctx.stroke();

  // Ribbon tails
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(sealX - 45, sealY + sealRadius - 10);
  ctx.lineTo(sealX - 75, sealY + sealRadius + 85);
  ctx.lineTo(sealX - 35, sealY + sealRadius + 65);
  ctx.lineTo(sealX - 10, sealY + sealRadius + 85);
  ctx.lineTo(sealX - 10, sealY + sealRadius - 10);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(sealX + 10, sealY + sealRadius - 10);
  ctx.lineTo(sealX + 10, sealY + sealRadius + 85);
  ctx.lineTo(sealX + 35, sealY + sealRadius + 65);
  ctx.lineTo(sealX + 75, sealY + sealRadius + 85);
  ctx.lineTo(sealX + 45, sealY + sealRadius - 10);
  ctx.fill();

  // Seal inner text
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 28px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('★ مـعـتـمـد ★', sealX, sealY - 45);

  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 34px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.fillText('وسام التميز', sealX, sealY);

  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 22px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.fillText('بطل القراءة الفائق', sealX, sealY + 40);
  ctx.fillText('QISAS 2026', sealX, sealY + 70);
  ctx.restore();

  // 7. Signature & Date Lines
  ctx.save();
  const sigY = 1750;
  const leftColX = 350;
  const rightColX = A4_WIDTH - 350;

  // Right: Parent / Teacher Signature
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(rightColX - 180, sigY);
  ctx.lineTo(rightColX + 180, sigY);
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 30px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText('توقيع المعلم / ولي الأمر', rightColX, sigY + 45);

  // Left: Date
  ctx.beginPath();
  ctx.moveTo(leftColX - 180, sigY);
  ctx.lineTo(leftColX + 180, sigY);
  ctx.stroke();

  ctx.fillText('تاريخ منح الشهادة', leftColX, sigY + 45);

  // Center bottom: Verification code and stamp
  ctx.fillStyle = '#94a3b8';
  ctx.font = '24px "Dubai", "Cairo", "Segoe UI", Tahoma, sans-serif';
  ctx.fillText('رقم الاعتماد الذكي: QISAS-CERT-2026-★  |  طُبع بواسطة منصة قصص للأطفال', A4_WIDTH / 2, A4_HEIGHT - 130);
  ctx.restore();

  return canvas;
}

/**
 * Preloads the platform Dubai font into document.fonts if running in browser
 */
async function preloadDubaiFont() {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      const dubaiReg = new FontFace('Dubai', 'url(/Fonts/Dubai-Regular.ttf)', { weight: '400' });
      const dubaiBold = new FontFace('Dubai', 'url(/Fonts/Dubai-Bold.ttf)', { weight: '700' });
      await Promise.all([
        dubaiReg.load().catch(() => {}),
        dubaiBold.load().catch(() => {})
      ]);
      document.fonts.add(dubaiReg);
      document.fonts.add(dubaiBold);
      await document.fonts.ready;
    } catch (e) {
      console.warn('Dubai font load attempt finished:', e);
    }
  }
}

/**
 * Main Booklet PDF Generator
 * Creates and downloads the complete 7-page A4 Activity Booklet PDF
 * 
 * @param {object} story - Story data object with title, slides, etc.
 * @param {object} options - Options including childName, lang, onProgress callback
 * @returns {Promise<jsPDF>} The generated jsPDF instance
 */
export async function generateActivityBookletPDF(story, options = {}) {
  const {
    childName = '',
    lang = 'ar',
    onProgress = () => {},
    download = true
  } = options;

  const totalPages = 7;
  await preloadDubaiFont();

  // Create A4 Portrait jsPDF (210 x 297 mm)
  const DocClass = jsPDF.jsPDF || jsPDF;
  const pdf = new DocClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageCanvases = [];

  // PAGE 1: Cover Page
  onProgress(1, totalPages, 'جاري إعداد صفحة الغلاف الفنية وتخصيص اسم البطل...');
  const p1Canvas = await renderPage1Cover(story, childName, lang);
  pageCanvases.push(p1Canvas);

  // PAGES 2-4: 3 Story Coloring Pages
  const slides = story.slides || [];
  for (let cIdx = 0; cIdx < 3; cIdx++) {
    const pageNum = cIdx + 2;
    const slide = slides[cIdx] || slides[cIdx % (slides.length || 1)] || {};
    onProgress(pageNum, totalPages, `جاري تحويل المشهد ${cIdx + 1} إلى رسم خطي وإعداد صفحة التلوين...`);
    const coloringCanvas = await renderColoringPage(slide, pageNum, totalPages, story, lang);
    pageCanvases.push(coloringCanvas);
  }

  // PAGE 5: Word Search Puzzle Page
  onProgress(5, totalPages, 'جاري توليد شبكة البحث عن الكلمات الضائعة (Word Search)...');
  const p5Canvas = renderWordSearchPage(story, lang);
  pageCanvases.push(p5Canvas);

  // PAGE 6: Story Maze & Matching Activity Page
  onProgress(6, totalPages, 'جاري بناء متاهة البطل الذكي ونشاط التوصيل...');
  const p6Canvas = renderMazeAndMatchingPage(story, lang);
  pageCanvases.push(p6Canvas);

  // PAGE 7: Certificate of Achievement Page
  onProgress(7, totalPages, 'جاري إصدار وتصميم شهادة بطل القراءة الذكي...');
  const p7Canvas = renderCertificatePage(story, childName, lang);
  pageCanvases.push(p7Canvas);

  // Add each rendered Canvas to jsPDF document (210 x 297 mm)
  for (let i = 0; i < pageCanvases.length; i++) {
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }
    const imgData = pageCanvases[i].toDataURL('image/jpeg', 0.94);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  if (download) {
    const rawTitle = (typeof story.name === 'object' && story.name
      ? (story.name[lang] || story.name.ar || story.name.en)
      : story.name) || story.title || 'story';
    const safeTitle = String(rawTitle)
      .replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    pdf.save(`كتيب_أنشطة_وتلوين_${safeTitle}.pdf`);
  }

  return pdf;
}
