import { run } from './state.mjs';
try {
  run('restore');
} catch {
  console.error('::error::Cannot restore encrypted Gradle scripts. Check the AES key and remove hcplugins-configuration-v2 caches after a key rotation.');
  process.exitCode = 1;
}
