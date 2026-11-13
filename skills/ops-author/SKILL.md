---
name: ops-author
description: Use this skill when the user wants an OPS prompt written, converted, reviewed or improved, including when they ask for a task prompt or task contract for an agent in a repository that has a `.guides/prompts/` folder. An OPS prompt (OpenPrompt Specification, Guided Engineering) is a validated YAML task contract, a `prompt.*.yaml` file under `.guides/prompts/`, with `agent`, `objective`, `steps`, `output` and `verification`. Covers turning a request or ticket into such a prompt, converting a prompt from the earlier `persona` format, and fixing a prompt that `ops-validate` rejects. Do not use it to plan or carry out the task a prompt describes, or for chat prompts and system prompts in general.
license: MIT
compatibility: Requires Node.js 20 or newer to run the bundled validator.
---

# Authoring OPS prompts

An OPS prompt is a task contract that a human hands to an agent. It states
what must be true when the task is done and which checks decide that. Use this
procedure to write, convert, review or improve one.

**You write the contract. You do not carry out the task it describes**, not in
part and not to try it out, however executable its actions look.

Paths that begin with `scripts/`, `references/` or `assets/` are relative to
the directory of this file, called `<skill-dir>` below.

## 1. Find the contract the project uses

| What | The project's own, when it has one | Otherwise |
|---|---|---|
| Validator | The command the project documents. Look in `.guides/README.md`, `AGENTS.md` and `package.json`. | `node <skill-dir>/scripts/ops-validate.mjs <file>` |
| Contract text | `.guides/ops-contract.md` | `references/ops-contract.md` |
| Agent map | `.guides/agents/agents.yaml` | Built in: exactly one agent, `guided-engineer` |
| Prompts | `.guides/prompts/prompt.<name>.yaml` at the repository root | The same path. Create the folder. |

The sections below are enough for most prompts. Read the contract text only
when a field, a resolution rule or a validator message is not explained here.

## 2. Write a prompt from a request

1. **Read the request for four things**: the outcome wanted, the limits
   stated, the checks named, and what is left open.
2. **Look at the project only as far as the prompt must name it**: the
   directory the task works in, the files it reads, the build and test
   commands that already exist, and one existing prompt for local conventions.
   Do not study, run or change the code the task is about.
3. **Settle what is unclear.** A gap is consequential when two reasonable
   readings would lead to different results or different checks. Ask the human
   about each consequential gap, briefly. When you cannot ask, take the
   narrowest reading, write it into `context` on a line that begins
   `Assumption:`, and name it in your report. Decide minor details yourself.
4. **Write the file** from `assets/prompt.template.yaml`, a complete valid
   prompt with a comment on every block, using the field guide in section 3.
5. **Validate** and correct until the validator accepts the file. Add
   `--resolve` to see how the root, workspace, agent, inputs and outputs
   resolved when the prompt sets a `workspace` or `inputs`.
6. **Report** as described in section 6.

## 3. Field guide

| Field | Write | Keep in mind |
|---|---|---|
| `id` and file name | Lowercase words joined by `.`, `-` or `_`. Name the file `prompt.<id>.yaml` unless the user or the project names it otherwise. | Unique in the repository. |
| `version` | `1` for a new prompt. | An integer. Add one when the task changes in substance. |
| `agent` | An id from the agent map. | Without a map only `guided-engineer` resolves. Never a role label, never an invented id. |
| `objective` | The end state, so that someone can check it. | Not the activity. "`slug()` returns `a-b` for `a  b`", not "improve slug". |
| `context` | Facts the executor needs: where the code is, how it is built and tested, what happens today. | Facts, not instructions. |
| `workspace` | The narrowest directory that holds everything the task changes, such as `./packages/cart`. | It is the write boundary. `inputs`, `output` and `run` commands resolve inside it. |
| `inputs` | Existing files or directories the task reads. | They must exist now. Never list a file the task creates. |
| `constraints` | Every limit the request states, one per item. | Scope, method, compatibility. Keep the user's meaning. |
| `requirements` | One `id` and `text` for each requirement the request states. | Each one needs a check that references it. Your own ideas do not go here. |
| `steps` | Ordered. Each item of `actions` is one imperative sentence that names the file or command. | No `if`, `retries` or nested steps. Write a condition into the sentence: "Only when …". |
| `output` | Each file the task creates or changes, relative to the workspace, listed once. | `output: []` when the result is only a state that the checks observe. |
| `verification` | The checks that decide completion. Every check has an `id` and an `expect`, the condition that must hold. Add `run` when a command the project already has decides it; exit code 0 passes. | `expect` is required even when the check has `run`; the validator rejects a check without it. |
| `stopConditions` | Situations in which going on would be a guess or would leave the scope. | |
| `limits` | Only when the request sets a retry or time limit. | The default is two repair attempts for a failing check. |

