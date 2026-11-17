/**
 * Qisas Ambient Audio & Atmospheric Soundscapes Engine
 * 100% Offline Procedural Audio Synthesis via HTML5 Web Audio API
 * Zero external bandwidth, zero latency, infinitely varied, child-friendly atmospheres.
 */

// Preset Soundscape Metadata
export const SOUNDSCAPES = [
  {
    id: 'desert_wind',
    name: { ar: 'رياح الصحراء الدافئة', en: 'Warm Desert Wind' },
    description: {
      ar: 'نسيم دافئ وهفيف رمال الصحراء الذهبية الساحرة',
      en: 'Warm breeze and shifting golden sand whispers'
    },
    icon: 'Sun',
    emoji: '🏜️',
    gradient: 'from-amber-500 via-amber-600 to-yellow-600',
    tags: ['desert', 'heritage', 'adventure', 'history']
  },
  {
    id: 'magical_forest',
    name: { ar: 'الغابة السحرية', en: 'Magical Forest' },
    description: {
      ar: 'تغريد عصافير عذب، حفيف أوراق الشجر وجدول ماء رقراق',
      en: 'Gentle birdsong, rustling leaves, and a distant brook'
    },
    icon: 'Trees',
    emoji: '🌲',
    gradient: 'from-emerald-500 via-teal-600 to-green-700',
    tags: ['nature', 'forest', 'animals', 'fantasy', 'magic']
  },
  {
    id: 'peaceful_night',
    name: { ar: 'هدوء الليل', en: 'Peaceful Night' },
    description: {
      ar: 'صرار الليل الوديع مع تهويدة مسائية ناعمة لنوم هانئ',
      en: 'Gentle crickets and a soft evening lullaby tone'
    },
    icon: 'Moon',
    emoji: '🌙',
    gradient: 'from-indigo-600 via-purple-700 to-slate-900',
    tags: ['bedtime', 'night', 'sleep', 'calm', 'dreams']
  },
  {
    id: 'ocean_breeze',
    name: { ar: 'نسيم المحيط', en: 'Ocean Breeze' },
    description: {
      ar: 'أمواج البحر الهادئة تلامس الشاطئ مع نسيم بحري عليل',
      en: 'Gentle waves washing ashore with distant sea breeze'
    },
    icon: 'Compass',
    emoji: '🌊',
    gradient: 'from-cyan-500 via-blue-600 to-teal-700',
    tags: ['ocean', 'sea', 'water', 'journey', 'island']
  },
  {
    id: 'adventure_quest',
    name: { ar: 'رحلة المغامرة', en: 'Adventure Quest' },
    description: {
      ar: 'أوتار خفيفة وموسيقى استكشاف مبهجة لخطوات الأبطال الصغار',
      en: 'Gentle whimsical acoustic strings & cheerful exploration tone'
    },
    icon: 'Sparkles',
    emoji: '⚔️',
    gradient: 'from-amber-600 via-orange-600 to-rose-600',
    tags: ['adventure', 'quest', 'heroes', 'action', 'sci-fi']
  },
  {
    id: 'cozy_rain',
    name: { ar: 'مطر دافئ', en: 'Cozy Rain' },
    description: {
      ar: 'طرقات حبات المطر الهادئة على النافذة مع دفء الغرفة',
      en: 'Soft pitter-patter of raindrops and gentle indoor warmth'
    },
    icon: 'CloudRain',
    emoji: '🌧️',
    gradient: 'from-blue-600 via-slate-600 to-indigo-800',
    tags: ['rain', 'comfort', 'peace', 'fables', 'family']
  }
];

export const SOUNDSCAPE_MAP = Object.fromEntries(SOUNDSCAPES.map(s => [s.id, s]));

/**
 * Intelligent Soundscape Matcher based on story category / title
 */
