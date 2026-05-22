#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function append(filePath, content) {
  if (!filePath) return;
  fs.appendFileSync(filePath, content);
}

function setOutput(name, value) {
  append(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function warn(title, message) {
  const safeTitle = title.replace(/[\r\n]/g, ' ');
  const safeMessage = message.replace(/[\r\n]/g, ' ');
  console.warn(`[warning] ${safeTitle}: ${safeMessage}`);
  console.log(`::warning title=${safeTitle}::${safeMessage}`);
}

function summary(message) {
  append(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
}

function disable(reason, details) {
  setOutput('enabled', 'false');
  setOutput('key_path', '');
  setOutput('reason', reason);
  warn('Updater signing disabled', details);
  summary(`- Updater signing: disabled (${reason}).`);
  summary('- Release will continue with installer assets only; latest.json updater metadata is skipped.');
}

function enable(keyPath) {
  setOutput('enabled', 'true');
  setOutput('key_path', keyPath);
  setOutput('reason', 'ok');
  summary('- Updater signing: enabled.');
}

function normalizeKey(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: 'missing-secret' };
  }

  if (trimmed.startsWith('untrusted comment:')) {
    return {
      ok: true,
      normalized: Buffer.from(trimmed, 'utf8').toString('base64'),
    };
  }

  const compact = trimmed.replace(/\s+/g, '');
  const decoded = Buffer.from(compact, 'base64').toString('utf8');
  if (!decoded.startsWith('untrusted comment:')) {
    return { ok: false, reason: 'invalid-format' };
  }

  return { ok: true, normalized: compact };
}

function runSigner(keyPath, password, smokeFile) {
  fs.writeFileSync(smokeFile, 'tauri updater signing smoke test');
  const tauriCli = require.resolve('@tauri-apps/cli/tauri.js');

  const args = [
    tauriCli,
    'signer',
    'sign',
    '--private-key-path',
    keyPath,
    smokeFile,
  ];

  if (password) {
    args.splice(args.length - 1, 0, '--password', password);
  }

  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
    timeout: 30_000,
  });
}

function main() {
  const keyPath = path.resolve(process.argv[2] || path.join(process.env.RUNNER_TEMP || '.', 'tauri-updater-signing.key'));
  const smokeFile = path.resolve(process.argv[3] || path.join(process.env.RUNNER_TEMP || '.', 'tauri-updater-signing-smoke.txt'));
  const raw = process.env.TAURI_SIGNING_PRIVATE_KEY || '';
  const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || '';

  const normalized = normalizeKey(raw);
  if (!normalized.ok) {
    if (normalized.reason === 'missing-secret') {
      disable(
        normalized.reason,
        'TAURI_SIGNING_PRIVATE_KEY or legacy TAURI_PRIVATE_KEY is not configured.'
      );
      return;
    }

    disable(
      normalized.reason,
      'The configured updater signing key is neither generated base64 key content nor decoded text starting with "untrusted comment:".'
    );
    return;
  }

  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  fs.writeFileSync(keyPath, normalized.normalized);

  const result = runSigner(keyPath, password, smokeFile);
  if (result.error && result.error.code === 'ETIMEDOUT') {
    disable(
      'smoke-sign-timeout',
      'The updater signing smoke test timed out. If the key is encrypted, configure TAURI_SIGNING_PRIVATE_KEY_PASSWORD so the CLI does not wait for interactive password input.'
    );
    return;
  }

  if (result.error) {
    disable(
      'smoke-sign-spawn-failed',
      `The updater signing smoke test could not start the Tauri CLI: ${result.error.message}`
    );
    return;
  }

  if (result.status !== 0) {
    disable(
      'smoke-sign-failed',
      'The updater signing key is present but could not sign the smoke-test file. Check that the private key matches the configured public key and that the password secret is correct.'
    );
    return;
  }

  enable(keyPath);
}

try {
  main();
} catch (error) {
  disable('unexpected-error', error instanceof Error ? error.message : String(error));
}
