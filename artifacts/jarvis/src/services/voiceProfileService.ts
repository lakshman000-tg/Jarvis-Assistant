/**
 * Local Voice Profile Service
 * Demo-level speaker verification using Web Audio API feature extraction.
 * Stores voice fingerprint in localStorage. NOT a secure biometric system.
 */

const PROFILE_KEY = 'jarvis_voice_profile';
const SETTINGS_KEY = 'jarvis_voice_settings';
const FFT_SIZE = 2048;
const SAMPLE_DURATION_MS = 3000;

export interface VoiceFeatures {
  rmsEnergy: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
  pitchEstimate: number;
  spectralFlux: number;
  mfccApprox: number[];
}

export interface VoiceProfile {
  features: VoiceFeatures;
  enrolledAt: number;
  sampleCount: number;
}

export interface VoiceSettings {
  ownerOnlyMode: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  wakeSound: boolean;
  autoStart: boolean;
  backgroundListening: boolean;
}

export interface VerificationResult {
  authorized: boolean;
  score: number;
  label: string;
}

const SENSITIVITY_THRESHOLD: Record<VoiceSettings['sensitivity'], number> = {
  low: 0.55,
  medium: 0.70,
  high: 0.82,
};

// ─── Feature extraction ───────────────────────────────────────────────────────

function extractFeatures(analyser: AnalyserNode, buffer: Float32Array): VoiceFeatures {
  const freqData = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(freqData);

  const timeData = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(timeData);

  // RMS energy
  const rms = Math.sqrt(timeData.reduce((s, v) => s + v * v, 0) / timeData.length);

  // Zero crossing rate
  let zc = 0;
  for (let i = 1; i < timeData.length; i++) {
    if ((timeData[i] >= 0) !== (timeData[i - 1] >= 0)) zc++;
  }
  const zcr = zc / timeData.length;

  // Convert dB freq to linear magnitude
  const linFreq = Array.from(freqData).map(db => Math.pow(10, db / 20));
  const totalEnergy = linFreq.reduce((s, v) => s + v, 0) || 1;

  // Spectral centroid (frequency-weighted mean)
  const sampleRate = analyser.context.sampleRate;
  const binHz = sampleRate / analyser.fftSize;
  let centroidNum = 0;
  linFreq.forEach((mag, i) => { centroidNum += mag * i * binHz; });
  const spectralCentroid = centroidNum / totalEnergy;

  // Spectral flux (variance across frequency bins)
  const mean = totalEnergy / linFreq.length;
  const spectralFlux = linFreq.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / linFreq.length;

  // Pitch estimate via autocorrelation on time domain
  const pitchEstimate = estimatePitch(timeData, sampleRate);

  // MFCC-approximation: divide spectrum into 12 mel-scale bands
  const mfccApprox = computeMelBands(linFreq, 12, sampleRate, analyser.frequencyBinCount);

  return { rmsEnergy: rms, spectralCentroid, zeroCrossingRate: zcr, pitchEstimate, spectralFlux, mfccApprox };
}

function estimatePitch(timeData: Float32Array, sampleRate: number): number {
  const size = timeData.length;
  const maxLag = Math.floor(sampleRate / 80);
  const minLag = Math.floor(sampleRate / 500);
  let maxCorr = -Infinity;
  let bestLag = minLag;
  for (let lag = minLag; lag < maxLag && lag < size / 2; lag++) {
    let corr = 0;
    for (let i = 0; i < size - lag; i++) corr += timeData[i] * timeData[i + lag];
    if (corr > maxCorr) { maxCorr = corr; bestLag = lag; }
  }
  return sampleRate / bestLag;
}

