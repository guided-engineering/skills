# Requirement map of the Skills repository plan

Generated with `ops-validate --trace .guides/prompts/prompt.skills-repository.yaml`. Do not edit: change the prompt and regenerate.

## `guided-engineering.skills-repository` (version 1)

32 requirements, 5 steps, 7 checks.

| Requirement | Text | Steps | Checks |
|---|---|---|---|
| `A1` | `ops-author` drafts, converts, reviews and improves OPS prompts. It inspects the target project and canonical schema, extracts intent and constraints, resolves the agent reference, exposes consequential ambiguity, writes concrete imperative actions, declares expected outputs and meaningful checks, and validates the result (5 ops-author). | `author-skills` | `content-covers-contract` |
| `A2` | `ops-author` preserves the scope the user gave, distinguishes supplied requirements from proposed assumptions, and shows a short semantic change summary when it improves an existing prompt (5 ops-author). | `author-skills` | `content-covers-contract` |
| `A3` | `ops-author` supports explicit conversion of legacy prompts as input, writes only the canonical `agent` contract, reports unsupported or conflicting old fields, never relabels an unknown actor silently, and never performs a task because a generated prompt contains executable actions (5 ops-author). | `author-skills` | `content-covers-contract` |
| `E1` | `ops-execute` follows the loop inspect, validate intent and contract, plan, execute the authorized unit, verify, diagnose and repair if justified, reverify, record evidence, decide the next unit (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E2` | `ops-execute` honors interpret-only, plan-only and execution requests without silently crossing those boundaries (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E3` | `ops-execute` resolves the repository, task workspace, inputs, agent profile, dependencies, ordered actions, expected outputs and acceptance checks before any modification (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E4` | `ops-execute` derives a short plan with a check for each task and reuses project commands, never inventing scripts or claiming that nonexistent commands were run (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E5` | `ops-execute` executes the smallest authorized change, preserves unrelated edits, and stops on unsupported contract semantics or material ambiguity (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E6` | `ops-execute` classifies a failed check before fixing it and repairs the actual cause, never weakening tests, skipping failing checks or amending requirements to get a pass (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E7` | `ops-execute` re-runs the relevant checks after the last content change and never reuses a pre-edit success as evidence for the final bytes (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E8` | `ops-execute` resumes from evidence checked against the real workspace, neither repeating a completed side effect because a checklist is stale nor skipping a step only because a log says it passed (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E9` | `ops-execute` respects declared retry and time limits and, when blocked, reports the failed command, an error summary, the likely cause, the attempted correction and the next action (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `E10` | `ops-execute` separates execution evidence, review and approval, states which agent and client actually acted, and never fabricates independent reviewers or sign-offs (5 ops-execute). | `author-skills` | `content-covers-contract` |
| `P1` | The repository uses the discoverable layout `skills/ops-author/SKILL.md` and `skills/ops-execute/SKILL.md`, and each Skill is usable when installed independently (5 Packaging 1). | `author-skills` | `structure` |
| `P2` | Each Skill follows the Agent Skills specification, with the required `name` and `description`, a compliant directory name and Markdown instructions after the front matter. The description states real activation contexts and boundaries, and optional fields are used only for a concrete need (5 Packaging 2). | `author-skills` | `structure` |
| `P3` | Each `SKILL.md` is concise, substantially under the recommended 500 lines, with detailed rules, examples and host-specific instructions in clearly linked resources loaded when needed (5 Packaging 3). | `author-skills` | `structure` |
| `P4` | The Skills start from instructions and existing tools. A deterministic script is added only for repeated or fragile work demonstrated by the baseline, is tested on valid and invalid inputs, and is not an OPS execution engine (5 Packaging 4). | `author-skills` | `scripts-tested` |
| `P5` | A Skill uses the project's canonical contract when present. For standalone use it bundles only the necessary reference material with source revision and hash, synchronized mechanically, without forking the normative specification (5 Packaging 5). | `prepare`, `author-skills` | `structure` |
| `P6` | Every required reference remains valid after selective installation, with no dependency on a sibling Skill or on absolute paths from the development machine (5 Packaging 6). | `author-skills` | `structure`, `clean-install` |
| `P7` | The real local discovery paths are verified against the installed client version, and study installations are isolated so that baseline runs cannot load candidate Skills (5 Packaging 7). | `integrate-hosts` | `clean-install` |
| `P8` | Codex `agents/openai.yaml` or other host-specific configuration is added only where supported and useful, provider extensions stay out of the portable core, and any native agent mapping is documented without claiming identical behavior across tools (5 Packaging 8). | `integrate-hosts` | `host-notes-honest` |
| `P9` | The native profile or current-executor mapping frozen with the contract is reused unchanged across scored conditions. Only Skill availability changes, no Skill procedure is preloaded into the baseline and no task instruction is altered to compensate (5 Packaging 9). | `integrate-hosts` | `host-notes-honest` |
| `P10` | Skill installation and native agent configuration are documented as separate steps, each Skill is verified in a clean project without the source checkout or a previously installed profile, and the exact supported profile step or an explicit mapping to the current executor is given (5 Packaging 10). | `integrate-hosts` | `clean-install`, `host-notes-honest` |
| `P11` | Front matter, naming, relative resources, scripts, example OPS artifacts and local discovery are validated, the reference validator is used when available with its version recorded, and the first Skill candidate is preserved before assisted cases run (5 Verification). | `integrate-hosts`, `refine-once` | `structure`, `candidates-preserved` |
| `G1` | The repository is complete locally before its remote exists, with the two Skills, minimal native integration examples, installation and usage documentation, validation and evaluation assets, supported-client status and licensing based on verified project permissions (8.1). | `prepare`, `publish` | `structure` |
| `G2` | The availability of `guided-engineering/skills` and the right to create it are verified. A suitable existing repository is used without overwriting unrelated work, and only a real naming conflict or access problem is escalated (8.2). | `publish` | `published` |
| `G3` | Local discovery is verified with the documented `skills` CLI, recording the exact version and command, selective installation into an isolated project is tested, installed paths and resources are validated, and installation examples are pinned to a real revision where supported (8.3). | `integrate-hosts` | `clean-install` |
| `G4` | The documentation states that skills.sh provides discovery and distribution around Agent Skills and claims no listing, certification or benchmark approval that was not verified separately (8.4). | `integrate-hosts` | `host-notes-honest` |
| `G5` | Coherent commits and reviewable branches are prepared for both repositories under the existing protections and contribution rules, with no force-push, repository deletion, history rewrite or automatic merge (8.5). | `publish` | `candidates-preserved`, `published` |
| `G6` | The new repository is published and the reviewed OPS changes are proposed through the authorized workflow, reusing the explicit session authorization. A merge or public-setting decision that is not approved is presented as the final decision with diff, test results, target, visibility and consequences (8.6). | `publish` | `published` |
| `G7` | If remote access is unavailable, the complete local repositories and exact publication steps are kept and the state is reported as READY_LOCALLY or as the specific blocker, never as PUBLISHED (8.7). | `publish` | `published` |
| `G8` | The actual remote identity, branches, commits, visibility, public file access and documented installation from the resulting source are checked, real URLs are recorded, and an open pull request, a merged change, a public repository and a publicly installable package are told apart (8 Verification). | `publish` | `published` |

| Step | Title | Requirements |
|---|---|---|
| `prepare` | Prepare the repository without Skill content | `G1`, `P5` |
| `author-skills` | Write the first candidate of both Skills | `A1`, `A2`, `A3`, `E1`, `E2`, `E3`, `E4`, `E5`, `E6`, `E7`, `E8`, `E9`, `E10`, `P1`, `P2`, `P3`, `P4`, `P5`, `P6` |
| `integrate-hosts` | Document installation and native agent configuration | `P7`, `P8`, `P9`, `P10`, `P11`, `G3`, `G4` |
| `refine-once` | Apply at most one refinement justified by the study | `P11` |
| `publish` | Publish the repository | `G1`, `G2`, `G5`, `G6`, `G7`, `G8` |

| Check | Command | Requirements |
|---|---|---|
| `structure` | `npm test` | `P1`, `P2`, `P3`, `P5`, `P6`, `P11`, `G1` |
| `content-covers-contract` | observed | `A1`, `A2`, `A3`, `E1`, `E2`, `E3`, `E4`, `E5`, `E6`, `E7`, `E8`, `E9`, `E10` |
| `scripts-tested` | `npm test` | `P4` |
| `clean-install` | observed | `P6`, `P7`, `P10`, `G3` |
| `host-notes-honest` | observed | `P8`, `P9`, `P10`, `G4` |
| `candidates-preserved` | observed | `P11`, `G5` |
| `published` | observed | `G2`, `G5`, `G6`, `G7`, `G8` |
