---
layout: post
title: "The outer loop is an accountability system"
summary: "Loop engineering can automate investigation, implementation, and verification. It cannot automate ownership. Addy Osmani's outer-loop vocabulary—quality, verdict, answerability, and back pressure—connects agent loops to Agile feedback, small batches, and durable process state."
tags:
  - loop-engineering
  - ai-agents
  - software-engineering
  - agile
  - spec-driven-development
  - trunk-based-development
  - governance
  - state-machines
  - human-in-the-loop
source_folder: sources/owning-the-outer-loop
sources:
  - title: "Own the Outer Loop"
    url: "https://addyo.substack.com/p/own-the-outer-loop"
    note: "Addy Osmani's July 2026 essay introducing the vocabulary of quality, verdict, answerability, back pressure, and the human-owned outer loop."
  - title: "The specification is not the batch"
    url: "https://sakul-learning.github.io/2026/07/11/specs-slices-trunk-and-loops/"
    note: "Earlier synthesis separating SDD, Agile, trunk-based development, and loop engineering as distinct feedback mechanisms."
  - title: "Loop engineering is harness engineering plus time"
    url: "https://sakul-learning.github.io/2026/07/02/loop-engineering-is-harness-engineering-plus-time/"
    note: "Earlier article on the harness, state, scheduling, verification, budgets, and human boundaries required for a loop to recur."
  - title: "Loop Engineering"
    url: "https://addyosmani.com/blog/loop-engineering/"
    note: "Addy Osmani's earlier mechanics-oriented account of automations, worktrees, skills, connectors, sub-agents, and durable state."
  - title: "Loop is the new Agile"
    url: "https://sausheong.com/loop-is-the-new-agile-0c3f426e469b"
    note: "Sau Sheong's comparison between Agile's compression of feedback cycles and loop engineering at agent-execution cadence."
---

Loop engineering answers a practical question: how can an agent do useful work repeatedly without a person manually restarting it each time?

Addy Osmani's new [*Own the Outer Loop*](https://addyo.substack.com/p/own-the-outer-loop) asks the more important companion question:

> When the system does useful work repeatedly, who is responsible for letting it matter?

His answer is not that people should go back to approving every tool call. It is that the human role moves outward, to the boundary where a system changes something that somebody must defend, repair, or live with.

The agent runs the **inner loop**: investigate, implement, verify, repeat. Engineers own the **outer loop**: set constraints, inspect evidence, make a verdict, and accept responsibility for the production consequence.

That distinction adds a missing vocabulary to the recent discussion about software factories, agent harnesses, specs, small batches, and durable workflow state. It tells us what a loop is *for* once it can run without us.

## Four words for the outer loop

Osmani introduces four terms that are useful precisely because they separate things agentic systems often collapse into a generic claim of “governance.”

| Word | It asks | It is not |
| --- | --- | --- |
| **Quality** | What checks produce evidence before this change reaches a dependent system? | A vague feeling that the agent did careful work. |
| **Verdict** | Given that evidence, do we ship, block, redirect, narrow, add a guardrail, or reject? | A model's confidence score or a green test in isolation. |
| **Answerability** | Can a person explain why this decision was made when it is challenged? | A long agent transcript that nobody can reconstruct. |
| **Back pressure** | What controls can slow, stop, constrain, or redirect the system? | Giving an agent as much autonomy as it can technically exercise. |

The sequence matters:

```text
constraints → work → quality evidence → verdict → accountable consequence
```

A useful test suite belongs in this sequence. So do type checks, policy checks, sandbox limits, CI, audit logs, production monitors, and a reviewer with authority to say no. But none of them is automatically the final decision. They make a decision **legible**.

That is the difference between a system that is automated and a system that is owned.

## The outer loop is not a human-shaped retry

There is an unhelpful interpretation of human-in-the-loop systems: place a person at the end of an agent run and call it safe. That turns people into a slow, poorly specified exception handler.

Osmani's framing is more demanding. People belong in four continuing loops around execution:

- the **constraints loop**: what inputs, architectures, instructions, invariants, permissions, and non-goals will govern the work?
- the **sampling loop**: what output will be inspected, how often, and by whom?
- the **audit loop**: what evidence will remain available, and how do we know it is enough to reconstruct the decision?
- the **ownership loop**: which production boundary has an accountable person or team, and what must they do if the decision was wrong?

These are design activities, not merely release activities. They determine what the inner loop is allowed to do before it runs, what it must emit while it runs, and which evidence can advance it afterward.

The shift is important because an agent can generate more candidate changes than a team can thoughtfully review. Adding agents does not make human attention parallelize. Osmani calls the gap the **orchestration tax**: selecting work, setting boundaries, finding the important exceptions, and verifying dangerous assumptions remains cognitive work.

