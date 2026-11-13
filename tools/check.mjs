// Structural checks for every Skill under skills/. No dependencies.
// What the Agent Skills specification requires is marked [spec]; what this
// repository adds for portability and selective installation is marked [repo].
//
//   node tools/check.mjs            exit 1 and a list when something is wrong
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, 'skills');
const SPEC_KEYS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
const MAX_BODY_LINES = 300; // [repo] the specification recommends staying under 500

export function listFiles(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : [relative(base, full).split(sep).join('/')];
  }).sort();
}

/**
 * Front matter restricted to what every client parses the same way: `key: value`
 * on one line, and one level of nesting for `metadata`. Returns { data, body, errors }.
 */
export function parseSkill(text) {
  const errors = [];
  if (text.charCodeAt(0) === 0xfeff) errors.push('SKILL.md starts with a byte-order mark; save it without one');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text.replace(/^﻿/, ''));
  if (!m) return { data: {}, body: '', errors: [...errors, 'SKILL.md must begin with front matter between two --- lines [spec]'] };
  const data = {};
  let nested = null;
  for (const [i, raw] of m[1].split(/\r?\n/).entries()) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const top = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s+(.*))?$/.exec(raw);
    const sub = /^ {2}([A-Za-z][A-Za-z0-9_.-]*):\s+(.*)$/.exec(raw);
    const unquote = (v) => v.trim().replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1');
    if (top) {
      if (top[1] in data) errors.push(`front matter key \`${top[1]}\` appears twice`);
      if (top[2] === undefined || top[2] === '') {
        nested = top[1];
        data[nested] = {};
      } else {
        nested = null;
        if (/^[>|]/.test(top[2])) errors.push(`front matter line ${i + 1}: write \`${top[1]}\` on one line; block scalars are not read the same way by every client [repo]`);
        data[top[1]] = unquote(top[2]);
      }
    } else if (sub && nested) data[nested][sub[1]] = unquote(sub[2]);
    else errors.push(`front matter line ${i + 1} is not a plain \`key: value\` line [repo]: ${raw}`);
  }
  return { data, body: m[2], errors };
}

export function checkSkill(dir) {
  const name = dir.split(/[\\/]/).pop();
  const problems = [];
  const file = join(dir, 'SKILL.md');
  if (!existsSync(file)) return [`${name}: SKILL.md is missing [spec]`];
  const { data, body, errors } = parseSkill(readFileSync(file, 'utf8'));
  problems.push(...errors);

  // [spec] front matter
  for (const key of Object.keys(data)) if (!SPEC_KEYS.includes(key)) problems.push(`front matter key \`${key}\` is not defined by the Agent Skills specification; vendor keys stay out of the portable core [spec validator]`);
  if (typeof data.name !== 'string' || !data.name) problems.push('`name` is required [spec]');
  else {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.name)) problems.push('`name` may contain only lowercase letters, digits and single hyphens, and may not start or end with a hyphen [spec]');
    if (data.name.length > 64) problems.push('`name` is longer than 64 characters [spec]');
    if (data.name !== name) problems.push(`\`name\` (${data.name}) must equal the directory name (${name}) [spec]`);
  }
  if (typeof data.description !== 'string' || !data.description.trim()) problems.push('`description` is required [spec]');
  else if ([...data.description].length > 1024) problems.push(`\`description\` has ${[...data.description].length} characters; the limit is 1024 [spec]`);
  if (data.compatibility !== undefined && (typeof data.compatibility !== 'string' || [...data.compatibility].length > 500)) problems.push('`compatibility` must be a string of at most 500 characters [spec]');
  if (data.metadata !== undefined && (typeof data.metadata !== 'object' || Object.values(data.metadata).some((v) => typeof v !== 'string'))) problems.push('`metadata` must map string keys to string values [spec]');

  // [repo] size
  const lines = body.split(/\r?\n/).length;
  if (lines > MAX_BODY_LINES) problems.push(`SKILL.md body has ${lines} lines; keep it at or under ${MAX_BODY_LINES} and move detail into references/ [repo]`);

  // [repo] files and links
  const files = listFiles(dir);
  for (const f of files) {
    const full = join(dir, f);
    if (lstatSync(full).isSymbolicLink()) problems.push(`${f} is a symbolic link; a Skill must be self-contained [repo]`);
    if (f.split('/').pop() === 'metadata.json') problems.push(`${f}: files named metadata.json are not installed by the skills CLI [repo]`);
    if (!/\.(md|mjs|js|json|ya?ml|txt)$/.test(f)) continue;
    const text = readFileSync(full, 'utf8');
    if (!f.startsWith('scripts/ops-validate')) {
      const abs = /(^|[\s"'`(])([A-Za-z]:\\(?:Users|Workspace)\\|\/(?:Users|home)\/[a-z])/m.exec(text);
      if (abs) problems.push(`${f} contains a path from a development machine: ${abs[0].trim()} [repo]`);
      if (/(\.\.\/)+(ops-author|ops-execute)\//.test(text)) problems.push(`${f} refers to a sibling Skill; each Skill must work when installed alone [repo]`);
    }
    if (f.endsWith('.md')) {
      for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const href = m[1];
        if (/^([a-z][a-z0-9+.-]*:|#)/i.test(href)) continue;
        const target = posix.normalize(posix.join(posix.dirname(f), href.split('#')[0]));
        if (target.startsWith('..')) problems.push(`${f}: link ${href} leaves the Skill folder [repo]`);
        else if (!files.includes(target) && !existsSync(join(dir, target))) problems.push(`${f}: link ${href} does not resolve inside the Skill [spec: relative paths from the skill root]`);
      }
    }
  }
  // [repo] every file the instructions tell the agent to use exists
  for (const m of body.matchAll(/`((?:scripts|references|assets)\/[A-Za-z0-9._/-]+)`/g)) {
    if (!files.includes(m[1])) problems.push(`SKILL.md names \`${m[1]}\`, which does not exist in the Skill [repo]`);
  }
  // [repo] reference files are linked from SKILL.md directly (one level deep)
  for (const f of files.filter((x) => x.startsWith('references/'))) {
    if (!body.includes(f)) problems.push(`${f} is never mentioned in SKILL.md; say when to read it or remove it [spec: one level deep]`);
  }
  return problems.map((p) => `${name}: ${p}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const skills = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : [];
  const problems = skills.flatMap((s) => checkSkill(join(skillsDir, s)));
  if (skills.length === 0) problems.push('no Skill found under skills/');
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`${skills.length} Skill(s) pass the structural checks: ${skills.join(', ')}`);
}
