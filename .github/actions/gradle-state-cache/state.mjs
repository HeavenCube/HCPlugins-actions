import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const HEADER = Buffer.from('HCGRADLE1');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAX_BYTES = 512 * 1024 * 1024;

function derivedKey(encodedKey, salt, repository) {
  const normalized = encodedKey.trim();
  const key = Buffer.from(normalized, 'base64');
  if (![16, 24, 32].includes(key.length) || key.toString('base64') !== normalized) {
    throw new Error('Invalid Gradle AES key.');
  }
  return hkdfSync('sha256', key, salt, `HCPlugins compiled Gradle state v1:${repository}`, 32);
}

export function encrypt(archive, encodedKey, repository) {
  if (archive.length > MAX_BYTES) throw new Error('Compiled Gradle cache exceeds 512 MiB.');
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', derivedKey(encodedKey, salt, repository), iv);
  cipher.setAAD(HEADER);
  const ciphertext = Buffer.concat([cipher.update(archive), cipher.final()]);
  return Buffer.concat([HEADER, salt, iv, cipher.getAuthTag(), ciphertext]);
}

export function decrypt(payload, encodedKey, repository) {
  const offset = HEADER.length + SALT_BYTES + IV_BYTES + TAG_BYTES;
  if (payload.length < offset || payload.length > MAX_BYTES + offset || !payload.subarray(0, HEADER.length).equals(HEADER)) {
    throw new Error('Invalid encrypted Gradle cache.');
  }
  const salt = payload.subarray(HEADER.length, HEADER.length + SALT_BYTES);
  const iv = payload.subarray(HEADER.length + SALT_BYTES, HEADER.length + SALT_BYTES + IV_BYTES);
  const tag = payload.subarray(offset - TAG_BYTES, offset);
  const cipher = createDecipheriv('aes-256-gcm', derivedKey(encodedKey, salt, repository), iv);
  cipher.setAAD(HEADER);
  cipher.setAuthTag(tag);
  // Authenticate the entire payload before writing or extracting any plaintext.
  return Buffer.concat([cipher.update(payload.subarray(offset)), cipher.final()]);
}

export function compiledPaths(gradleHome) {
  const paths = [];
  const caches = join(gradleHome, 'caches');
  if (!existsSync(caches)) return paths;
  for (const entry of readdirSync(caches, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (/^(jars|transforms)-[\d]+$/.test(entry.name)) {
      paths.push(join('caches', entry.name));
    } else if (/^\d+\.\d+(?:\.[\d]+)?(?:-[\w.-]+)?$/.test(entry.name)) {
      for (const kind of ['kotlin-dsl', 'groovy-dsl', 'transforms', 'generated-gradle-jars']) {
        const path = join('caches', entry.name, kind);
        if (existsSync(join(gradleHome, path))) paths.push(path);
      }
    }
  }
  return paths.sort();
}

function tar(args) {
  const result = spawnSync('tar', args, { stdio: 'pipe' });
  if (result.error || result.status !== 0) throw new Error('Cannot archive or restore compiled Gradle state.');
}

export function run(mode, env = process.env) {
  const encodedKey = env['INPUT_ENCRYPTION-KEY'];
  const repository = env.GITHUB_REPOSITORY;
  const workspace = env.GITHUB_WORKSPACE;
  if (!encodedKey || !repository || !workspace) throw new Error('Missing encrypted Gradle cache configuration.');
  const gradleHome = env.GRADLE_USER_HOME || join(homedir(), '.gradle');
  const encrypted = join(workspace, '.gradle', 'hcplugins-compiled-state.bin');
  if (mode === 'restore' && !existsSync(encrypted)) return;
  const tempRoot = resolve(env.RUNNER_TEMP || tmpdir());
  const directory = mkdtempSync(join(tempRoot, 'hcplugins-gradle-state-'));
  const archive = join(directory, 'state.tar.gz');
  try {
    if (mode === 'restore') {
      if (statSync(encrypted).size > MAX_BYTES + 64) throw new Error('Encrypted Gradle cache exceeds 512 MiB.');
      writeFileSync(archive, decrypt(readFileSync(encrypted), encodedKey, repository), { mode: 0o600 });
      tar(['-xzf', archive, '-C', gradleHome]);
      console.log('Restored authenticated encrypted Gradle scripts and transforms.');
    } else if (mode === 'save') {
      const paths = compiledPaths(gradleHome);
      if (paths.length === 0) return;
      tar(['-czf', archive, '-C', gradleHome, ...paths]);
      if (statSync(archive).size > MAX_BYTES) throw new Error('Compiled Gradle cache exceeds 512 MiB.');
      mkdirSync(dirname(encrypted), { recursive: true });
      writeFileSync(encrypted, encrypt(readFileSync(archive), encodedKey, repository), { mode: 0o600 });
      console.log('Prepared authenticated encrypted Gradle scripts and transforms for caching.');
    } else {
      throw new Error('Unknown Gradle cache operation.');
    }
  } finally {
    if (dirname(resolve(directory)) !== tempRoot) throw new Error('Invalid Gradle cache temporary directory.');
    rmSync(directory, { recursive: true, force: true });
  }
}
