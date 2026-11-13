// Install each Skill alone into a clean project with the `skills` CLI and check
// that it works there: the files equal the source, nothing else was installed,
// every resource SKILL.md names exists, and the bundled validator runs on a
// valid and an invalid prompt. With --client, also start the installed client
// once per project and read which Skills it lists.
//
//   node tools/verify-install.mjs [--source <path | owner/repo[#ref]>] [--client] [--out <file.json>]
//
// --source defaults to this checkout. The clean projects are created in the
// system temporary directory, outside every repository, and removed afterwards.
// The --client step starts one short session per Skill ("Reply with the single
// word OK."). It reads the client's own listing; it does not exercise a Skill.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSkill, listFiles } from './check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = ['ops-author', 'ops-execute'];
const CLI = 'skills@1.8.1';
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
};
const source = arg('source') ?? root;
const withClient = process.argv.includes('--client');
const outFile = arg('out');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
// A nested client session must not inherit this session's own client variables.
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|ANTHROPIC|MCP_)/i.test(k)));
const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const sh = (cmd, args, cwd, env) => spawnSync([cmd, ...args].map(quote).join(' '), { cwd, env, shell: true, encoding: 'utf8', timeout: 300000 });
const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

const results = [];
for (const skill of SKILLS) {
  const sibling = SKILLS.find((s) => s !== skill);
  const project = mkdtempSync(join(tmpdir(), 'ge-install-'));
  const r = { skill, source: source === root ? 'local checkout' : source, cli: CLI, problems: [] };
  try {
    spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: project });
    writeFileSync(join(project, 'README.md'), '# clean project\n');

    // 1. Install this Skill only.
    const args = ['--yes', CLI, 'add', source, '-a', 'claude-code', '-s', skill, '-y'];
    r.command = `npx ${args.map((a) => (a === source && source === root ? '<this checkout>' : a)).join(' ')}`;
    const add = sh('npx', args, project, { ...cleanEnv(), DISABLE_TELEMETRY: '1' });
    if (add.status !== 0) r.problems.push(`the skills CLI exited with ${add.status}: ${(add.stderr || add.stdout).trim().slice(-400)}`);

    // 2. What was installed, and where.
    const installed = join(project, '.claude', 'skills', skill);
    r.installedTo = `.claude/skills/${skill}`;
    if (!existsSync(join(installed, 'SKILL.md'))) {
      r.problems.push(`${r.installedTo}/SKILL.md does not exist after installation`);
    } else {
      const here = listFiles(join(root, 'skills', skill));
      const there = listFiles(installed);
      r.files = there.length;
      const differing = [...new Set([...here, ...there])].filter((f) => !here.includes(f) || !there.includes(f)
        || sha256(readFileSync(join(root, 'skills', skill, f))) !== sha256(readFileSync(join(installed, f))));
      r.identicalToThisCheckout = differing.length === 0;
      if (differing.length) r.problems.push(`installed files differ from skills/${skill} in this checkout: ${differing.join(', ')}`);
      const others = readdirSync(join(project, '.claude', 'skills')).filter((n) => n !== skill);
      r.otherSkillsInstalled = others;
      if (others.length) r.problems.push(`other Skills were installed: ${others.join(', ')}`);

      // 3. Every resource the instructions name exists in the installed folder.
      const structural = checkSkill(installed);
      r.structuralProblems = structural;
      r.problems.push(...structural);

      // 4. The bundled validator works in a project that has nothing else.
      mkdirSync(join(project, '.guides', 'prompts'), { recursive: true });
      for (const sample of ['prompt.valid.yaml', 'prompt.invalid.yaml']) cpSync(join(root, 'test', 'samples', sample), join(project, '.guides', 'prompts', sample));
      const validator = join(installed, 'scripts', 'ops-validate.mjs');
      const version = node([validator, '--version'], project);
      const ok = node([validator, '.guides/prompts/prompt.valid.yaml'], project);
      const bad = node([validator, '.guides/prompts/prompt.invalid.yaml'], project);
      r.validator = { versionExit: version.status, schemas: version.status === 0 ? JSON.parse(version.stdout).schemas : null, validSampleExit: ok.status, invalidSampleExit: bad.status };
      if (version.status !== 0 || ok.status !== 0 || bad.status !== 1) r.problems.push(`bundled validator: --version ${version.status}, valid sample ${ok.status} (expected 0), invalid sample ${bad.status} (expected 1)`);
    }

    // 5. The client's own listing.
    if (withClient) {
      const started = Date.now();
      const clientArgs = ['-p', '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project,local', '--strict-mcp-config', '--no-session-persistence'];
      const run = spawnSync('claude', clientArgs, { cwd: project, env: cleanEnv(), input: 'Reply with the single word OK.', encoding: 'utf8', timeout: 120000 });
      let init = null;
      for (const line of (run.stdout ?? '').split('\n')) {
        try {
          const e = JSON.parse(line);
          if (e.type === 'system' && e.subtype === 'init') init = e;
        } catch {
          // not a JSON line
        }
      }
      const listed = Array.isArray(init?.skills) ? init.skills : null;
      r.client = {
        command: `claude ${clientArgs.join(' ')}`,
        version: init?.claude_code_version ?? 'UNKNOWN',
        model: init?.model ?? 'UNKNOWN',
        startedAt: new Date(started).toISOString(),
        wallMs: Date.now() - started,
        skillsListed: listed ?? 'UNKNOWN',
        listsThisSkill: listed ? listed.includes(skill) : null,
        listsTheSibling: listed ? listed.includes(sibling) : null,
      };
      if (!listed) r.problems.push('the client produced no listing');
      else if (!listed.includes(skill)) r.problems.push(`the client does not list ${skill}`);
      else if (listed.includes(sibling)) r.problems.push(`the client lists ${sibling}, which was not installed in this project`);
    }
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
  r.ok = r.problems.length === 0;
  results.push(r);
  console.log(`${skill}: ${r.ok ? 'ok' : 'FAILED'}${r.client ? ` (client ${r.client.version} lists: ${[].concat(r.client.skillsListed).join(', ')})` : ''}${r.ok ? '' : `\n  ${r.problems.join('\n  ')}`}`);
}

const report = { checkedAt: new Date().toISOString(), node: process.version, platform: process.platform, source: source === root ? 'local checkout' : source, results };
if (outFile) {
  mkdirSync(dirname(resolve(outFile)), { recursive: true });
  writeFileSync(resolve(outFile), `${JSON.stringify(report, null, 2)}\n`);
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