export function suggestSoundscapeForCategory(categoryName = '') {
  const norm = String(categoryName || '').toLowerCase();

  if (/(صحرا|رمال|تراث|desert|sand|heritage|oasis|dune)/i.test(norm)) return 'desert_wind';
  if (/(نوم|ليل|قمر|هلال|أحلام|bedtime|sleep|night|moon|lullaby|dream)/i.test(norm)) return 'peaceful_night';
  if (/(بحر|محيط|أمواج|سفين|جزا|جزير|شاطئ|سمك|sea|ocean|beach|marine|water|ship|wave)/i.test(norm)) return 'ocean_breeze';
  if (/(مطر|سحاب|شتا|دفء|بيت|غيث|rain|cloud|storm|weather|cozy|winter)/i.test(norm)) return 'cozy_rain';
  if (/(مغامر|استكشاف|فضاء|كوكب|أبطال|بطل|فرسان|فارس|شجاع|سيف|adventure|quest|explore|hero|knight|journey|space|rocket)/i.test(norm)) return 'adventure_quest';
  if (/(غاب|شجر|طبيع|حيوان|سحر|خيال|طيور|عصفور|nature|forest|tree|jungle|animal|magic|fairy|wand)/i.test(norm)) return 'magical_forest';

  // Default pleasant ambiance
  return 'magical_forest';
}

// -------------------------------------------------------------
// Procedural Audio Generators
// -------------------------------------------------------------

/**
 * Helper to generate pre-rendered looping Noise Buffers
 * Drastically reduces CPU overhead compared to ScriptProcessorNode
 */
function createNoiseBuffers(audioCtx) {
  const sampleRate = audioCtx.sampleRate || 44100;
  const lengthSec = 5;
  const frameCount = sampleRate * lengthSec;

  // 1. Pink Noise (Paul Kellet's filter method)
  const pinkBuffer = audioCtx.createBuffer(1, frameCount, sampleRate);
  const pinkData = pinkBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < frameCount; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  // 2. Brown Noise (Integrated white noise)
  const brownBuffer = audioCtx.createBuffer(1, frameCount, sampleRate);
  const brownData = brownBuffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < frameCount; i++) {
    const white = Math.random() * 2 - 1;
    brownData[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = brownData[i];
    brownData[i] *= 3.5; // Gain compensation
  }

  // 3. White Noise
  const whiteBuffer = audioCtx.createBuffer(1, frameCount, sampleRate);
  const whiteData = whiteBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    whiteData[i] = (Math.random() * 2 - 1) * 0.35;
  }

  return { pinkBuffer, brownBuffer, whiteBuffer };
}

function startLoopedNoise(audioCtx, buffer) {
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.start(0);
  return source;
}

// -------------------------------------------------------------
// Procedural Preset Generators
// -------------------------------------------------------------

/**
 * 1. Desert Wind: Warm breeze & shifting sand whisper
 */
function createDesertWind(audioCtx, destination, buffers) {
  const activeNodes = [];
  const activeTimers = [];

  // Layer 1: Warm breeze body (Brown noise through modulated lowpass filter)
  const breezeSource = startLoopedNoise(audioCtx, buffers.brownBuffer);
  const breezeFilter = audioCtx.createBiquadFilter();
  breezeFilter.type = 'lowpass';
  breezeFilter.frequency.value = 320;
  breezeFilter.Q.value = 2.0;

  const breezeGain = audioCtx.createGain();
  breezeGain.gain.value = 0.45;

  // LFO for breeze gusts
  const breezeLFO = audioCtx.createOscillator();
  breezeLFO.type = 'sine';
  breezeLFO.frequency.value = 0.12; // slow 8-second cycle

  const breezeLFOGain = audioCtx.createGain();
  breezeLFOGain.gain.value = 140; // modulate filter cutoff by +/- 140Hz

  breezeLFO.connect(breezeLFOGain);
  breezeLFOGain.connect(breezeFilter.frequency);
  breezeLFO.start();

  breezeSource.connect(breezeFilter);
  breezeFilter.connect(breezeGain);
  breezeGain.connect(destination);

  activeNodes.push(breezeSource, breezeFilter, breezeGain, breezeLFO, breezeLFOGain);

  // Layer 2: Shifting sand whisper (Pink noise through high bandpass)
  const sandSource = startLoopedNoise(audioCtx, buffers.pinkBuffer);
  const sandFilter = audioCtx.createBiquadFilter();
  sandFilter.type = 'bandpass';
  sandFilter.frequency.value = 2300;
  sandFilter.Q.value = 3.5;

  const sandGain = audioCtx.createGain();
  sandGain.gain.value = 0.08;

  // Modulate sand whispering
  const sandLFO = audioCtx.createOscillator();
  sandLFO.type = 'sine';
  sandLFO.frequency.value = 0.28;

  const sandLFOGain = audioCtx.createGain();
  sandLFOGain.gain.value = 0.05;

  sandLFO.connect(sandLFOGain);
  sandLFOGain.connect(sandGain.gain);
  sandLFO.start();

  sandSource.connect(sandFilter);
  sandFilter.connect(sandGain);
  sandGain.connect(destination);

  activeNodes.push(sandSource, sandFilter, sandGain, sandLFO, sandLFOGain);

  // Layer 3: Warm desert sun drone / mirage resonance (Soft warm low fundamental)
  const droneOsc = audioCtx.createOscillator();
  droneOsc.type = 'triangle';
  droneOsc.frequency.value = 65.41; // C2

  const droneFilter = audioCtx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 160;

  const droneGain = audioCtx.createGain();
  droneGain.gain.value = 0.035;

  droneOsc.connect(droneFilter);
  droneFilter.connect(droneGain);
  droneGain.connect(destination);
  droneOsc.start();

  activeNodes.push(droneOsc, droneFilter, droneGain);

  return {
    stop: () => {
      activeTimers.forEach(t => clearTimeout(t));
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          node.disconnect();
        } catch (_) {}
      });
    }
  };
}

