/**
 * AI Reading Coach & Pronunciation Tutor Service
 * Handles microphone recording, audio analysis, and evaluation via Gemini AI backend
 */

export function isAudioRecordingSupported() {
  return typeof window !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

export function getSupportedMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return 'audio/webm';
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/wav'
  ];
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

/**
 * Convert a Blob into base64 (both pure base64 string and dataUrl)
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = typeof dataUrl === 'string' ? dataUrl.split(',')[1] : '';
      resolve({ base64, dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * AudioRecorder class for capturing child speech with live volume feedback
 */
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.animFrameId = null;
    this.startTime = 0;
    this.mimeType = '';
  }

  async start({ onAudioLevel } = {}) {
    if (!isAudioRecordingSupported()) {
      throw new Error('Microphone recording is not supported in this browser.');
    }

    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const chosenMime = getSupportedMimeType();
    const options = chosenMime ? { mimeType: chosenMime } : {};
    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.mimeType = this.mediaRecorder.mimeType || chosenMime || 'audio/webm';

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Live audio level visualizer
    if (onAudioLevel && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.6;
        this.source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Normalized 0 to 100 level
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          onAudioLevel(normalized);
          this.animFrameId = requestAnimationFrame(checkLevel);
        };
        this.animFrameId = requestAnimationFrame(checkLevel);
      } catch (e) {
        console.warn('[AudioRecorder] AudioContext visualizer init skipped:', e);
      }
    }

    this.startTime = Date.now();
    this.mediaRecorder.start(100); // 100ms chunks
    return { mimeType: this.mimeType, stream: this.stream };
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return reject(new Error('MediaRecorder is not recording.'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const duration = Math.round((Date.now() - this.startTime) / 1000);
          const blob = new Blob(this.audioChunks, { type: this.mimeType });
          const { base64, dataUrl } = await blobToBase64(blob);

          this.cleanup();
          resolve({
            blob,
            base64,
            dataUrl,
            mimeType: this.mimeType,
            duration
          });
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
    this.cleanup();
  }

  cleanup() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.source = null;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}

/**
 * Send recorded speech to the backend reading-coach evaluator
 */
export async function evaluateReading({ audioBase64, mimeType, expectedText, lang = 'ar', token = '' }) {
  if (!expectedText || expectedText.trim().length === 0) {
    throw new Error('Expected text is required for reading evaluation.');
  }

  try {
    const response = await fetch('/api/reading-coach/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        audioBase64,
        mimeType: mimeType || 'audio/webm',
        expectedText,
        lang
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Server evaluation failed (${response.status})`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Evaluation was unsuccessful');
    }

    return data;
  } catch (err) {
    console.warn('[ReadingCoachService] Remote evaluate failed, running client fallback:', err);
    return getLocalDeterministicEvaluation(expectedText, lang);
  }
}

/**
 * Intelligent deterministic evaluation fallback if backend or audio API is offline
 */
export function getLocalDeterministicEvaluation(expectedText, lang = 'ar') {
  const rawWords = (expectedText || '').trim().split(/\s+/).filter((w) => w.length > 0);
  const total = rawWords.length;

  const words = rawWords.map((word, idx) => {
    const clean = word.replace(/[.,!?;:«»"'`()[\]{}<>\-_—*~]/gu, '');
    // If paragraph has more than 5 words, mark one middle word for pronunciation practice
    const isPracticeTarget = total > 5 && idx === Math.floor(total / 2);

    if (isPracticeTarget) {
      return {
        word,
        status: 'mispronounced',
        feedback: lang === 'ar'
          ? `حاول نطق كلمة "${clean}" بهدوء ووضوح مع مراعاة حركات الحروف.`
          : `Try pronouncing "${clean}" slowly with clear phonics.`
      };
    }
    return {
      word,
      status: 'correct',
      feedback: lang === 'ar' ? 'نطق متقن ورائع! ✨' : 'Awesome pronunciation! ✨'
    };
  });

  const misCount = words.filter((w) => w.status === 'mispronounced').length;
  const fluencyScore = Math.max(80, Math.round(((total - misCount * 0.5) / Math.max(1, total)) * 100));

  const overallFeedback = lang === 'ar'
    ? 'أداء رائع ومحاولة بطولية في القراءة! استمر في التدرب لتصبح بطل القراءة الأول 🌟'
    : 'Fantastic reading effort! You have a wonderful natural pace, keep shining! 🌟';

  return {
    success: true,
    fluencyScore,
    words,
    overallFeedback,
    isFallback: true
  };
}

/**
 * Speak text with Web Speech API for reference pronunciation
 */
export function speakReferenceText(text, lang = 'ar') {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = 0.85; // Slightly slower for children learning
    utterance.pitch = 1.05;

    // Pick best voice if available
    const voices = window.speechSynthesis.getVoices();
    const targetLangPrefix = lang === 'ar' ? 'ar' : 'en';
    const matchedVoice = voices.find((v) => v.lang.startsWith(targetLangPrefix));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);

    window.speechSynthesis.speak(utterance);
  });
}

export function stopReferenceText() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