A fleet with no corresponding review and ownership capacity is not an efficient factory. It is a machine for accumulating unexamined decisions.

## Three failure modes that small slices counteract

The article gives names to three costs of delegation.

**Cognitive surrender** is accepting an agent's output because it looks finished or authoritative. The result may have been produced by a model, but the consequences still belong to the people who release and maintain it.

**Cognitive debt** is the widening gap between what the system now does and what its maintainers can understand. Long-running plans and large private diffs make the gap worse: by the time a person sees the result, the reasoning, alternatives, and local context that would make it comprehensible have evaporated.

**Orchestration tax** is the non-parallelizable work of directing, prioritizing, filtering, reviewing, and deciding across many agents.

These are not arguments against automation. They are arguments against confusing generation with progress.

They also explain why the earlier advice about specs, Agile, and trunk is operational rather than aesthetic. A narrow, testable, mergeable slice reduces all three costs:

- It gives a reviewer a claim that can be disproved instead of a private history that must be reconstructed.
- It makes the evidence for a verdict proportionate to the change.
- It keeps the code near shared trunk reality, where integration exposes assumptions early.
- It produces an opportunity to update a spec, test, decision record, or runbook while the learning is still attached to the work.

Small batches are therefore not only a speed technique. They are an **answerability technique**.

## Agile, loop engineering, and the missing responsibility boundary