/**
 * 2. Magical Forest: Gentle birdsong, rustling leaves, distant brook
 */
function createMagicalForest(audioCtx, destination, buffers) {
  const activeNodes = [];
  const activeTimers = [];

  // Layer 1: Rustling leaves (Pink noise through resonant bandpass)
  const leavesSource = startLoopedNoise(audioCtx, buffers.pinkBuffer);
  const leavesFilter = audioCtx.createBiquadFilter();
  leavesFilter.type = 'bandpass';
  leavesFilter.frequency.value = 1000;
  leavesFilter.Q.value = 1.6;

  const leavesGain = audioCtx.createGain();
  leavesGain.gain.value = 0.22;

  const leavesLFO = audioCtx.createOscillator();
  leavesLFO.type = 'sine';
  leavesLFO.frequency.value = 0.18;

  const leavesLFOGain = audioCtx.createGain();
  leavesLFOGain.gain.value = 350;

  leavesLFO.connect(leavesLFOGain);
  leavesLFOGain.connect(leavesFilter.frequency);
  leavesLFO.start();

  leavesSource.connect(leavesFilter);
  leavesFilter.connect(leavesGain);
  leavesGain.connect(destination);

  activeNodes.push(leavesSource, leavesFilter, leavesGain, leavesLFO, leavesLFOGain);

  // Layer 2: Distant babbling brook (dual modulated resonant bandpasses)
  const brookSource = startLoopedNoise(audioCtx, buffers.pinkBuffer);
  const brookFilterA = audioCtx.createBiquadFilter();
  brookFilterA.type = 'bandpass';
  brookFilterA.frequency.value = 520;
  brookFilterA.Q.value = 4.0;

  const brookFilterB = audioCtx.createBiquadFilter();
  brookFilterB.type = 'bandpass';
  brookFilterB.frequency.value = 1120;
  brookFilterB.Q.value = 4.5;

  const brookGain = audioCtx.createGain();
  brookGain.gain.value = 0.14;

  const brookLFO1 = audioCtx.createOscillator();
  brookLFO1.type = 'sine';
  brookLFO1.frequency.value = 1.3;

  const brookLFO2 = audioCtx.createOscillator();
  brookLFO2.type = 'sine';
  brookLFO2.frequency.value = 2.1;

  const brookLFOGain1 = audioCtx.createGain();
  brookLFOGain1.gain.value = 0.05;
  const brookLFOGain2 = audioCtx.createGain();
  brookLFOGain2.gain.value = 0.04;

  brookLFO1.connect(brookLFOGain1);
  brookLFOGain1.connect(brookGain.gain);
  brookLFO2.connect(brookLFOGain2);
  brookLFOGain2.connect(brookGain.gain);

  brookLFO1.start();
  brookLFO2.start();

  brookSource.connect(brookFilterA);
  brookSource.connect(brookFilterB);
  brookFilterA.connect(brookGain);
  brookFilterB.connect(brookGain);
  brookGain.connect(destination);

  activeNodes.push(brookSource, brookFilterA, brookFilterB, brookGain, brookLFO1, brookLFO2, brookLFOGain1, brookLFOGain2);

  // Layer 3: Procedural Birdsong Generator
  let isRunning = true;
  function scheduleBirdChirp() {
    if (!isRunning) return;

    const now = audioCtx.currentTime;
    const baseFreq = 2600 + Math.random() * 1200; // 2600Hz - 3800Hz
    const chirpCount = 1 + Math.floor(Math.random() * 3);

    let chirpTime = now + 0.1;

    for (let c = 0; c < chirpCount; c++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';

      // Pitch glide (sweet melodic forest warble)
      const duration = 0.08 + Math.random() * 0.06;
      const targetFreq = baseFreq + (Math.random() > 0.5 ? 400 : -350);

      osc.frequency.setValueAtTime(baseFreq, chirpTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1000, targetFreq), chirpTime + duration * 0.6);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, chirpTime + duration);

      // Volume envelope
      gain.gain.setValueAtTime(0.0001, chirpTime);
      gain.gain.exponentialRampToValueAtTime(0.06 + Math.random() * 0.03, chirpTime + duration * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, chirpTime + duration);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(chirpTime);
      osc.stop(chirpTime + duration + 0.02);

      chirpTime += duration + 0.04 + Math.random() * 0.04;
    }

    // Schedule next chirp in 3.5 to 7.0 seconds
    const nextInterval = 3500 + Math.random() * 3500;
    const t = setTimeout(scheduleBirdChirp, nextInterval);
    activeTimers.push(t);
  }

  // Layer 4: Gentle Fairydust / Magical Bell Chimes
  const pentatonicNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
  function scheduleFairyChime() {
    if (!isRunning) return;

    const now = audioCtx.currentTime + 0.1;
    const note = pentatonicNotes[Math.floor(Math.random() * pentatonicNotes.length)];

    const osc = audioCtx.createOscillator();
    const overtone = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, now);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(note * 2.01, now);

    const decay = 1.8;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(destination);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + decay);
    overtone.stop(now + decay);

    const nextChime = 7000 + Math.random() * 6000;
    const t = setTimeout(scheduleFairyChime, nextChime);
    activeTimers.push(t);
  }

  scheduleBirdChirp();
  scheduleFairyChime();

  return {
    stop: () => {
      isRunning = false;
      activeTimers.forEach(t => clearTimeout(t));
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          node.disconnect();
        } catch (_) {}
      });
    }
  };
}

