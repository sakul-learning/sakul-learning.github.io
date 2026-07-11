---
layout: post
title: "The specification is not the batch"
summary: "Spec-driven development, Agile, trunk-based development, and loop engineering are not competing rituals. They govern different feedback cycles: intent, product learning, integration, and autonomous execution."
tags:
  - spec-driven-development
  - agile
  - trunk-based-development
  - loop-engineering
  - ai-agents
  - software-engineering
  - continuous-integration
source_folder: sources/specs-slices-trunk-and-loops
sources:
  - title: "Spec-Driven Development and Specifications"
    url: "https://sakul-learning.github.io/2026/06/01/spec-driven-development-and-specifications/"
    note: "Earlier article: specs turn research into an inspectable target for humans, tests, tools, and agents; SDD is a feedback loop rather than a waterfall handoff."
  - title: "Evolving Spec-Driven Development"
    url: "https://sakul-learning.github.io/2026/06/03/evolving-spec-driven-development/"
    note: "Earlier article: the spec evolves from a document into a durable ledger of intent, decisions, checkpoints, deltas, and organizational memory."
  - title: "Loop engineering is harness engineering plus time"
    url: "https://sakul-learning.github.io/2026/07/02/loop-engineering-is-harness-engineering-plus-time/"
    note: "Earlier article: the governed agent loop needs handoff artifacts, independent verification, persistence, scheduling, budgets, and human boundaries."
  - title: "Loop Engineering"
    url: "https://addyosmani.com/blog/loop-engineering/"
    note: "Addy Osmani's canonical account of the mechanics: automations, worktrees, skills, connectors, sub-agents, and durable state turn an agent run into a repeatable loop."
  - title: "Loop is the new Agile"
    url: "https://sausheong.com/loop-is-the-new-agile-0c3f426e469b"
    note: "Sau Sheong's essay explicitly connects loop engineering to Agile's compression of feedback cycles, from project-scale weeks toward code-scale minutes."
  - title: "Spec-Driven Development and the Return of Big Batch Thinking"
    url: "https://cladam.github.io/2026/06/22/spec-driven-development/"
    note: "Claes Adamsson's critique of AI-era SDD as big-batch delivery when a large frozen spec becomes a large generated diff and a late review gate."
  - title: "tbdflow"
    url: "https://cladam.github.io/projects/tbdflow/"
    note: "Claes Adamsson's Git workflow assistant: main as the default, short-lived branches as exceptions, Definition of Done checks, stale-branch warnings, and automatic branch completion."
  - title: "Manifesto for Agile Software Development"
    url: "https://agilemanifesto.org/"
    note: "The original articulation of responding to change and working software as preferences over rigid plan-following and exhaustive documentation."
  - title: "Trunk Based Development"
    url: "https://trunkbaseddevelopment.com/"
    note: "Reference material for frequent integration to a shared trunk and techniques such as feature flags, branch by abstraction, and short-lived branches."
---

The recurring argument around agentic software development sounds new because the vocabulary is new.

Write a spec. Give it to an agent. Let the agent work for hours. Add a verifier. Feed the result back in. Run it again tomorrow.

But underneath that vocabulary are four older engineering concerns:

- How do we make intent explicit?
- How do we discover that our intent is wrong before it becomes expensive?
- How do we integrate changes without letting them drift away from reality?
- How do we let a system act repeatedly without silently substituting activity for progress?

Spec-driven development, Agile, trunk-based development, and loop engineering each answer one of these questions. They are not rival delivery religions. They are feedback mechanisms operating at different layers and at different speeds.

The confusion begins when we use one mechanism as a substitute for all the others.

A detailed specification cannot replace user feedback. A sprint cannot replace continuous integration. A green test suite cannot replace a specification of the right behavior. And an agent loop cannot decide for itself that it has built something worth shipping.

The useful goal is not to choose one acronym. It is to connect the loops.

## Four practices, four jobs

The clearest way to separate the practices is by the thing each one tries to keep honest.

