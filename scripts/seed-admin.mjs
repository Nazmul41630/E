import { webcrypto as crypto } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const remote = args.includes('--remote');
const passwordArg = args.find((a) => a.startsWith('--password='));
const username = (args.find((a) => a.startsWith('--user=')) || '--user=admin').split('=')[1];

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map((n) => alphabet[n % alphabet.length])
  .join('');

const password = passwordArg ? passwordArg.split('=').slice(1).join('=') : randomPassword;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iterations = 150000;

const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
  key,
  256,
);
const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
const hash = hex(bits);
const saltHex = hex(salt);

const sql = [
  `INSERT INTO admins (username, password_hash, salt, iterations) VALUES ('${username}', '${hash}', '${saltHex}', ${iterations}) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, salt = excluded.salt, iterations = excluded.iterations;`,
  `DELETE FROM sessions;`,
].join('\n');

mkdirSync(path.resolve('.wrangler'), { recursive: true });
const sqlFile = path.resolve('.wrangler', 'seed-admin.sql');
writeFileSync(sqlFile, sql, 'utf8');

const cmd = ['--yes', 'wrangler', 'd1', 'execute', 'cakehaus-db', remote ? '--remote' : '--local'];
if (!remote) cmd.push('--persist-to', '.wrangler/state');
cmd.push('--file', sqlFile);
execFileSync('npx', cmd, { stdio: 'inherit', shell: true });

console.log(`\nadmin user: ${username}`);
if (!passwordArg) console.log(`admin password (save it now): ${password}`);