/**
 * 3. Peaceful Night: Crickets & soft evening lullaby tone
 */
function createPeacefulNight(audioCtx, destination, buffers) {
  const activeNodes = [];
  const activeTimers = [];

  // Layer 1: Evening Crickets Stridulation
  // Carrier oscillator at ~4600Hz AM-modulated at 22Hz
  const cricketCarrier1 = audioCtx.createOscillator();
  cricketCarrier1.type = 'sine';
  cricketCarrier1.frequency.value = 4650;

  const cricketCarrier2 = audioCtx.createOscillator();
  cricketCarrier2.type = 'sine';
  cricketCarrier2.frequency.value = 4820;

  const cricketAM = audioCtx.createOscillator();
  cricketAM.type = 'triangle';
  cricketAM.frequency.value = 22; // 22 stridulations per second

  const amGain = audioCtx.createGain();
  amGain.gain.value = 0.5;

  const amOffset = audioCtx.createConstantSource ? audioCtx.createConstantSource() : null;
  if (amOffset) {
    amOffset.offset.value = 0.5;
    amOffset.start();
    activeNodes.push(amOffset);
  }

  const cricketMasterGain = audioCtx.createGain();
  cricketMasterGain.gain.value = 0.04;

  cricketCarrier1.connect(cricketMasterGain);
  cricketCarrier2.connect(cricketMasterGain);
  cricketMasterGain.connect(destination);

  cricketCarrier1.start();
  cricketCarrier2.start();
  cricketAM.start();

  activeNodes.push(cricketCarrier1, cricketCarrier2, cricketAM, amGain, cricketMasterGain);

  // Rhythmic chirp cadence (chirp... chirp... pause)
  let isRunning = true;
  function modulateCricketPhrases() {
    if (!isRunning) return;
    const now = audioCtx.currentTime;
    const burstDuration = 1.2 + Math.random() * 0.8;
    const pauseDuration = 0.8 + Math.random() * 1.4;

    cricketMasterGain.gain.setValueAtTime(0.005, now);
    cricketMasterGain.gain.linearRampToValueAtTime(0.045, now + 0.3);
    cricketMasterGain.gain.setValueAtTime(0.045, now + burstDuration - 0.2);
    cricketMasterGain.gain.linearRampToValueAtTime(0.005, now + burstDuration);

    const totalCycle = (burstDuration + pauseDuration) * 1000;
    const t = setTimeout(modulateCricketPhrases, totalCycle);
    activeTimers.push(t);
  }
  modulateCricketPhrases();

  // Layer 2: Soft Polyphonic Evening Lullaby Pad (C - E - G - B peaceful chord)
  const padFrequencies = [130.81, 164.81, 196.00, 246.94]; // C3, E3, G3, B3
  const padFilter = audioCtx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 360;

  const padGain = audioCtx.createGain();
  padGain.gain.value = 0.055;

  // Breathing LFO on lullaby pad
  const padLFO = audioCtx.createOscillator();
  padLFO.type = 'sine';
  padLFO.frequency.value = 0.07; // ~14 second comforting breath cycle

  const padLFOGain = audioCtx.createGain();
  padLFOGain.gain.value = 0.025;

  padLFO.connect(padLFOGain);
  padLFOGain.connect(padGain.gain);
  padLFO.start();

  padFilter.connect(padGain);
  padGain.connect(destination);

  activeNodes.push(padFilter, padGain, padLFO, padLFOGain);

  padFrequencies.forEach(freq => {
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(padFilter);
    osc.start();
    activeNodes.push(osc);
  });

  // Layer 3: Warm quiet night room breeze
  const nightBreeze = startLoopedNoise(audioCtx, buffers.brownBuffer);
  const nightBreezeFilter = audioCtx.createBiquadFilter();
  nightBreezeFilter.type = 'lowpass';
  nightBreezeFilter.frequency.value = 140;

  const nightBreezeGain = audioCtx.createGain();
  nightBreezeGain.gain.value = 0.09;

  nightBreeze.connect(nightBreezeFilter);
  nightBreezeFilter.connect(nightBreezeGain);
  nightBreezeGain.connect(destination);

  activeNodes.push(nightBreeze, nightBreezeFilter, nightBreezeGain);

  return {
    stop: () => {
      isRunning = false;
      activeTimers.forEach(t => clearTimeout(t));
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          node.disconnect();
        } catch (_) {}
      });
    }
  };
}