| Practice | Primary concern | The feedback it needs | Typical failure when missing |
|---|---|---|---|
| **Spec-driven development** | Intent | “Is this what we mean, including constraints and non-goals?” | Fast, plausible implementation of the wrong thing. |
| **Agile** | Product learning | “Did the delivered slice change our understanding of the user or problem?” | A plan becomes more important than evidence. |
| **Trunk-based development** | Integration | “Does this small change work with the system everyone else is changing?” | Long-lived branches, late merge pain, and giant review gates. |
| **Loop engineering** | Repeated autonomous execution | “Can a governed system act, observe, stop, recover, and improve without a human prompting every turn?” | An agent repeatedly does work without reliable progress or accountability. |

This is a stack, not a sequence of replacements.

SDD gives a loop an artifact to work against. Agile makes the artifact revisable when reality disagrees. Trunk-based development keeps the implementation close to shared reality. Loop engineering gives the whole arrangement a controller, sensors, state, schedules, and stopping rules.

Or more compactly:

```text
specification:     what should be true?
agile:             what did reality teach us?
trunk:             can this become shared truth safely?
loop engineering:  how does the system keep doing that work?
```

## The specification is not the batch

The common critique of SDD is fair when “spec-driven” means: write a large, complete plan; send it to an agent; wait for a large implementation; then place a heroic review at the end.

That is not really a problem with a specification. It is a problem with **batch size**.

