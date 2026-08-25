export const TARGET_SPEECH_DBFS = -20;
export const PEAK_CEILING_DBFS = -1.5;
export const SPEECH_GATE_DBFS = -45;
export const MAX_SECTION_BOOST_DB = 5;
export const MAX_SECTION_CUT_DB = -5;

const FULL_SCALE = 32768;
const DEFAULT_SAMPLE_RATE = 24000;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const dbToGain = (db) => 10 ** (Number(db || 0) / 20);
const gainToDb = (gain) => 20 * Math.log10(Math.max(Number(gain) || 0, 1e-9));

const toSamples = (pcmBuffer) => {
  const byteLength = Math.max(0, Number(pcmBuffer?.byteLength || pcmBuffer?.length || 0) - (Number(pcmBuffer?.byteLength || pcmBuffer?.length || 0) % 2));
  if (!byteLength) return new Int16Array();
  return new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, byteLength / 2);
};

const maxSample = (samples) => {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) peak = Math.max(peak, Math.abs(samples[index]));
  return peak;
};

export const measureActiveSpeechDbfs = (pcmBuffer, sampleRate = DEFAULT_SAMPLE_RATE) => {
  const samples = toSamples(pcmBuffer);
  if (!samples.length) return -Infinity;

  const frameSamples = Math.max(240, Math.round((Number(sampleRate) || DEFAULT_SAMPLE_RATE) * 0.05));
  let activeSquareSum = 0;
  let activeSampleCount = 0;

  for (let start = 0; start < samples.length; start += frameSamples) {
    const end = Math.min(samples.length, start + frameSamples);
    let squareSum = 0;
    for (let index = start; index < end; index += 1) squareSum += samples[index] * samples[index];
    const frameCount = end - start;
    if (!frameCount) continue;
    const rms = Math.sqrt(squareSum / frameCount);
    const frameDbfs = rms > 0 ? gainToDb(rms / FULL_SCALE) : -Infinity;
    if (frameDbfs >= SPEECH_GATE_DBFS) {
      activeSquareSum += squareSum;
      activeSampleCount += frameCount;
    }
  }

  if (!activeSampleCount) return -Infinity;
  const activeRms = Math.sqrt(activeSquareSum / activeSampleCount);
  return gainToDb(activeRms / FULL_SCALE);
};

export const levelPcmSection = (
  pcmBuffer,
  sampleRate = DEFAULT_SAMPLE_RATE,
  {
    targetDbfs = TARGET_SPEECH_DBFS,
    peakCeilingDbfs = PEAK_CEILING_DBFS,
    maxBoostDb = MAX_SECTION_BOOST_DB,
    maxCutDb = MAX_SECTION_CUT_DB,
  } = {},
) => {
  const samples = toSamples(pcmBuffer);
  if (!samples.length) return {
    pcmBuffer,
    beforeDbfs: -Infinity,
    afterDbfs: -Infinity,
    gainDb: 0,
    peakDbfs: -Infinity,
  };

  const beforeDbfs = measureActiveSpeechDbfs(pcmBuffer, sampleRate);
  if (!Number.isFinite(beforeDbfs)) return {
    pcmBuffer,
    beforeDbfs,
    afterDbfs: beforeDbfs,
    gainDb: 0,
    peakDbfs: -Infinity,
  };

  const desiredGainDb = clamp(targetDbfs - beforeDbfs, maxCutDb, maxBoostDb);
  const peak = maxSample(samples);
  const ceilingSample = FULL_SCALE * dbToGain(peakCeilingDbfs);
  const peakSafeGainDb = peak > 0 ? gainToDb(ceilingSample / peak) : maxBoostDb;
  const gainDb = Math.min(desiredGainDb, peakSafeGainDb);
  const gain = dbToGain(gainDb);

  const output = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index += 1) {
    const leveled = clamp(Math.round(samples[index] * gain), -32768, 32767);
    output.writeInt16LE(leveled, index * 2);
  }

  const outputSamples = toSamples(output);
  const outputPeak = maxSample(outputSamples);
  return {
    pcmBuffer: output,
    beforeDbfs,
    afterDbfs: measureActiveSpeechDbfs(output, sampleRate),
    gainDb,
    peakDbfs: outputPeak > 0 ? gainToDb(outputPeak / FULL_SCALE) : -Infinity,
  };
};

export const limitPcmEpisode = (pcmBuffer, peakCeilingDbfs = PEAK_CEILING_DBFS) => {
  const samples = toSamples(pcmBuffer);
  if (!samples.length) return { pcmBuffer, gainDb: 0, peakDbfs: -Infinity };

  const peak = maxSample(samples);
  const ceilingSample = FULL_SCALE * dbToGain(peakCeilingDbfs);
  if (!peak || peak <= ceilingSample) {
    return {
      pcmBuffer,
      gainDb: 0,
      peakDbfs: peak > 0 ? gainToDb(peak / FULL_SCALE) : -Infinity,
    };
  }

  const gain = ceilingSample / peak;
  const output = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index += 1) {
    output.writeInt16LE(clamp(Math.round(samples[index] * gain), -32768, 32767), index * 2);
  }
  return {
    pcmBuffer: output,
    gainDb: gainToDb(gain),
    peakDbfs: peakCeilingDbfs,
  };
};
