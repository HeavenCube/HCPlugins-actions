import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { compiledPaths, decrypt, encrypt, run } from './state.mjs';

test('authenticated round trip with every Gradle AES key length and fresh nonces', () => {
  const data = Buffer.from('private Gradle compiled script');
  for (const length of [16, 24, 32]) {
    const key = randomBytes(length).toString('base64');
    const first = encrypt(data, key, 'HeavenCube/Test');
    const second = encrypt(data, key, 'HeavenCube/Test');
    assert.deepEqual(decrypt(first, key, 'HeavenCube/Test'), data);
    assert.notDeepEqual(first, second);
    assert.equal(first.includes(data), false);
  }
});

test('reject tampering, wrong keys, different repository, malformed headers and truncation', () => {
  const key = randomBytes(16).toString('base64');
  const encrypted = encrypt(Buffer.from('private'), key, 'HeavenCube/Test');
  for (const offset of [0, 10, 27, 43, encrypted.length - 1]) {
    const corrupt = Buffer.from(encrypted);
    corrupt[offset] ^= 1;
    assert.throws(() => decrypt(corrupt, key, 'HeavenCube/Test'));
  }
  assert.throws(() => decrypt(encrypted, randomBytes(16).toString('base64'), 'HeavenCube/Test'));
  assert.throws(() => decrypt(encrypted, key, 'HeavenCube/Other'));
  assert.throws(() => decrypt(encrypted.subarray(0, 20), key, 'HeavenCube/Test'));
  assert.throws(() => encrypt(Buffer.alloc(1), 'not-base64', 'HeavenCube/Test'));
});

test('restore compiled scripts before reuse and exclude build outputs; failed authentication writes nothing', () => {
  const tempRoot = resolve(tmpdir());
  const root = mkdtempSync(join(tempRoot, 'hcplugins-cache-test-'));
  const home = join(root, 'gradle');
  const workspace = join(root, 'project');
  const temporary = join(root, 'tmp');
  const script = join(home, 'caches', '9.8.0', 'kotlin-dsl', 'scripts', 'fixture.class');
  const key = randomBytes(16).toString('base64');
  const env = { 'INPUT_ENCRYPTION-KEY': key, GITHUB_REPOSITORY: 'HeavenCube/Test', GITHUB_WORKSPACE: workspace, GRADLE_USER_HOME: home, RUNNER_TEMP: temporary };
  try {
    mkdirSync(dirname(script), { recursive: true });
    mkdirSync(temporary);
    const kinds = [
      ['9.8.0', 'groovy-dsl'], ['9.8.0', 'transforms'], ['9.8.0', 'generated-gradle-jars'],
      ['jars-9'], ['transforms-4'],
    ];
    for (const kind of kinds) {
      const path = join(home, 'caches', ...kind);
      mkdirSync(path, { recursive: true });
      writeFileSync(join(path, 'fixture'), 'private compiled state');
    }
    mkdirSync(join(home, 'caches', 'build-cache-1'));
    mkdirSync(join(home, 'caches', 'modules-2'));
    writeFileSync(script, 'private fixture');
    writeFileSync(join(home, 'caches', 'build-cache-1', 'output'), 'private Java output');
    assert.equal(compiledPaths(home).length, kinds.length + 1);
    run('restore', env); // A cold cache is normal.
    run('save', env);
    const payload = join(workspace, '.gradle', 'hcplugins-compiled-state.bin');
    assert.equal(readFileSync(payload).includes(Buffer.from('private fixture')), false);
    assert.equal(resolve(join(home, 'caches')).startsWith(root + (process.platform === 'win32' ? '\\' : '/')), true);
    rmSync(join(home, 'caches'), { recursive: true });
    run('restore', env);
    assert.equal(readFileSync(script, 'utf8'), 'private fixture');
    for (const kind of kinds) {
      assert.equal(readFileSync(join(home, 'caches', ...kind, 'fixture'), 'utf8'), 'private compiled state');
    }
    assert.equal(existsSync(join(home, 'caches', 'build-cache-1')), false);
    assert.equal(existsSync(join(home, 'caches', 'modules-2')), false);
    const corrupt = readFileSync(payload);
    corrupt[corrupt.length - 1] ^= 1;
    writeFileSync(payload, corrupt);
    rmSync(join(home, 'caches'), { recursive: true });
    assert.throws(() => run('restore', env));
    assert.equal(existsSync(script), false);
    assert.deepEqual(readdirSync(temporary), []);
  } finally {
    assert.equal(dirname(resolve(root)), tempRoot);
    rmSync(root, { recursive: true, force: true });
  }
});
