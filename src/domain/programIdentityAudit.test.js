import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const SOURCE_ROOT = new URL('../', import.meta.url);
const TERMS = /Cincinnati|Bearcats?|Nippert|Enquirer|GOBEARCATS/i;
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.css']);

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (SOURCE_EXTENSIONS.has(extname(entry.name)) && !entry.name.endsWith('.test.js')) files.push(fullPath);
  }
  return files;
};

test('diagnostic: report remaining Cincinnati-specific runtime identity references', async (t) => {
  const rootPath = SOURCE_ROOT.pathname;
  const files = await walk(rootPath);
  const findings = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    content.split(/\r?\n/).forEach((line, index) => {
      if (TERMS.test(line)) findings.push(`${relative(rootPath, file)}:${index + 1}: ${line.trim().slice(0, 180)}`);
      TERMS.lastIndex = 0;
    });
  }

  t.diagnostic(`PROGRAM_IDENTITY_AUDIT_BEGIN\n${findings.join('\n')}\nPROGRAM_IDENTITY_AUDIT_END`);
});