The previous article, [*The specification is not the batch*](https://sakul-learning.github.io/2026/07/11/specs-slices-trunk-and-loops/), separated four practices by the feedback each keeps honest:

```text
specification:     what should be true?
agile:             what did reality teach us?
trunk:             can this become shared truth safely?
loop engineering:  how does the system keep doing that work?
```

The outer-loop vocabulary adds a fifth question:

```text
accountability:    who can explain and own the decision to let this affect others?
```

It is not a fifth delivery ritual. It is the responsibility boundary around all the others.

A specification makes intent inspectable. Agile treats that intent as a hypothesis and searches for product evidence. Trunk-based development keeps the implementation close to shared reality. Loop engineering encodes the recurring cycle of discovery, handoff, implementation, verification, integration, observation, and updated artifacts.

The outer loop governs the authority of that cycle. It says that a loop may create evidence, but it does not thereby earn the right to decide what the organization should value, which risks it should accept, or who must respond when the evidence was insufficient.

This is why Osmani's essay deepens loop engineering rather than replacing Agile with a new slogan. Agile's core move was to shorten the distance between an assumption and evidence about it. The outer loop asks whether the team has made that evidence usable by a named decision-maker. Faster cycles without that boundary are merely faster opportunities to be confidently wrong.

## A durable state machine is an outer-loop mechanism

There is a direct connection to the durable SDLC process-state-machine design: a state machine can implement much of the outer loop, provided we do not pretend that the state machine itself is accountable.

A useful division of labour is:

| Outer-loop requirement | Durable-process implementation |
| --- | --- |
| **Answerability** | Execution history, artifact manifests, evidence hashes, reviewer findings, approval records, and correlation IDs make the process reconstructible. |
| **Verdict** | A structured verifier result and a `Choice` state make “approve,” “repair,” “escalate,” or “reject” an explicit transition rather than a sentence buried in chat. |
| **Back pressure** | Least-privilege roles, scope and time budgets, retry limits, concurrency limits, CI/policy gates, callback approvals, and cancellation paths regulate rate and authority. |
| **Constraints loop** | The approved spec, risk classification, tool permissions, change budget, and non-goals are stage inputs—not suggestions inside a generic prompt. |
| **Sampling and audit loops** | Risk-based review sampling and durable evidence requirements determine which runs are inspected and what remains after them. |
| **Ownership loop** | An approval record identifies the accountable person or team, the production boundary, and the action required on failure. |

### Example 1: turn PR review into an evidence-and-verdict workflow

The earlier [*Why we review*](https://sakul-learning.github.io/2026/06/19/why-we-review-agentic-code-review/) argument is that review is an SDLC trust system, not merely a defect filter. It distributes knowledge, exposes assumptions, preserves history, and makes someone own production risk. An agent can gather much of the evidence without replacing those jobs.

```text
pull-request event
  → classify changed surface and risk
  → agent gathers diff, tests, ownership rules, prior incidents, and CI evidence
  → independent reviewer produces a structured finding set
  → policy chooses one of: auto-merge eligible / human review / block
  → named reviewer receives a concise evidence brief and makes the verdict
  → merge or repair path is recorded with the evidence and rationale
```

The outer loop is not “make a bot approve PRs.” It is the system that insists the PR has an inspectable intent, proportionate evidence, the right reviewer route, and a durable answer to *why did this merge?* Low-risk documentation or generated-fixture work may advance automatically after deterministic checks. A payments permission change should not: it should wait for a named owner to inspect a prepared brief and accept the production boundary.

### Example 2: make deployment authority a state, not a Slack memory

Suppose an agent implements a feature behind a flag. CI is green and an independent verifier says the change satisfies the spec. The agent may have earned a `ready_for_integration` result; it has not earned permission to expose the feature to customers.

A durable workflow can route on the change's risk class. For a low-risk internal change, it may deploy to a canary, collect agreed metrics for an hour, and advance automatically only if the bounds hold. For a customer-facing billing change, it pauses after the evidence packet is assembled. The accountable product and engineering owners receive the rollout plan, non-goals, rollback path, and evidence. Their verdict can approve a limited rollout, narrow the scope, request a guardrail, or reject it.

The important part is the negative case. If a latency or error budget is breached, the workflow does not leave a red dashboard and an ambiguous chat message. It enters a known state: freeze rollout, roll back if policy permits, create a follow-up, notify the named owner, and preserve the observation that changed the decision.

### Example 3: let incident work be fast without making it unowned

During an incident, the outer loop may deliberately grant a narrow agent more authority: gather traces, correlate the recent deployment, draft a mitigation PR, run a safe diagnostic, or prepare a rollback. The state machine can record the incident ID, the emergency policy, the approved action envelope, and every evidence artifact.

That is not an excuse to make an incident agent the incident commander. A human still decides whether the evidence justifies the mitigation, whether customer impact warrants a rollback, and when the system is safe to close. Afterward, the workflow turns the result into durable learning: a regression test, a monitoring rule, a runbook correction, a spec constraint, or a revised risk classification.

In all three examples, the state machine remembers the **process truth**: what was attempted, which evidence arrived, which transition was permitted, and where the work is waiting. The named owner supplies the **accountability truth**: why this consequence was acceptable and what they will do if it was not.

In a Step Functions–style design, an implementation worker can create a PR, a verifier can compare it to the approved spec, CI can return evidence, and a callback task can wait for a responsible person. The state machine remembers that the implementation session ended, the evidence arrived, and the approval was given. It can resume days later without relying on a live agent session or somebody remembering a chat thread.

But the workflow cannot answer the normative question by itself. It can prove that the configured approver clicked *approve*. It cannot make that approver understand the consequence, choose what is worth building, or accept the operational and social cost of a mistake.

That is precisely why the process record needs more than a status field. For a production-affecting change it should preserve an accountability contract:

```text
intent and non-goals
risk classification and constraints
what evidence was required and received
verdict, named owner, and timestamp
production boundary affected
rollback / follow-up responsibility
observations after release
```

The artifact is not bureaucracy for its own sake. It is the shortest record that can answer five questions later:

1. What happened?
2. Why was it allowed?
3. What evidence supported the decision?
4. Who decided?
5. What do we do if the decision proves wrong?

## Durable engineering in brownfield systems

The outer-loop argument gets stronger in brownfield software. The behavior that matters is rarely contained in a ticket, a repo, or even an accurate architecture diagram. It lives in migrations, release practices, odd data, historical incidents, support knowledge, undocumented constraints, and what Osmani calls the system's scars.

This is where specs and process state become useful without becoming big-batch paperwork. The goal is not to freeze all knowledge before work begins. It is to turn the relevant implicit knowledge into an explicit constraint for the *next* safe slice, then retain the new learning as a better artifact for the next loop.

A regression fixture, an updated non-goal, a rejected design alternative, an approval record, a deployment observation, or a revised runbook is not administrative residue. It is how a system reduces cognitive debt instead of merely moving it from the agent to the next maintainer.

## The practical rule

The practical response is not “put a human in every loop.” It is to make the human role precise where it has unique value.

1. **Delegate bounded capability.** Let agents investigate, implement, test, and prepare evidence within a clear authority envelope.
2. **Design quality as evidence.** Do not call a check a guardrail unless its outcome can actually change a decision.
3. **Put back pressure before scale.** Limit scope, permissions, work-in-progress, time, retries, and advancement before adding more concurrent agents.
4. **Make the verdict explicit.** A change entering a dependent system needs a named authority and a concrete approve/block/redirect/reject outcome.
5. **Preserve answerability.** Keep the smallest durable trail that explains intent, evidence, decision, owner, and remediation path.
6. **Use small slices to protect understanding.** A short-lived branch and a narrow diff are not merely easier to merge; they are easier to own.
7. **Let product learning remain human-led.** An agent can report a metric. It cannot determine alone what the organization ought to value when metrics conflict or no metric exists yet.

Loop engineering gives us machinery that can run while we sleep. Agile, trunk, and specification discipline help that machinery learn before it accumulates expensive error. The outer loop adds the final constraint:

> The system may perform the work. A person must still be able to stand behind the decision to let that work change the world.

That is not the part of engineering that automation removes. It is the part that automation makes impossible to leave implicit.