Claes Adamsson makes the point sharply in [“Spec-Driven Development and the Return of Big Batch Thinking”](https://cladam.github.io/2026/06/22/spec-driven-development/). A large up-front design, followed by a large generated codebase, followed by late review and release, has the shape of Big Batch Delivery. Faster generation does not repair that shape. It makes the batch arrive sooner.

The core risk is compounding uncertainty. Requirements are not settled facts waiting to be transcribed into code. They are hypotheses about users, behavior, constraints, architecture, operations, and trade-offs. If one early hypothesis is wrong, every implementation decision built on it inherits the mistake.

That is why a specification should not be read as a promise that the team already knows everything. It should be read as the current, inspectable model of what the team believes.

A useful spec contains more than desired behavior. It captures non-goals, open questions, assumptions, acceptance criteria, edge cases, and the evidence that would change the team's mind. In that sense, a spec is not a phase gate before implementation. It is an early feedback surface.

The mistake is turning that feedback surface into a massive handoff package.

## Agile did not say “do not plan”

The original Agile correction was not an argument against thinking, design, or documentation. It was an argument against betting the entire project on a plan surviving first contact with reality.

The underlying move was to reduce the distance between a decision and evidence about that decision:

```text
hypothesis → small increment → demonstration → feedback → revised hypothesis
```

Sau Sheong's [“Loop is the new Agile”](https://sausheong.com/loop-is-the-new-agile-0c3f426e469b) carries the analogy down a layer. Agile shortened the feedback cycle for teams from long project phases to weeks. Agent loops can shorten it again, from a sprint-scale increment to a test run, a benchmark, a review, or a controlled deployment measured in minutes.

The principle is the same at both levels: do not mistake a first attempt for proof.

This is the part of Agile that agentic development should preserve. An agent can produce implementation much faster than a team can write it manually, but that does not make the agent's first interpretation more correct. It makes early correction more important because the cost of building the wrong thing has fallen while the speed of building a lot of it has risen.

So the question is not whether a feature deserves a specification. The question is whether the specification names the **next learning slice** or disguises an entire uncertain feature as one task.

## A slice has to be both testable and mergeable

“Make smaller changes” is easy advice to agree with and hard advice to operationalize. A tiny internal refactor is not automatically a useful slice. Nor is a UI mock that cannot exercise a real behavior.

For this stack of practices, a good slice has two properties.

First, it is **testable**. There is a clear claim someone can try to disprove:

- a scenario works;
- a contract is preserved;
- a policy is enforced;
- a metric stays within a bound;
- a user can complete a specific step;
- an explicit non-goal remains absent.

Second, it is **mergeable**. It can be integrated into the shared system without requiring every other part of a large feature to arrive at the same time.

That often means using techniques that seem less glamorous than a large feature branch:

- feature flags to keep unfinished behavior unavailable;
- branch by abstraction to introduce and migrate behind a stable interface;
- additive schema and API changes before consumers switch over;
- backward-compatible contracts;
- inert scaffolding that has tests and ownership but no user-visible effect yet;
- small vertical slices where an end-to-end behavior is deliberately narrow.

The goal is not “never make a branch.” It is to avoid using a branch as a warehouse for unresolved integration work.

A practical handoff to an agent should therefore be smaller than “build authentication” or “implement the billing system.” It might be:

> Add the password-reset request endpoint. It must not reveal whether an account exists, must emit the existing audit event, must be disabled behind `password_reset_v1`, and must satisfy these scenario tests. Do not add the reset-token redemption flow.

That is still a specification. It is just a specification that can be challenged, implemented, reviewed, merged, and learned from before the team has committed to the rest of the feature.

## Trunk is the integration sensor

Agile alone does not prevent a team from completing several small-looking tasks on a long-lived feature branch and discovering their combined effect only at the end. This is the problem trunk-based development addresses.

Trunk-based development treats the shared branch as the most important integration environment. The point is not ideological devotion to direct commits to `main`. The point is to keep the distance between a change and the shared system short.

A short-lived branch is often a sensible local isolation boundary. But it should remain short-lived because it is a temporary fork of reality. Every extra day increases the chance that:

- the surrounding code has changed;
- other work has made a different architectural choice;
- tests or dependencies have moved;
- the feature's assumptions have drifted;
- review has become an exercise in reconstructing a private history;
- the integration cost has accumulated where nobody can see it.

Adamsson's [`tbdflow`](https://cladam.github.io/projects/tbdflow/) is useful precisely because it makes this mundane discipline concrete: `main` is the default, branches are exceptions, completion cleans them up, a Definition of Done checklist can run before commit, and stale branches can be surfaced early.

That is a useful lens for agent work too. If an agent spends six hours accumulating a thousand-line private diff, the system has not gained six hours of progress. It has gained a large unintegrated hypothesis and a new comprehension problem.

A branch may be the agent's workspace. It should not become the agent's memory, roadmap, or release plan.

Git history, issue state, a spec ledger, run records, and merged incremental behavior are much safer places for durable knowledge to live.

## Loop engineering makes the cadence explicit

The inner agent loop is familiar: inspect, reason, edit, run a tool, observe, repeat. That is useful, but it is not the whole of loop engineering.

Loop engineering starts when the human stops being the clock. The system decides when to collect a signal, create a handoff, run a bounded attempt, invoke verification, persist the result, and schedule the next pass.

The useful shape is:

```text
discovery → scoped handoff → implementation → verification → integration → observation → updated artifact
```

Each noun has a job.

- **Discovery** finds a candidate for work: a user signal, failing check, stale issue, production trace, or deliberate product decision.
- **Scoped handoff** turns that signal into a small artifact with a goal, non-goals, constraints, and evidence of done.
- **Implementation** is where an agent or developer makes the smallest credible change.
- **Verification** gives the system someone or something that can say no: tests, policy, security checks, a separate reviewer, or a human.
- **Integration** puts the change back against shared reality rather than allowing private branch history to become the only proof that it works.
- **Observation** asks whether the behavior had the intended effect in its real environment.
- **Updated artifact** records what was learned: a changed spec, clarified acceptance criterion, new regression fixture, revised decision, or rejected approach.

This is why loop engineering needs SDD and trunk-based discipline rather than replacing them. Without an artifact, the loop cannot establish what it is optimizing for. Without integration, it can optimize a local branch while increasing organizational uncertainty. Without observation, it can pass every visible check while still serving the wrong user need.

## The verifier needs a brief

The most dangerous loop is an agent that writes code and then declares its own success.

A test suite is indispensable, but it is not automatically an independent judge. If the same agent can change the implementation, update the tests, and optimize only against visible checks, it can learn to satisfy the scoreboard instead of the intent.

This is why an adversarial reviewer needs more than the diff and the instruction “look for problems.” It needs a brief:

- the problem being solved;
- the scoped specification and explicit non-goals;
- acceptance criteria and constraints;
- the changed artifacts;
- the validation evidence;
- relevant production or UX observations;
- the authority to reject, request a narrower slice, or escalate ambiguity.

That brief can be a human-readable spec plus executable assertions. These are complementary, not competing forms of rigor. Formal properties, contracts, policy checks, hidden fixtures, and scenario tests are excellent where they fit. Human-readable intent is essential where the relevant question involves product meaning, maintainability, usability, trade-offs, or an assumption that has not yet become formalizable.

The reviewer can then perform a real context-light check: not rediscovering the entire product from scratch, but independently comparing the change to the stated target.

## The operating model: specs move, trunk moves, loops run

A healthy agentic workflow does not have one giant loop. It has nested loops with deliberately different speeds.

| Cadence | Loop | Evidence | Typical owner |
|---|---|---|---|
| Minutes | Agent implementation loop | Tests, types, fixtures, linters, local review | Agent plus developer |
| Hours or days | Trunk integration loop | CI, review, compatibility checks, deploy safety | Team and platform |
| Days or weeks | Product / Agile loop | Demo, telemetry, user feedback, support signals | Product, design, engineering |
| Across the feature lifetime | SDD intent loop | Spec review, clarified assumptions, decisions, updated acceptance criteria | Humans steer; agents assist |

The loops should inform one another.

A failed integration check might reveal that the implementation is wrong. It might also reveal that the slice was too broad or that the spec ignored a compatibility constraint. Production telemetry might reveal that a perfectly implemented acceptance criterion does not create value. A reviewer might find that an agent made an undocumented trade-off, which is a reason to update the decision record rather than merely patch the code.

This is the key correction to both waterfall SDD and “ship it faster” agent rhetoric:

> A specification is not a contract to stop learning. It is the current state of learning, made inspectable enough to drive the next safe increment.

## A small policy for agent-generated features

If I were turning this synthesis into a team policy, it would be deliberately boring:

1. **Start with a narrow behavior, not an epic.** Name the user-visible or operational outcome, the non-goals, and the evidence required.
2. **Make the slice safe to integrate.** Prefer flags, additive changes, compatible contracts, and abstractions over a private branch that must land all at once.
3. **Give the agent a bounded budget.** Limit time, iterations, changed surface area, cost, and authority; escalate when the budget is exhausted.
4. **Keep the branch short-lived.** Merge or abandon it while the original intent is still comprehensible. Do not use branch age as a substitute for a durable artifact trail.
5. **Separate maker from checker.** Tests, policy, fresh-context review, and human gates should be able to reject the result.
6. **Treat integration and production as sensors.** A green local run proves less than an integrated system, and an integrated system proves less than the intended user outcome.
7. **Update the artifacts.** Preserve the changed assumption, discovered edge case, rejected approach, acceptance criterion, or reusable workflow pattern for the next loop.

None of this makes agentic software development slower. It prevents fast generation from becoming fast accumulation of uncertainty.

## A mechanical addendum — and a separate extension

The argument above is about the feedback cycles a team must govern. For the concrete machinery that makes an agent loop run, read Addy Osmani's canonical [*Loop Engineering*](https://addyosmani.com/blog/loop-engineering/) essay. Its useful implementation vocabulary is compact: **automations** find or schedule work; **skills** preserve project knowledge; **worktrees** isolate concurrent changes; **connectors** reach the systems of record; **sub-agents** separate making from checking; and durable **state** lets the next run remember what the last one learned.

That machinery is the missing bridge between a good delivery principle and a system that can enact it repeatedly. It does not, by itself, establish that the work is the right work, that it can land safely, or that it improved the product.

> **A separate extension of Osmani's loop:** make the loop recur not only against its own state and tests, but against a narrow, inspectable intent; shared trunk reality; and the product signal that can prove the intent was worth pursuing.

Osmani's post is the right place for the evolving, tool-specific mechanical details. This article's separate claim is that those mechanics become a safe delivery system only when they remain coupled to small specs, fast integration, and real-world observation.

## The line between the ideas

There is a clean division of labor here.

- **SDD** says: make intent explicit enough to inspect and test.
- **Agile** says: treat that intent as a hypothesis and learn before the batch becomes expensive.
- **Trunk-based development** says: keep the code close to shared reality so integration cost cannot hide.
- **Loop engineering** says: encode this cycle into a governed system that can run repeatedly without replacing evidence with agent confidence.

The synthesis is not “write longer specs for more autonomous agents.” It is almost the opposite:

> Write the smallest artifact that makes the next slice testable. Integrate the smallest change that makes the learning real. Build the loop that remembers what happened and knows when to stop.

That is not waterfall planning with newer tools.

It is feedback engineering, at machine speed.
