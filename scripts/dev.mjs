#!/usr/bin/env node
/**
 * Lance en parallèle l'API (Express + PostgreSQL) et le frontend Vite.
 * Usage : npm run dev
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const isWindows = process.platform === 'win32';
const bin = (name) =>
  resolve(root, 'node_modules', '.bin', isWindows ? `${name}.cmd` : name);

const apiBin = bin('tsx');
const viteBin = bin('vite');

for (const [label, path] of [
  ['tsx', apiBin],
  ['vite', viteBin]
]) {
  if (!existsSync(path)) {
    console.error(
      `[dev] Binaire « ${label} » introuvable (${path}). Lancez « npm install » d'abord.`
    );
    process.exit(1);
  }
}

const colors = {
  api: '\x1b[36m', // cyan
  web: '\x1b[35m', // magenta
  reset: '\x1b[0m'
};

function run(label, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  const prefix = `${colors[label]}[${label}]${colors.reset} `;

  const forward = (stream, target) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) target.write(`${prefix}${line}\n`);
      }
    });
    stream.on('end', () => {
      if (buffer.trim()) target.write(`${prefix}${buffer}\n`);
    });
  };

  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${prefix}processus terminé avec le code ${code}`);
      shutdown(code);
    }
  });

  return child;
}

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev] Démarrage de l\'API (port 3001) et du frontend (port 3000)…');

children.push(run('api', apiBin, ['watch', 'server/index.ts']));
children.push(run('web', viteBin, ['--port=3000', '--host=0.0.0.0']));
