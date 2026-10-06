import { run } from './state.mjs';
try {
  run('save');
} catch {
  console.error('::error::Cannot prepare encrypted Gradle scripts for caching. No plaintext compiled state will be uploaded.');
  process.exitCode = 1;
}
