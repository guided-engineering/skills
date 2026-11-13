// Copy the canonical OPS material into each Skill (or with --check, verify the
// copies). The contract is defined in the OpenPrompt-Specification repository;
// the Skills only carry what they need to work in a project that has neither
// that repository nor the other Skill. Nothing here is edited by hand.
//
//   node tools/sync-ops.mjs [--from <OpenPrompt-Specification checkout>]   copy and record
//   node tools/sync-ops.mjs --check                                        verify recorded hashes
//
// Each Skill gets `ops-source.json`: the source repository and commit, and for
// every copied file the hash of the source bytes and of the bytes written.
// Markdown copies differ from their source in one mechanical way: relative
// links, which would dangle inside a Skill folder, are rewritten to the same
// file at the recorded commit on GitHub.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY = 'https://github.com/guided-engineering/OpenPrompt-Specification';
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const lf = (text) => text.replace(/\r\n/g, '\n');

// skill -> { path inside the Skill : path in OpenPrompt-Specification }
export const PLAN = {
  'ops-author': {
    'scripts/ops-validate.mjs': 'dist/ops-validate.mjs',
    'scripts/ops-validate.licenses.txt': 'dist/ops-validate.licenses.txt',
    'references/ops-contract.md': '.guides/ops-contract.md',
    'references/conversion.md': '.guides/conversion.md',
    'assets/prompt.template.yaml': 'templates/template.prompt.yaml',
  },
  'ops-execute': {
    'scripts/ops-validate.mjs': 'dist/ops-validate.mjs',
    'scripts/ops-validate.licenses.txt': 'dist/ops-validate.licenses.txt',
    'references/ops-contract.md': '.guides/ops-contract.md',
    'assets/worklog-entry.template.md': 'templates/template.worklog.md',
  },
};

function rewriteLinks(markdown, sourcePath, commit) {
  return markdown.replace(/\]\((\.{1,2}\/[^)\s]+)\)/g, (whole, href) => {
    const [path, hash] = href.split('#');
    const target = posix.normalize(posix.join(posix.dirname(sourcePath), path));
    if (target.startsWith('..')) return whole;
    const kind = path.endsWith('/') ? 'tree' : 'blob';
    return `](${REPOSITORY}/${kind}/${commit}/${target}${hash ? `#${hash}` : ''})`;
  });
}

if (process.argv.includes('--check')) {
  const problems = [];
  for (const skill of Object.keys(PLAN)) {
    const file = join(root, 'skills', skill, 'ops-source.json');
    if (!existsSync(file)) {
      problems.push(`${skill}: ops-source.json is missing; run node tools/sync-ops.mjs`);
      continue;
    }
    const record = JSON.parse(readFileSync(file, 'utf8'));
    for (const [target, expected] of Object.entries(record.files)) {
      const path = join(root, 'skills', skill, target);
      if (!existsSync(path)) problems.push(`${skill}: ${target} is missing`);
      else if (sha256(lf(readFileSync(path, 'utf8'))) !== expected.sha256) problems.push(`${skill}: ${target} was changed after it was copied`);
    }
    for (const target of Object.keys(PLAN[skill])) if (!(target in record.files)) problems.push(`${skill}: ${target} is not recorded in ops-source.json`);
  }
  const [a, b] = Object.keys(PLAN).map((s) => join(root, 'skills', s, 'ops-source.json')).filter(existsSync).map((f) => JSON.parse(readFileSync(f, 'utf8')));
  if (a && b && a.commit !== b.commit) problems.push(`the Skills were synchronized from different commits (${a.commit.slice(0, 7)} and ${b.commit.slice(0, 7)})`);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`bundled OPS material matches its record (source commit ${a?.commit.slice(0, 7) ?? 'n/a'})`);
} else {
  const i = process.argv.indexOf('--from');
  const from = resolve(i === -1 ? join(root, '..', 'OpenPrompt-Specification') : process.argv[i + 1]);
  const git = (...args) => execFileSync('git', args, { cwd: from, encoding: 'utf8' }).trim();
  const commit = git('rev-parse', 'HEAD');
  const sources = [...new Set(Object.values(PLAN).flatMap((p) => Object.values(p)))];
  const dirty = git('status', '--porcelain', '--', ...sources);
  if (dirty) {
    console.error(`These sources have uncommitted changes in ${from}; commit them first so the recorded commit is true:\n${dirty}`);
    process.exit(1);
  }
  for (const [skill, plan] of Object.entries(PLAN)) {
    const files = {};
    for (const [target, source] of Object.entries(plan)) {
      const original = lf(readFileSync(join(from, source), 'utf8'));
      const written = target.endsWith('.md') ? rewriteLinks(original, source, commit) : original;
      const path = join(root, 'skills', skill, target);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, written);
      files[target] = { source, sourceSha256: sha256(original), sha256: sha256(written), transformed: written !== original ? 'relative links rewritten to the recorded commit' : null };
    }
    writeFileSync(join(root, 'skills', skill, 'ops-source.json'), `${JSON.stringify({ description: 'Provenance of the OPS material bundled in this Skill. Written by tools/sync-ops.mjs; do not edit.', repository: REPOSITORY, commit, files }, null, 2)}\n`);
    console.log(`${skill}: copied ${Object.keys(files).length} files from ${commit.slice(0, 7)}`);
  }
}