function computeMelBands(linFreq: number[], bands: number, sampleRate: number, binCount: number): number[] {
  const melMin = 2595 * Math.log10(1 + 80 / 700);
  const melMax = 2595 * Math.log10(1 + (sampleRate / 2) / 700);
  const melPoints = Array.from({ length: bands + 2 }, (_, i) => melMin + (i / (bands + 1)) * (melMax - melMin));
  const hzPoints = melPoints.map(m => 700 * (Math.pow(10, m / 2595) - 1));
  const binPoints = hzPoints.map(hz => Math.floor((hz / (sampleRate / 2)) * binCount));
  const result: number[] = [];
  for (let b = 1; b <= bands; b++) {
    let sum = 0;
    const start = binPoints[b - 1];
    const center = binPoints[b];
    const end = binPoints[b + 1];
    for (let i = start; i < center && i < linFreq.length; i++) sum += linFreq[i] * ((i - start) / (center - start + 1));
    for (let i = center; i < end && i < linFreq.length; i++) sum += linFreq[i] * ((end - i) / (end - center + 1));
    result.push(sum);
  }
  return result;
}

// ─── Similarity ───────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizedDiff(a: number, b: number): number {
  const maxVal = Math.max(Math.abs(a), Math.abs(b), 1);
  return 1 - Math.abs(a - b) / maxVal;
}

export function computeSimilarity(stored: VoiceFeatures, current: VoiceFeatures): number {
  const pitchSim = normalizedDiff(stored.pitchEstimate, current.pitchEstimate);
  const energySim = normalizedDiff(stored.rmsEnergy, current.rmsEnergy);
  const centroidSim = normalizedDiff(stored.spectralCentroid, current.spectralCentroid);
  const zcrSim = normalizedDiff(stored.zeroCrossingRate, current.zeroCrossingRate);
  const mfccSim = cosineSimilarity(stored.mfccApprox, current.mfccApprox);
  // Weighted average — pitch and MFCC are most discriminative
  return pitchSim * 0.25 + mfccSim * 0.35 + centroidSim * 0.20 + energySim * 0.10 + zcrSim * 0.10;
}

// ─── Audio recording helper ───────────────────────────────────────────────────

export async function recordAndExtract(durationMs = SAMPLE_DURATION_MS): Promise<VoiceFeatures> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  source.connect(analyser);

  await new Promise(r => setTimeout(r, durationMs));

  const features = extractFeatures(analyser, new Float32Array(analyser.fftSize));
  stream.getTracks().forEach(t => t.stop());
  await ctx.close();
  return features;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function saveProfile(profile: VoiceProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadProfile(): VoiceProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function deleteProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}

export function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return {
      ownerOnlyMode: false,
      sensitivity: 'medium',
      wakeSound: true,
      autoStart: false,
      backgroundListening: false,
      ...saved,
    };
  } catch {
    return { ownerOnlyMode: false, sensitivity: 'medium', wakeSound: true, autoStart: false, backgroundListening: false };
  }
}

export function saveSettings(s: VoiceSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

export async function enrollSample(existing: VoiceFeatures | null): Promise<VoiceProfile> {
  const features = await recordAndExtract(4000);
  const profile: VoiceProfile = {
    features,
    enrolledAt: Date.now(),
    sampleCount: existing ? 2 : 1,
  };
  if (existing) {
    // Average features for better robustness
    profile.features = {
      rmsEnergy: (existing.rmsEnergy + features.rmsEnergy) / 2,
      spectralCentroid: (existing.spectralCentroid + features.spectralCentroid) / 2,
      zeroCrossingRate: (existing.zeroCrossingRate + features.zeroCrossingRate) / 2,
      pitchEstimate: (existing.pitchEstimate + features.pitchEstimate) / 2,
      spectralFlux: (existing.spectralFlux + features.spectralFlux) / 2,
      mfccApprox: features.mfccApprox.map((v, i) => (v + (existing.mfccApprox[i] ?? v)) / 2),
    };
  }
  return profile;
}

// ─── Verification ─────────────────────────────────────────────────────────────

export async function verifyVoice(settings: VoiceSettings): Promise<VerificationResult> {
  const profile = loadProfile();
  if (!profile) return { authorized: true, score: 1, label: 'No profile registered' };

  const current = await recordAndExtract(3000);
  const score = computeSimilarity(profile.features, current);
  const threshold = SENSITIVITY_THRESHOLD[settings.sensitivity];
  const authorized = score >= threshold;
  const pct = Math.round(score * 100);

  return {
    authorized,
    score,
    label: authorized
      ? `Voice recognized (${pct}% match)`
      : `Unauthorized voice (${pct}% match — need ${Math.round(threshold * 100)}%)`,
  };
}