/**
 * 4. Ocean Breeze: Gentle waves washing ashore & sea breeze
 */
function createOceanBreeze(audioCtx, destination, buffers) {
  const activeNodes = [];
  const activeTimers = [];

  // Wave sound body: combination of pink and brown noise
  const surfSource = startLoopedNoise(audioCtx, buffers.pinkBuffer);
  const deepSurfSource = startLoopedNoise(audioCtx, buffers.brownBuffer);

  const surfFilter = audioCtx.createBiquadFilter();
  surfFilter.type = 'lowpass';
  surfFilter.frequency.value = 240;
  surfFilter.Q.value = 1.8;

  const surfGain = audioCtx.createGain();
  surfGain.gain.value = 0.05;

  surfSource.connect(surfFilter);
  deepSurfSource.connect(surfFilter);
  surfFilter.connect(surfGain);
  surfGain.connect(destination);

  activeNodes.push(surfSource, deepSurfSource, surfFilter, surfGain);

  // Sea spray shimmer layer
  const spraySource = startLoopedNoise(audioCtx, buffers.whiteBuffer);
  const sprayFilter = audioCtx.createBiquadFilter();
  sprayFilter.type = 'bandpass';
  sprayFilter.frequency.value = 1600;
  sprayFilter.Q.value = 2.0;

  const sprayGain = audioCtx.createGain();
  sprayGain.gain.value = 0.0001;

  spraySource.connect(sprayFilter);
  sprayFilter.connect(sprayGain);
  sprayGain.connect(destination);

  activeNodes.push(spraySource, sprayFilter, sprayGain);

  // Procedural 9-second rhythmic wave cycle scheduler
  let isRunning = true;
  function runWaveCycle() {
    if (!isRunning) return;
    const now = audioCtx.currentTime;
    const swellTime = 3.8;
    const crestTime = 0.7;
    const recedeTime = 4.5;
    const totalCycle = swellTime + crestTime + recedeTime;

    // 1. Swell: Volume rises and filter opens up
    surfGain.gain.setValueAtTime(0.04, now);
    surfGain.gain.exponentialRampToValueAtTime(0.38, now + swellTime);
    surfFilter.frequency.setValueAtTime(220, now);
    surfFilter.frequency.exponentialRampToValueAtTime(880, now + swellTime);

    // 2. Crest & Foam spray
    sprayGain.gain.setValueAtTime(0.001, now + swellTime - 0.4);
    sprayGain.gain.linearRampToValueAtTime(0.05, now + swellTime);
    sprayGain.gain.exponentialRampToValueAtTime(0.0001, now + swellTime + crestTime + 1.2);

    // 3. Recession: Gentle backwash undertow
    surfGain.gain.setValueAtTime(0.38, now + swellTime + crestTime);
    surfGain.gain.exponentialRampToValueAtTime(0.04, now + totalCycle);
    surfFilter.frequency.setValueAtTime(880, now + swellTime + crestTime);
    surfFilter.frequency.exponentialRampToValueAtTime(200, now + totalCycle);

    const t = setTimeout(runWaveCycle, totalCycle * 1000);
    activeTimers.push(t);
  }
  runWaveCycle();

  // Distant steady sea breeze
  const breezeSource = startLoopedNoise(audioCtx, buffers.pinkBuffer);
  const breezeFilter = audioCtx.createBiquadFilter();
  breezeFilter.type = 'bandpass';
  breezeFilter.frequency.value = 1800;
  breezeFilter.Q.value = 0.9;

  const breezeGain = audioCtx.createGain();
  breezeGain.gain.value = 0.07;

  breezeSource.connect(breezeFilter);
  breezeFilter.connect(breezeGain);
  breezeGain.connect(destination);

  activeNodes.push(breezeSource, breezeFilter, breezeGain);

  return {
    stop: () => {
      isRunning = false;
      activeTimers.forEach(t => clearTimeout(t));
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          node.disconnect();
        } catch (_) {}
      });
    }
  };
}

