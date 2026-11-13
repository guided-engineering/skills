# Guided Engineering Skills

Two [Agent Skills](https://agentskills.io) for the **OPS prompt contract**, the
validated task contract of
[Guided Engineering](https://guided-engineering.github.io/OpenPrompt-Specification/).

| Skill | Use it when you want | It will | It will not |
|---|---|---|---|
| [`ops-author`](./skills/ops-author/SKILL.md) | a request written down as an OPS prompt; an existing prompt reviewed or improved; a prompt in the earlier format converted | read the request and only as much of the project as the prompt must name, write the prompt, validate it, and report what it assumed and what you still have to decide | carry out the task the prompt describes, or relabel an unknown actor silently |
| [`ops-execute`](./skills/ops-execute/SKILL.md) | an OPS prompt interpreted, planned, executed or resumed | validate the contract, resolve workspace and agent, plan with a check for every task, make the smallest change you authorized, verify after the last edit, repair within the prompt's limits, and record a worklog entry | go beyond the mode you asked for, weaken a test to get a pass, or record an approval |

Each Skill works when installed alone. The contract itself is defined in
[`guided-engineering/OpenPrompt-Specification`](https://github.com/guided-engineering/OpenPrompt-Specification);
this repository never redefines it.

## Install the Skills

You need Node.js 22.20 or newer for the `skills` installer. The validator
inside each Skill needs Node.js 20 or newer.

**Claude Code** (tested):

```bash
npx skills add guided-engineering/skills -a claude-code -y
```

This copies both Skills into `.claude/skills/` of the current project. Other
forms:

```bash
npx skills add guided-engineering/skills -a claude-code -s ops-author -y
```

```bash
npx skills add guided-engineering/skills#146c4b51fee8f1a6609b424fe6381c28c27c60e4 -a claude-code -y
```

The first installs one Skill. The second installs a fixed revision; the commit
shown is the one the local study measured, which differs from the current one
by a single corrected sentence (see below). Add `-g` to install for your user
instead of the project. Without the installer, copy a folder under `skills/`
into `.claude/skills/`.

**Codex and other hosts that read `.agents/skills/`** (not tested):

```bash
npx skills add guided-engineering/skills -a codex -y
```

The `skills` CLI sends anonymous installation telemetry unless
`DISABLE_TELEMETRY=1` is set.

## The agent is a separate matter, and usually no step at all

An OPS prompt names an `agent`. Installing a Skill installs no agent. The name
resolves through the project's agent map, and a project without one has exactly
one agent:

```yaml
# .guides/agents/agents.yaml (optional)
apiVersion: guided-engineering/v1
agents:
  - id: guided-engineer
    description: Default engineering executor.
```

`guided-engineer` resolves to the **current executor**: the session of your
agent host that is reading the prompt. Nothing is started and nothing has to be
configured. This mapping is the one every measured run used.

A project that wants a native profile of its host binds the id to it:

```yaml
agents:
  - id: guided-engineer
    description: Default engineering executor.
    profiles:
      claude-code: .claude/agents/guided-engineer.md
```

The validator then requires that file to exist. You write it in your host's own
format and keep it thin: let it refer to these Skills, and do not copy their
procedures into it. Hosts do not share a profile format, and a profile changes
how an agent behaves, so no claim is made that a profile behaves the same on
two hosts. **No profile ships in this repository.** None was needed, and none
was exercised.

## What was tested, and what was not

| What | Status | Evidence |
|---|---|---|
| Format: front matter, names, relative resources, size | Checked by `npm test` (25 tests) and by the reference validator `skills-ref` 0.1.0, which accepts both Skills. Structural validity is not proof of behavior. | [`test/`](./test/), [`tools/check.mjs`](./tools/check.mjs) |
| Each Skill installed alone with `skills@1.8.1` into a clean project | Files identical to the source, nothing else installed, every named resource present, bundled validator works on a valid and an invalid prompt. Checked for the current version and, separately, for the measured revision against its own commit. | [`verification/`](./verification/) |
| Discovery by Claude Code 2.1.322 on Windows | The client lists each Skill when it is installed alone, and both when both are installed | [`verification/`](./verification/), study records |
| Behavior in Claude Code | Measured in a small local study, five tasks with and without the Skills, **for revision `146c4b5`**. The current `ops-author` differs from it by one sentence and has not been measured. | below |
| Codex and other hosts | **Not tested.** No second host was installed. The Skills use only fields of the open format. | — |
| A native agent profile | **Not exercised.** | — |
| Listing on [skills.sh](https://skills.sh) | **None claimed.** skills.sh is a directory built around the `skills` CLI. No listing, review, certification or benchmark of these Skills is claimed. | — |

## What the local study found

The same agent (Claude Code, `claude-opus-5-5`), on the same contract and
validator, with and without these Skills, on five small tasks, one run each:

| Task | Without Skills | With Skills |
|---|---:|---:|
| C1 Write a prompt from a request | 100 | 100 |
| C2 Convert and improve a legacy prompt | 100 | 100 |
| C3 Plan a prompt in a nested workspace | 90 | 100 |
| C4 Execute a prompt against a bug | 90 | 90 |
| C5 Resume from a recorded checkpoint (reserved case) | 100 | 100 |

**The study does not show that the Skills improve the work, and it shows no
case where they made it worse.** The agent was already at or near the top of
the scale without them, and the one higher score comes from a point the
baseline lost to the grader. The right Skill loaded in six of six probes and in
all five tasks. The study could not measure what the Skills are for, bringing
the contract and the validator to a project that has neither, because every
test project already had both.

Everything, including what limits these numbers:
[results page](https://guided-engineering.github.io/OpenPrompt-Specification/results.html)
and
[report](https://github.com/guided-engineering/OpenPrompt-Specification/blob/main/.guides/testing/skills-study/results/report.md).
The measured revision is commit `146c4b5`. Every number above is about that
revision and about nothing later.

### Changed since the measured revision

One row of the field guide in `ops-author`, in commit `c8418f5`. `ops-execute`
and every bundled file are byte-identical to the measured revision.

The measured text said that a check without a command uses `expect` to say what
to observe. That could be read as if `expect` were needed only then, and it is
required for every check. In both authoring runs of the study the first draft
left it out of the checks that had a command; the validator rejected the draft
and named the field, and the agent corrected it. The row now says that every
check has an `id` and an `expect`, and that `run` is added when a command
decides the check.

**The effect of this correction has not been measured.** It was made after the
study, on the owner's instruction. To use the measured text, install the pinned
revision shown under "Install the Skills".

### Known issue

`assets/prompt.template.yaml` in `ops-author` is a copy of the specification
repository's template, and its header comment names that repository's
validator command. Use the command given in `SKILL.md`. It is on the
[roadmap](https://github.com/guided-engineering/OpenPrompt-Specification/blob/main/ROADMAP.md).

## What a Skill folder contains

```
skills/ops-author/
  SKILL.md                         the procedure
  scripts/ops-validate.mjs         the validator, one file, no dependencies
  scripts/ops-validate.licenses.txt
  references/ops-contract.md       the contract, for when the summary is not enough
  references/conversion.md         the field map from the earlier format
  assets/prompt.template.yaml      a valid prompt to start from
  ops-source.json                  where the copies came from
```

`ops-execute` has the same validator and contract, and a worklog entry template
instead of the prompt template and the conversion guide. Nothing is shared
between the two folders, so either works without the other.

**Why a script is bundled.** In every baseline run of the study the agent ran
the validator on every artifact before reporting. That is repeated work that
depends on a tool, and a project that has not adopted the contract has no such
tool. The script validates; it executes no step of a prompt.

**Where the copies come from.** The validator, the contract text and the
templates are copied from OpenPrompt-Specification by
[`tools/sync-ops.mjs`](./tools/sync-ops.mjs). Each `ops-source.json` records the
source commit and the hash of every file. The schemas are inside the validator;
`node scripts/ops-validate.mjs --version` prints their hashes. When a project
has its own validator and contract, the Skills use the project's.

## Working on this repository

```bash
npm test                  # the checker, both Skills, provenance, the bundled validator
npm run check             # structure and provenance only
npm run trace -- --check  # the requirement map matches the prompt
npm run verify:install    # install each Skill alone into a clean project (needs network)
npm run sync              # copy the OPS material again from ../OpenPrompt-Specification
```

`npm run sync` changes the bytes of the Skills. A changed Skill is a new
version that the study did not measure, and it says so wherever the results are
quoted. To check that the measured revision still installs byte for byte:

```bash
node tools/verify-install.mjs --source guided-engineering/skills#146c4b51fee8f1a6609b424fe6381c28c27c60e4 --compare 146c4b51fee8f1a6609b424fe6381c28c27c60e4
```

This repository is itself run with an OPS prompt:
[`.guides/prompts/prompt.skills-repository.yaml`](./.guides/prompts/prompt.skills-repository.yaml),
with its [requirement map](./.guides/traceability/skills-repository.requirements.md)
and its run record under [`.guides/operation/worklog/`](./.guides/operation/worklog/).

## Licence

MIT, the licence of the specification repository, from which the bundled
contract text and validator are copied. Copyright Guided Engineering Team. See
[`LICENSE`](./LICENSE). Third-party notices of the validator bundle are in
`scripts/ops-validate.licenses.txt` of each Skill.
