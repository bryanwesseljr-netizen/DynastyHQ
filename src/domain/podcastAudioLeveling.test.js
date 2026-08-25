import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PEAK_CEILING_DBFS,
  TARGET_SPEECH_DBFS,
  levelPcmSection,
  limitPcmEpisode,
  measureActiveSpeechDbfs,
} from '../../api/_podcastAudioLeveling.js';

const pcmTone = ({ amplitude, sampleRate = 24000, seconds = 1 }) => {
  const sampleCount = Math.round(sampleRate * seconds);
  const buffer = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(amplitude * Math.sin((2 * Math.PI * 220 * index) / sampleRate));
    buffer.writeInt16LE(sample, index * 2);
  }
  return buffer;
};

const peakDbfs = (buffer) => {
  let peak = 0;
  for (let offset = 0; offset + 1 < buffer.length; offset += 2) peak = Math.max(peak, Math.abs(buffer.readInt16LE(offset)));
  return peak ? 20 * Math.log10(peak / 32768) : -Infinity;
};

test('levels quieter and louder render sections toward one speech target', () => {
  const quiet = pcmTone({ amplitude: 3000 });
  const loud = pcmTone({ amplitude: 7500 });

  const quietResult = levelPcmSection(quiet);
  const loudResult = levelPcmSection(loud);

  assert.ok(quietResult.gainDb > 0, `expected quiet section boost, received ${quietResult.gainDb}`);
  assert.ok(loudResult.gainDb < 0, `expected loud section cut, received ${loudResult.gainDb}`);
  assert.ok(Math.abs(measureActiveSpeechDbfs(quietResult.pcmBuffer) - TARGET_SPEECH_DBFS) < 0.75);
  assert.ok(Math.abs(measureActiveSpeechDbfs(loudResult.pcmBuffer) - TARGET_SPEECH_DBFS) < 0.75);
  assert.ok(Math.abs(quietResult.afterDbfs - loudResult.afterDbfs) < 0.5);
});

test('episode peak ceiling prevents section normalization from creating clipped spikes', () => {
  const steady = pcmTone({ amplitude: 6000 });
  const spiked = Buffer.from(steady);
  spiked.writeInt16LE(32767, Math.floor(spiked.length / 4) * 2);

  const leveled = levelPcmSection(spiked);
  const limited = limitPcmEpisode(leveled.pcmBuffer);

  assert.ok(peakDbfs(limited.pcmBuffer) <= PEAK_CEILING_DBFS + 0.05);
  assert.ok(limited.pcmBuffer.length === spiked.length);
});
