import { cp, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const gallery = join(root, 'previews/project-gallery');
const output = join(root, 'main/dist/projects');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this build through npm run build in main/.');

function runNpm(args) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: gallery, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

runNpm(['ci']);
runNpm(['test']);
runNpm(['run', 'build:site']);
await mkdir(output, { recursive: true });
await cp(join(gallery, 'dist'), output, { recursive: true, force: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
await writeFile(join(output, 'release.json'), JSON.stringify({ app: 'project-cosmos', commit, builtAt: new Date().toISOString() }) + '\n');
console.log('Project cosmos staged at main/dist/projects (' + commit + ').');
