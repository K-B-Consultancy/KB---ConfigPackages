import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SEMVER = /^\d+\.\d+\.\d+$/;

export function bump(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump type: ${type}`);
}

function writeVersion(path, version) {
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
}

// All packages are versioned in lockstep (see root README's Release section) — every
// bump touches the root package.json and every packages/*/package.json together.
export function setAllVersions(
  version,
  { packagesDir = 'packages', rootPkgPath = 'package.json' } = {}
) {
  writeVersion(rootPkgPath, version);
  for (const dir of readdirSync(packagesDir)) {
    const pkgPath = join(packagesDir, dir, 'package.json');
    if (existsSync(pkgPath)) {
      writeVersion(pkgPath, version);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (process.argv[2] ?? '').replace(/^v/, '');

  let nextVersion;
  if (SEMVER.test(arg)) {
    // release-drafter.yml passes its resolved_version output straight through here.
    nextVersion = arg;
  } else if (['major', 'minor', 'patch'].includes(arg)) {
    const rootPkg = JSON.parse(readFileSync('package.json', 'utf8'));
    nextVersion = bump(rootPkg.version, arg);
  } else {
    console.error('Usage: node scripts/bump-version.mjs <major|minor|patch|X.Y.Z>');
    process.exit(1);
  }

  setAllVersions(nextVersion);
  console.log(nextVersion);
}