/**
 * 5. Adventure Quest: Gentle whimsical acoustic strings & cheerful exploration tone
 */
function createAdventureQuest(audioCtx, destination, buffers) {
  const activeNodes = [];
  const activeTimers = [];

  // Layer 1: Warm exploration meadow pad (Major fifths)
  const padFilter = audioCtx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 520;

  const padGain = audioCtx.createGain();
  padGain.gain.value = 0.055;

  padFilter.connect(padGain);
  padGain.connect(destination);
  activeNodes.push(padFilter, padGain);

  const padNotes = [196.00, 246.94, 293.66, 392.00]; // G3, B3, D4, G4
  padNotes.forEach(freq => {
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(padFilter);
    osc.start();
    activeNodes.push(osc);
  });

  // Layer 2: Whimsical Plucked Acoustic Strings / Kalimba Sequence
  // Inspiring, relaxing, curious storybook quest melody
  const melodyNotes = [
    392.00, // G4
    440.00, // A4
    493.88, // B4
    587.33, // D5
    659.25, // E5
    587.33, // D5
    493.88, // B4
    392.00, // G4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    493.88  // B4
  ];

  let isRunning = true;
  let stepIndex = 0;

  function triggerPluckNote(freq) {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // Damped harmonic triangle wave mimics an acoustic harp / acoustic guitar pluck
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + 0.6);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  function playNextMelodyStep() {
    if (!isRunning) return;

    const note = melodyNotes[stepIndex % melodyNotes.length];
    // Gentle syncopated timing
    triggerPluckNote(note);

    stepIndex++;
    // Relaxed tempo ~80 BPM (approx 550ms per step)
    const t = setTimeout(playNextMelodyStep, 550);
    activeTimers.push(t);
  }
  playNextMelodyStep();

  // Layer 3: Soft grass footsteps / explorer rustle
  const rustleSource = startLoopedNoise(audioCtx, buffers.pinkBuffer);
  const rustleFilter = audioCtx.createBiquadFilter();
  rustleFilter.type = 'bandpass';
  rustleFilter.frequency.value = 1600;
  rustleFilter.Q.value = 1.2;

  const rustleGain = audioCtx.createGain();
  rustleGain.gain.value = 0.06;

  rustleSource.connect(rustleFilter);
  rustleFilter.connect(rustleGain);
  rustleGain.connect(destination);

  activeNodes.push(rustleSource, rustleFilter, rustleGain);

  return {
    stop: () => {
      isRunning = false;
      activeTimers.forEach(t => clearTimeout(t));
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          node.disconnect();
        } catch (_) {}
      });
    }
  };
}

