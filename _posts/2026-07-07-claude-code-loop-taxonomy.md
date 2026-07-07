---
layout: post
title: "Claude Code's practical taxonomy for loops"
summary: "Anthropic's Claude Code team gives a crisp definition of loop engineering: agents repeat cycles of work until a stop condition is met. Their four loop types clarify what the human hands off to the harness: the check, the stop condition, the trigger, or the work stream."
tags:
  - ai-agents
  - loop-engineering
  - claude-code
  - software-engineering
source_folder: sources/claude-code-loop-taxonomy
sources:
  - title: "Getting started with loops"
    url: "https://claude.com/blog/getting-started-with-loops"
    note: "Official Anthropic / Claude Code team post defining loop types: turn-based, goal-based, time-based, and proactive loops."
  - title: "Loop engineering is harness engineering plus time"
    url: "https://sakul-learning.github.io/2026/07/02/loop-engineering-is-harness-engineering-plus-time/"
    note: "Previous post arguing that loop engineering is harness engineering plus state, verification, memory, durable execution, observability, cost control, and governance."
---

The Claude Code team published a useful short definition of what "designing loops" actually means:

> agents repeating cycles of work until a stop condition is met.

That definition matters because it keeps loop engineering grounded. A loop is not just a bigger prompt, and it is not just `while True` around an LLM. It is repeated agent work plus a trigger, a stop condition, a fitting primitive, and a task shape.

This is a good companion to last week's post, [Loop engineering is harness engineering plus time](/2026/07/02/loop-engineering-is-harness-engineering-plus-time/), because Anthropic's taxonomy gives names to the practical handoffs inside the harness.

## Their four loop types

### 1. Turn-based loops

This is the default coding-agent interaction.

- **Triggered by:** user prompt
- **Stopped by:** Claude judging it is complete or needs more context
- **Best for:** short, ad hoc tasks
- **Primitive:** normal prompt/turn

Their improvement pattern is to encode manual verification into `SKILL.md`.

Example: instead of saying “make a frontend change,” create a skill that requires Claude to:

- start the dev server
- open the edited page
- interact with the UI
- check console errors
- take screenshots
- run Chrome DevTools / performance checks
- fix and rerun if any check fails

This maps well to the previous post's point that [a useful loop has a skeptic in the path](/2026/07/02/loop-engineering-is-harness-engineering-plus-time/#the-useful-loop-has-a-skeptic-in-the-path).

### 2. Goal-based loops

This is `/goal`.

- **Triggered by:** manual prompt in real time
- **Stopped by:** goal achieved or max turns reached
- **Best for:** tasks with verifiable exit criteria
- **Primitive:** `/goal`

Example:

```text
/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries.
```

Key point: deterministic criteria are especially effective — test counts, score thresholds, explicit turn caps.

This is very aligned with the argument that [goal completion belongs in the harness](/2026/07/02/loop-engineering-is-harness-engineering-plus-time/#one-level-up-the-loop-as-an-operating-pattern).

### 3. Time-based loops

This is `/loop` locally and `/schedule` in the cloud.

- **Triggered by:** interval
- **Stopped by:** user cancels it, or work completes
- **Best for:** recurring tasks or external-system polling
- **Primitive:** `/loop`, `/schedule`

Example:

```text
/loop 5m check my PR, address review comments, and fix failing CI
```

They also distinguish local vs cloud:

- `/loop` runs on your computer
- `/schedule` moves the routine to the cloud

This fits the earlier section on [durable execution](/2026/07/02/loop-engineering-is-harness-engineering-plus-time/#durable-execution-is-where-the-demo-becomes-infrastructure): once the loop leaves the current agent session, the trigger and runtime become part of the design.

### 4. Proactive / composed loops

This is the most advanced form.

- **Triggered by:** event or schedule, no human in real time
- **Stopped by:** each task exits when its goal is met; routine keeps running until disabled
- **Best for:** recurring well-defined streams: bug reports, issue triage, migrations, dependency upgrades
- **Primitives:** `/schedule`, `/goal`, skills, dynamic workflows, auto mode

Their example is basically:

```text
/schedule every hour: check #project-feedback for bug reports.
/goal: don't stop until every report found this run is triaged, actioned, and responded to.
When fixing a bug, use a workflow to explore three solutions in parallel worktrees
and have a judge adversarially review them.
```

That is a strong official Claude Code example of loop composition:

```text
schedule → goal → skills → parallel agents → adversarial judge
```

It connects directly to the previous post's sections on [observability as the trust layer](/2026/07/02/loop-engineering-is-harness-engineering-plus-time/#observability-is-the-trust-layer) and [loops amplifying judgment](/2026/07/02/loop-engineering-is-harness-engineering-plus-time/#loops-amplify-judgment).

## Quality guidance

They emphasize that loop quality depends on the surrounding system:

- keep the codebase clean, because Claude follows local patterns
- give Claude verification skills
- make docs easy to reach
- use a second agent for code review
- when a result fails, encode the fix into the system for future iterations

This strongly supports the article's framing:

> The model reasons. The harness prepares context, executes actions, persists state, enforces limits, and decides when the model has gone in circles.

## Token / cost guidance

Their usage-management advice:

- choose the right primitive and model
- smaller tasks do not need multi-agent workflows
- define clear success and stop criteria
- pilot before large runs
- use scripts for deterministic work
- match polling intervals to actual change frequency
- inspect usage with `/usage`, `/goal`, and `/workflows`

This gives a concrete Claude Code version of the earlier argument that [a useful loop needs a skeptic before it earns more autonomy](/2026/07/02/loop-engineering-is-harness-engineering-plus-time/#the-useful-loop-has-a-skeptic-in-the-path) and that [cost control is architecture](/2026/07/02/loop-engineering-is-harness-engineering-plus-time/#durable-execution-is-where-the-demo-becomes-infrastructure).

## The useful handoff framing

The cleanest takeaway is this taxonomy:

| Claude Code loop type | What the human hands off |
|---|---|
| Turn-based | the check |
| Goal-based | the stop condition |
| Time-based | the trigger |
| Proactive/composed | the work stream / prompt source |

That turns "designing loops" into a practical question:

> Which part of the repeated work are you handing to the harness: verification, stopping, triggering, or task discovery?

That is a concise operational definition of loop engineering.
