// Tests of this repository: the structural checker itself, the two Skills, the
// provenance of the bundled OPS material, and the bundled validator on valid
// and invalid input in a project that has nothing else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSkill, parseSkill } from '../tools/check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = ['ops-author', 'ops-execute'];
const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

function scratchSkill(name, skillMd, extra = {}) {
  const base = mkdtempSync(join(tmpdir(), 'ge-skill-'));
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), skillMd);
  for (const [f, text] of Object.entries(extra)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), text);
  }
  return { base, dir };
}
const good = (name = 'demo-skill') => `---\nname: ${name}\ndescription: Use this skill when a demo is needed. It shows the checker a valid Skill.\n---\n\n# Demo\n\nRead \`references/notes.md\` when you need the notes.\n`;

// ------------------------------------------------------------------ the checker
test('checker accepts a minimal valid Skill', () => {
  const { base, dir } = scratchSkill('demo-skill', good(), { 'references/notes.md': '# Notes\n' });
  try {
    assert.deepEqual(checkSkill(dir), []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

const invalid = {
  'a name that differs from its directory': [good('other-name'), {}, /must equal the directory name/],
  'an uppercase name': [good('Demo-Skill'), {}, /lowercase letters/],
  'a missing description': ['---\nname: demo-skill\n---\n\n# Demo\n', {}, /`description` is required/],
  'a description over 1024 characters': [`---\nname: demo-skill\ndescription: ${'x'.repeat(1025)}\n---\n\n# Demo\n`, {}, /limit is 1024/],
  'a vendor front matter key': ['---\nname: demo-skill\ndescription: Use this when needed.\ndisable-model-invocation: true\n---\n\n# Demo\n', {}, /not defined by the Agent Skills specification/],
  'no front matter': ['# Demo\n', {}, /must begin with front matter/],
  'a link that leaves the Skill': [`${good()}\nSee [the other Skill](../ops-execute/SKILL.md).\n`, { 'references/notes.md': '# Notes\n' }, /leaves the Skill folder/],
  'a link to a missing file': [`${good()}\nSee [missing](references/missing.md).\n`, { 'references/notes.md': '# Notes\n' }, /does not resolve inside the Skill/],
  'a named resource that does not exist': [`${good()}\nRun \`scripts/tool.mjs\`.\n`, { 'references/notes.md': '# Notes\n' }, /does not exist in the Skill/],
  'a reference file that SKILL.md never mentions': [good(), { 'references/notes.md': '# Notes\n', 'references/orphan.md': '# Orphan\n' }, /never mentioned in SKILL.md/],
  'a path from a development machine': [good(), { 'references/notes.md': 'Run it from C:\\Users\\someone\\project.\n' }, /path from a development machine/],
  'a file named metadata.json': [good(), { 'references/notes.md': '# Notes\n', 'metadata.json': '{}\n' }, /metadata\.json/],
  'a body that is too long': [`${good()}${'line\n'.repeat(320)}`, { 'references/notes.md': '# Notes\n' }, /keep it at or under/],
};
for (const [what, [skillMd, extra, expected]] of Object.entries(invalid)) {
  test(`checker rejects ${what}`, () => {
    const { base, dir } = scratchSkill('demo-skill', skillMd, extra);
    try {
      const problems = checkSkill(dir);
      assert.ok(problems.some((p) => expected.test(p)), `expected ${expected}, got:\n${problems.join('\n')}`);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
}

// ------------------------------------------------------------------ the Skills
for (const skill of SKILLS) {
  const dir = join(root, 'skills', skill);

  test(`${skill}: passes the structural checks`, () => {
    assert.deepEqual(checkSkill(dir), []);
  });

  test(`${skill}: description says what it does and when to use it`, () => {
    const { data } = parseSkill(readFileSync(join(dir, 'SKILL.md'), 'utf8'));
    assert.match(data.description, /\bUse (this skill )?when\b|\bUse this\b/i, 'the description must tell the agent when to use the Skill');
    assert.ok([...data.description].length >= 120, 'a description this short cannot state activation contexts and boundaries');
  });

  test(`${skill}: works alone, in a project that has nothing else`, () => {
    const project = mkdtempSync(join(tmpdir(), 'ge-project-'));
    try {
      // Only this Skill is installed; no sibling Skill, no source checkout, no node_modules.
      const installed = join(project, '.claude', 'skills', skill);
      cpSync(dir, installed, { recursive: true });
      mkdirSync(join(project, '.guides', 'prompts'), { recursive: true });
      cpSync(join(root, 'test', 'samples', 'prompt.valid.yaml'), join(project, '.guides', 'prompts', 'prompt.valid.yaml'));
      cpSync(join(root, 'test', 'samples', 'prompt.invalid.yaml'), join(project, '.guides', 'prompts', 'prompt.invalid.yaml'));
      const validator = join(installed, 'scripts', 'ops-validate.mjs');

      const help = node([validator, '--help'], project);
      assert.equal(help.status, 0, help.stderr);
      assert.match(help.stdout, /Usage:/);

      const ok = node([validator, '.guides/prompts/prompt.valid.yaml'], project);
      assert.equal(ok.status, 0, ok.stdout + ok.stderr);
      assert.match(ok.stdout, /valid \(prompt\)/);

      const bad = node([validator, '.guides/prompts/prompt.invalid.yaml'], project);
      assert.equal(bad.status, 1, bad.stdout + bad.stderr);
      assert.match(bad.stdout, /legacy-persona/);
      assert.match(bad.stdout, /verification-missing/);

      const missing = node([validator, '.guides/prompts/nope.yaml'], project);
      assert.equal(missing.status, 2);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
}

// ------------------------------------------------------------------ bundled example artifacts
function scratchProject() {
  const project = mkdtempSync(join(tmpdir(), 'ge-project-'));
  mkdirSync(join(project, '.guides', 'prompts'), { recursive: true });
  mkdirSync(join(project, '.guides', 'operation', 'worklog'), { recursive: true });
  return project;
}

test('ops-author: the bundled prompt template is a valid prompt once its declared input exists', () => {
  const project = scratchProject();
  try {
    const skill = join(root, 'skills', 'ops-author');
    mkdirSync(join(project, 'templates'));
    cpSync(join(skill, 'assets', 'prompt.template.yaml'), join(project, '.guides', 'prompts', 'prompt.example.starter-prompt.yaml'));
    const out = node([join(skill, 'scripts', 'ops-validate.mjs'), '.guides/prompts/prompt.example.starter-prompt.yaml'], project);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /valid \(prompt\)/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('ops-execute: the bundled worklog entry template is a valid entry, and a plan that claims execution is rejected', () => {
  const project = scratchProject();
  try {
    const skill = join(root, 'skills', 'ops-execute');
    const validator = join(skill, 'scripts', 'ops-validate.mjs');
    const template = readFileSync(join(skill, 'assets', 'worklog-entry.template.md'), 'utf8');
    writeFileSync(join(project, '.guides', 'operation', 'worklog', '2026-01-31.example-entry.md'), template);
    const ok = node([validator, '.guides/operation/worklog/2026-01-31.example-entry.md'], project);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /valid \(worklog\)/);

    // The same entry relabelled as a plan still reports a step as done: that is a claim of execution.
    assert.match(template, /^mode: execute$/m);
    writeFileSync(join(project, '.guides', 'operation', 'worklog', '2026-01-31.example-plan.md'),
      template.replace(/^mode: execute$/m, 'mode: plan').replace('entryId: 2026-01-31.example-entry', 'entryId: 2026-01-31.example-plan'));
    const bad = node([validator, '.guides/operation/worklog/2026-01-31.example-plan.md'], project);
    assert.equal(bad.status, 1, bad.stdout + bad.stderr);
    assert.match(bad.stdout, /plan-claims-execution/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('the two Skills carry the same validator', () => {
  const [a, b] = SKILLS.map((s) => readFileSync(join(root, 'skills', s, 'scripts', 'ops-validate.mjs'), 'utf8'));
  assert.equal(a, b);
});

test('bundled OPS material matches its recorded provenance', () => {
  const out = node([join(root, 'tools', 'sync-ops.mjs'), '--check'], root);
  assert.equal(out.status, 0, out.stdout + out.stderr);
});

test('no evaluation output lives inside an installable Skill folder', () => {
  for (const skill of SKILLS) {
    const out = node(['-e', `import('${pathForImport(join(root, 'tools', 'check.mjs'))}').then(m => console.log(JSON.stringify(m.listFiles(process.argv[1]))))`, join(root, 'skills', skill)], root);
    const files = JSON.parse(out.stdout);
    assert.ok(!files.some((f) => /(^|\/)(evals?|results|runs|workspace)\//.test(f)), `evaluation files inside skills/${skill}`);
  }
});

function pathForImport(p) {
  return `file:///${p.replace(/\\/g, '/')}`;
}