/**
 * 6. Cozy Rain: Soft pitter-patter of raindrops & gentle warmth
 */
function createCozyRain(audioCtx, destination, buffers) {
  const activeNodes = [];
  const activeTimers = [];

  // Layer 1: Continuous rain bed (dual filtered pink noise)
  const rainSource = startLoopedNoise(audioCtx, buffers.pinkBuffer);
  const rainLowpass = audioCtx.createBiquadFilter();
  rainLowpass.type = 'lowpass';
  rainLowpass.frequency.value = 1500;

  const rainBandpass = audioCtx.createBiquadFilter();
  rainBandpass.type = 'bandpass';
  rainBandpass.frequency.value = 2600;
  rainBandpass.Q.value = 1.2;

  const rainGain = audioCtx.createGain();
  rainGain.gain.value = 0.28;

  rainSource.connect(rainLowpass);
  rainLowpass.connect(rainGain);
  rainSource.connect(rainBandpass);
  rainBandpass.connect(rainGain);
  rainGain.connect(destination);

  activeNodes.push(rainSource, rainLowpass, rainBandpass, rainGain);

  // Layer 2: Procedural Micro-droplet pitter-patter generator
  // Stochastic synthesis of real raindrops tapping on window or roof
  let isRunning = true;
  function spawnDroplet() {
    if (!isRunning) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Random droplet resonant pitch (higher = glass, lower = leaves)
    const pitch = 950 + Math.random() * 1650;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.7, now + 0.025);

    // Fast exponential decay
    const duration = 0.015 + Math.random() * 0.018;
    const dropVol = 0.012 + Math.random() * 0.025;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(dropVol, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + duration + 0.005);

    // High density: 20-35 droplets per second
    const nextDelay = 30 + Math.random() * 50;
    const t = setTimeout(spawnDroplet, nextDelay);
    activeTimers.push(t);
  }

  // Launch dual droplet streams for stereo-like density
  spawnDroplet();
  const t2 = setTimeout(spawnDroplet, 25);
  activeTimers.push(t2);

  // Layer 3: Warm indoor fireplace / gentle distant rumble
  const warmBed = startLoopedNoise(audioCtx, buffers.brownBuffer);
  const warmFilter = audioCtx.createBiquadFilter();
  warmFilter.type = 'lowpass';
  warmFilter.frequency.value = 120;

  const warmGain = audioCtx.createGain();
  warmGain.gain.value = 0.12;

  warmBed.connect(warmFilter);
  warmFilter.connect(warmGain);
  warmGain.connect(destination);

  activeNodes.push(warmBed, warmFilter, warmGain);

  return {
    stop: () => {
      isRunning = false;
      activeTimers.forEach(t => clearTimeout(t));
      activeNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          node.disconnect();
        } catch (_) {}
      });
    }
  };
}

// -------------------------------------------------------------
// Soundscape Engine Singleton Class
// -------------------------------------------------------------

class SoundscapeEngine {
  constructor() {
    this.audioCtx = null;
    this.buffers = null;
    this.masterGain = null;
    this.duckingGain = null;
    this.activeTheme = null;
    this.activeInstance = null;
    this.listeners = new Set();

    // Default configuration (persisted in localStorage where available)
    this.volume = this.loadStoredVolume();
    this.isMuted = this.loadStoredMuted();
    this.isPlayingState = false;
    this.isDuckedState = false;

    // Attach global narration event listener if running in browser
    if (typeof window !== 'undefined') {
      window.addEventListener('qisas:narration-playing', (e) => {
        const isVoicePlaying = Boolean(e?.detail?.isPlaying);
        this.setDucked(isVoicePlaying);
      });
    }
  }

  loadStoredVolume() {
    try {
      const v = localStorage.getItem('qisas_ambient_volume');
      if (v !== null) return Math.min(Math.max(parseFloat(v), 0), 1);
    } catch (_) {}
    return 0.55; // 55% default pleasant level
  }