A check is meaningful when it would fail on the repository as it is now and
pass only when the objective holds. Use commands that exist; never invent a
script or a flag. When the project has no test for the behavior, make writing
that test a step and its file an output, and let the check run it. When the
request limits the scope, add a check that observes the limit.

## 4. Convert a prompt from the earlier format

The earlier format shows in `persona`, `apiVersion: ops/v1`, `category`,
`difficulty`, step-level `if`, `retries`, `onFailure` or `timeout`, or in run
facts such as `executedBy`, `evidence` and `approvals` inside the prompt. Such
a document is converted. Changing a line or two does not make it valid.

1. Run the validator on the old file. Each `legacy-*` message names a field
   and its replacement.
2. Read the field map before mapping anything: the project's
   `.guides/conversion.md`, or `references/conversion.md`.
3. Write what the old format could not say: a checkable `objective` and at
   least one `verification` check.
4. Leave the old file as it is unless the user asked to replace it.
5. Validate the new file.

**The actor.** A `persona` named a role, not a configured executor. When the
project's agent map has one agent (or there is no map), use that agent and say
so in the report: "persona `X` became agent `Y`". What the persona's
description asked for goes into `constraints` or `context` where the task
needs it. When the map has several agents and none clearly corresponds, or the
document declares both `persona` and `agent`, do not choose: stop, report the
conflict and ask.

**Every old field** ends in exactly one list of your report: *mapped* (to
which field), *dropped* (why nothing was lost), or *needs a decision*. Run
facts and earlier sign-offs are not copied into the prompt and never become
approvals of the new content.

## 5. Review or improve an existing prompt

Validate it first. Then read it against these questions:

- Can someone check the `objective` without asking the author?
- Does every requirement have a check that would fail if it were not met?
- Does each action say what to do to which file, in order?
- Is the scope bounded by `workspace` and `constraints`, and are the outputs
  declared?
- Is there a stop condition for the case where the task cannot stay in scope?

When the user asked only for a review, report findings and change nothing.

Improving makes the stated task checkable and unambiguous. It does not widen
the task: a requirement, output or constraint the user did not ask for is a
proposal in your report, not a line in the prompt. Keep the intent and the
scope, add one to `version` when the task changes in substance, and give a
**semantic change summary**: what the prompt now requires that it did not,
what it no longer requires, and what was only reworded.

## 6. Report

End with a short report that has these parts, in this order:

1. **Artifact.** The path of the prompt, the validator command you ran and its
   result.
2. **From the request.** The requirements and limits you took from the user.
3. **Assumptions and proposals.** What you decided or suggest that the request
   did not say, or "none".
4. **Open questions.** Decisions that stay with the human, or "none".
5. **Mapping or changes.** For a conversion, the three lists of section 4. For
   an improvement, the semantic change summary.
6. **Not executed.** One line saying that the task the prompt describes was
   not carried out.

## Gotchas

- Unknown fields are rejected, not ignored. A note that fits no field goes
  into `context`.
- `apiVersion` is always `guided-engineering/v1`. It does not make an old
  document valid.
- `$schema` is optional; leave it out unless the project's other prompts have
  it. When present it must lead to the canonical schema: its `$id`, or an
  identical copy in the project, `../schemas/prompt.schema.json` from
  `.guides/prompts/`. A reference to any other schema is rejected.
- Paths in `inputs`, `output` and `run` are relative to `workspace`, not to
  the repository root, and may not contain `..` or be absolute.
- Put YAML text in single quotes when it contains `: ` or begins with a
  backtick, `[`, `{`, `*`, `&`, `!`, `%`, `@` or `#`.
- The validator proves structure and references. It does not prove that the
  checks mean anything; read them against the objective yourself.

## Bundled files

- `scripts/ops-validate.mjs`: the validator, one file without dependencies.
  Exit code 0 valid, 1 invalid, 2 could not run. `--help` lists the options.
  Run it; do not open it. Third-party licences are in
  `scripts/ops-validate.licenses.txt`.
- `references/ops-contract.md`: the full contract, with every error code.
- `references/conversion.md`: the field map from the earlier format.
- `assets/prompt.template.yaml`: a valid prompt to start from.