  loadStoredMuted() {
    try {
      return localStorage.getItem('qisas_ambient_muted') === 'true';
    } catch (_) {}
    return false;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      this.audioCtx = new AudioContextClass();

      // Master output gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;

      // Auto-ducking gain (1.0 = normal, 0.25 = ducked for narration)
      this.duckingGain = this.audioCtx.createGain();
      this.duckingGain.gain.value = this.isDuckedState ? 0.25 : 1.0;

      // Connect: Soundscape -> duckingGain -> masterGain -> destination
      this.duckingGain.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);

      // Precompute looped noise buffers once
      this.buffers = createNoiseBuffers(this.audioCtx);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return true;
  }

  /**
   * Play or change active soundscape theme
   */
  play(themeId = 'magical_forest') {
    if (!this.initAudio()) return;

    // If already playing this theme, do nothing
    if (this.isPlayingState && this.activeTheme === themeId) {
      return;
    }

    // Stop current instance cleanly
    if (this.activeInstance) {
      this.activeInstance.stop();
      this.activeInstance = null;
    }

    this.activeTheme = themeId;
    this.isPlayingState = true;

    // Route new soundscape into duckingGain
    const dest = this.duckingGain;
    const bufs = this.buffers;

    switch (themeId) {
      case 'desert_wind':
        this.activeInstance = createDesertWind(this.audioCtx, dest, bufs);
        break;
      case 'magical_forest':
        this.activeInstance = createMagicalForest(this.audioCtx, dest, bufs);
        break;
      case 'peaceful_night':
        this.activeInstance = createPeacefulNight(this.audioCtx, dest, bufs);
        break;
      case 'ocean_breeze':
        this.activeInstance = createOceanBreeze(this.audioCtx, dest, bufs);
        break;
      case 'adventure_quest':
        this.activeInstance = createAdventureQuest(this.audioCtx, dest, bufs);
        break;
      case 'cozy_rain':
        this.activeInstance = createCozyRain(this.audioCtx, dest, bufs);
        break;
      default:
        this.activeInstance = createMagicalForest(this.audioCtx, dest, bufs);
        break;
    }

    this.notify();
  }

  /**
   * Stop active soundscape
   */
  stop() {
    if (this.activeInstance) {
      this.activeInstance.stop();
      this.activeInstance = null;
    }
    this.isPlayingState = false;
    this.notify();
  }

  /**
   * Toggle Play/Stop
   */
  togglePlay(themeId) {
    if (this.isPlayingState) {
      this.stop();
    } else {
      this.play(themeId || this.activeTheme || 'magical_forest');
    }
  }

  /**
   * Master Volume (0.0 to 1.0)
   */
  setVolume(newVol) {
    const clamped = Math.min(Math.max(Number(newVol), 0), 1);
    this.volume = clamped;
    try {
      localStorage.setItem('qisas_ambient_volume', String(clamped));
    } catch (_) {}

    if (this.masterGain && this.audioCtx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.05);
    }
    this.notify();
  }

  getVolume() {
    return this.volume;
  }

  /**
   * Mute / Unmute
   */
  setMuted(muted) {
    this.isMuted = Boolean(muted);
    try {
      localStorage.setItem('qisas_ambient_muted', String(this.isMuted));
    } catch (_) {}

    if (this.masterGain && this.audioCtx) {
      const target = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.05);
    }
    this.notify();
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
  }

  /**
   * Auto-Ducking: Smoothly ducks volume to 25% when voice narration plays,
   * and smoothly restores to 100% when narration stops.
   */
  setDucked(ducked, transitionTime = 0.35) {
    this.isDuckedState = Boolean(ducked);

    if (this.duckingGain && this.audioCtx) {
      // 0.25 (25%) when ducked, 1.0 (100%) when normal
      const targetGain = this.isDuckedState ? 0.25 : 1.0;
      this.duckingGain.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, transitionTime);
    }

    this.notify();
  }

  isDucked() {
    return this.isDuckedState;
  }

  isPlaying() {
    return this.isPlayingState;
  }

  getCurrentTheme() {
    return this.activeTheme || 'magical_forest';
  }

  /**
   * Subscription listener for React components
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    const state = {
      isPlaying: this.isPlayingState,
      activeTheme: this.getCurrentTheme(),
      volume: this.volume,
      isMuted: this.isMuted,
      isDucked: this.isDuckedState
    };
    this.listeners.forEach(fn => {
      try {
        fn(state);
      } catch (_) {}
    });
  }
}

// Global Singleton Export
export const soundscapeManager = new SoundscapeEngine();
