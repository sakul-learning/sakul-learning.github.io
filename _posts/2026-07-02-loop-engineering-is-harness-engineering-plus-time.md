---
layout: post
title: "Loop engineering is harness engineering plus time"
summary: "Agent loops are not just longer prompts or a while loop around an LLM. The useful engineering work is the system around repeated model action: context, memory, verification, durable execution, budgets, observability, and human judgment boundaries."
tags:
  - ai-agents
  - loop-engineering
  - agentic-systems
  - software-engineering
  - platform-engineering
  - automation
source_folder: sources/loop-engineering-is-harness-engineering-plus-time
sources:
  - title: "cobusgreyling/loop-engineering"
    url: "https://github.com/cobusgreyling/loop-engineering"
    note: "Pattern catalog and operational guidance for loop engineering: daily triage, PR babysitter, CI sweeper, state, budgets, run logs, and safety gates."
  - title: "Loop-Engineering-IEEE.pdf"
    url: "https://drive.google.com/file/d/1qzKI4DKnyHRpXK1J3ATPqwaqLc0iNu-M/view"
    note: "Conceptual playbook framing loop engineering as replacing yourself as the person repeatedly prompting the agent."
  - title: "The Agent Loop Architecture"
    url: "https://www.inngest.com/blog/agent-loop-architecture"
    note: "Inngest article arguing that production loops need durable orchestration, step checkpoints, retries, run history, and observability."
  - title: "The Agent Loop Decoded"
    url: "https://blogs.oracle.com/developers/the-agent-loop-decoded-three-levels-every-agent-engineer-must-know"
    note: "Gentle recap of the inner ReAct-style agent loop: context assembly, reasoning, action, stop conditions, memory lifecycle, semantic tool discovery, and feedback loops."
  - title: "Loop Engineering"
    url: "https://x.com/mvanhorn/article/2063865685558903149?lang=en"
    note: "Recent framing that separates the loop ladder from ReAct, AutoGPT, ralph, /goal, and durable multi-agent orchestration loops."
  - title: "Peter Steinberger on loops prompting agents"
    url: "https://x.com/@steipete"
    note: "June 7, 2026 quote: do not prompt coding agents; design loops that prompt agents."
  - title: "Amazon Bedrock AgentCore"
    url: "https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html"
    note: "AgentCore framing for production agent primitives: Runtime, Memory, Identity, Gateway, built-in tools, Observability, Policy, Evaluations, and Optimization."
  - title: "mozilla-ai/cq"
    url: "https://github.com/mozilla-ai/cq"
    note: "Structured memory protocol for coding agents: query, propose, confirm, flag, scope, and promote agent-learned knowledge units."
---

Every coding-agent session already contains a loop.

You ask for a change. The model reads the request, inspects the repository, edits a file, runs a test, observes the failure, edits again, and keeps going until something looks done. That cycle of context, reasoning, action, observation, and retry is the basic agent loop.

But that is not yet loop engineering.

Loop engineering starts when the human stops being the clock. Instead of repeatedly deciding what to ask next, when to retry, what context to paste, which tool to run, and whether the result is good enough, we design the system that does those things deliberately.

That distinction matters because the industry is at risk of reducing "loop engineering" to either a prompt trick or a `while True` wrapper around an LLM. Both are too small. A loop that cannot remember what it did, cannot survive a restart, cannot tell whether it is stuck, and cannot find someone to say no is not production engineering. It is just automation with a large blast radius.

The most useful definition I have found is this:

> Loop engineering is harness engineering plus time.

A harness makes one agent run useful. It gives the model instructions, tools, permissions, context, and constraints. Loop engineering adds time: scheduling, state, verification, feedback, durable execution, budgets, and human boundaries. It turns a useful agent run into repeated operational behavior.

## A gentle recap on agents

Oracle's article [The Agent Loop Decoded](https://blogs.oracle.com/developers/the-agent-loop-decoded-three-levels-every-agent-engineer-must-know) gives a clean description of the inner loop:

```text
assemble context → invoke model → act → append trace → repeat until stop condition
```

That is the loop most developers meet first: the ReAct-shaped loop. An LLM receives a message and a list of tools. It chooses a tool, receives the output, reasons again, maybe calls another tool, and eventually returns a terminal response.

This is useful background, but it is not the newly coined sense of "loop engineering." It is the gentle recap before the real shift. ReAct describes how an agent turn works. Loop engineering asks who designs the repeated operating system around those turns.

This is already more than a single prompt. It is a tiny runtime. The harness has to decide what messages to send, which tools are visible, how tool results are appended, which failures are recoverable, and when the loop should stop.

The important point is that the model is not the system. The harness is the system.

The model reasons. The harness prepares context, executes actions, persists state, enforces limits, and decides when the model has gone in circles. If the harness is weak, the model can look impressive while the system remains fragile.

A minimal tool-calling loop is useful for self-contained work. It is not enough for long-running or repeated work. It has no durable state outside the context window. It starts cold. It repeats itself. It forgets decisions. It may confuse "I emitted no more tool calls" with "the user's goal is complete."

This is why I would not use the Oracle article as the proof that loop engineering is new. It explains the base agent mechanism. The newer concept starts when that mechanism becomes a component inside a larger loop: discovery, handoff, validators, memory, scheduling, and durable state.

That last distinction is subtle but important. A model can stop calling tools because it is finished, because it is stuck, because it is asking a clarifying question, or because the harness gave it no better option. A terminal message is not a proof of success. Goal completion belongs in the harness.

## One level up: the loop as an operating pattern

The stronger loop-engineering frame comes from the loop-engineering playbook, the [`cobusgreyling/loop-engineering`](https://github.com/cobusgreyling/loop-engineering) repository, and the recent conversation around "loops that prompt your agents." Peter Steinberger's formulation is the blunt version: "you shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents." Boris Cherny describes the same jump as moving from writing code, to prompting many Claude sessions, to writing the loops that prompt Claude.

That makes the ladder clearer:

1. **ReAct:** one model reasons, acts, observes, and repeats while a human watches.
2. **AutoGPT:** a goal-seeking loop prompts itself, but often spins without grounded verification.
3. **ralph:** a disciplined fixed-context loop repeatedly feeds an agent from anchor files instead of relying on an ever-growing chat.
4. **`/goal`:** productized ralph-style loops in tools such as Codex and Claude Code, where a smaller validator model decides whether the task is done.
5. **continuous orchestration:** loops become durable units of work that supervise other loops, run on schedules, recover from crashes, and manage state outside a terminal.

At this level the loop is no longer just tool calling inside one agent turn. It is a self-turning operating pattern:

```text
discovery → handoff → artifact → verification → persistence → scheduling
```

Each move solves a different problem.

**Discovery** decides what work exists. A daily triage loop looks for stale issues, failing checks, noisy alerts, or PRs waiting on a response. Without discovery, the human is still feeding the work queue.

**Handoff** turns discovered work into an agent task. This is where vague signals become concrete prompts, worktree assignments, issue updates, or bounded repair attempts. Without handoff, multiple agents collide or receive tasks too fuzzy to complete.

**Artifact** gives the loop something stable to test against. This might be a spec, plan, acceptance checklist, reproduction, failing test, trace, benchmark, fixture, policy, or design note. Without an artifact, the reviewer has to infer intent from vibes.

**Verification** gives the loop a way to hear "no." It might be a test suite, a linter, a policy check, a second agent, or a human reviewer. Without verification, the loop is just an agent approving itself.

**Persistence** carries consequences forward. State files, run logs, memories, issue comments, and workflow history prevent the loop from starting over every morning. Without persistence, the loop is amnesiac.

**Scheduling** makes the loop turn again. A cron, webhook, queue, or workflow engine wakes it up without someone pressing go. Without scheduling, it is still a manual agent session.

This is the jump from using an agent to designing an agent operating model.

The GitHub repo is useful because it makes this concrete. It is not only an essay. It has patterns such as Daily Triage, PR Babysitter, CI Sweeper, Dependency Sweeper, Changelog Drafter, Post-Merge Cleanup, and Issue Triage. It also includes the boring pieces that make the idea real: state shape, budgets, run logs, readiness audits, safety docs, deny lists, human gates, and kill switches.

That boring layer is the engineering.

## SDD still matters because reviewers need something to read

Spec-driven development is not the only way to build with agents, but it remains highly relevant to loop engineering because it creates artifacts that can be validated against. A spec, design note, acceptance list, test plan, or issue decomposition gives the loop an external object that is more digestible to humans than a proof system and more concrete than a chat transcript.

This is where SDD and formal verification can blend rather than compete. Formal methods are strongest when the property can be specified precisely. Human-readable specs are stronger when the work involves product intent, maintainability, taste, ambiguity, and trade-offs. A good loop can use both: a human-readable handoff to preserve intent, plus executable checks where the intent can be turned into tests, contracts, policies, or invariants.

That is also what an adversarial reviewer needs. A reviewer cannot do a proper context-free job of saying "no" unless the loop gives it something to compare the result against. If the only input is "the agent changed some files," the reviewer must rediscover the goal. If the input is "here is the discovered problem, here is the handoff, here are the acceptance criteria, here are the changed artifacts, here are the checks," the reviewer can be adversarial in a useful way.

So I think the crucial aspect is exactly this: loop engineering moves the human's effort to the front of the system. The human does discovery, defines the handoff, names the artifact, and decides what counts as evidence. One version of that is a **harness loop**: Codex `/goal`, Claude Code, Hermes, or another agent shell running as a single agent with the operator's configured machine permissions, bounded by product controls such as auto-mode classifiers, tool policies, and approval gates. That is the right shape when the loop is amplifying one engineer's session.

A different version is an **agent platform loop**. This is the AgentCore-shaped case: agents run as deployed workloads with their own runtime, memory, identity, gateway, observability, policy, tools, evaluations, and optimization surface. That is the right shape when the agent is no longer just borrowing a developer shell, but acting as part of a governed multi-agent system with its own identity, access boundaries, traces, and operational lifecycle. The article is still about loop engineering, not AgentCore specifically, but the pillar list is useful because it names the organs a loop needs once it leaves the interactive harness and becomes infrastructure.

The difference is not "real agent" versus "fake agent." It is two deployment contexts. A harness loop turns one operator's intent into a bounded autonomous run. An agent platform loop turns an autonomous workload into something the organization can identify, route, observe, govern, evaluate, and improve.

## The useful loop has a skeptic in the path

The repeated warning across the material is simple: do not let the generator grade its own homework.

A model asked to produce something and then judge whether it did a good job will often praise its own output. That is not because the model is malicious. It is because generation and evaluation are different jobs. The generator is optimized to keep moving. The evaluator must be optimized to stop motion when the result is wrong.

A mature loop therefore separates the maker from the checker.

For code, the checker should not be only a test suite, type checker, security scan, policy engine, or CI result. Those are necessary, but they are not enough by themselves. If the same model can write the code, see the expected output, modify the tests, and iterate only against linter or CI feedback, it can learn to satisfy the visible cases instead of solving the underlying problem. The loop has accidentally trained it to pass the scoreboard.

That is why code loops also need adversarial review. A reviewer agent should start from a fresh context, reload the original artifact, acceptance criteria, constraints, and changed files, and ask whether the implementation really satisfies the intent. The strongest version keeps some checks black-box: the builder cannot edit them, and sometimes cannot even see them. Then the builder has to modify the system under test rather than sculpting the test surface around its answer. How far you can push this depends on whether you can seed good hidden cases, property checks, fixtures, or scenario tests in advance.

For text, the checker might be a second model with a stricter rubric. For operations, it might be an allowlist, approval gate, or incident policy. For high-risk work, it is a human.

The key is that something outside the optimistic generation path can say no, and that the thing saying no is not merely reflecting the same visible target the generator optimized against.

This leads to a useful rule of thumb:

> The cheapest loop is an agent nodding at itself. The useful loop has a skeptic in the path.

But the skeptic needs a brief. "Be adversarial" is not enough. The skeptic needs the handoff, the intended artifact, the acceptance criteria, the relevant constraints, and the traces of what happened. Otherwise the adversarial review becomes either shallow nitpicking or an expensive rediscovery pass.

That skeptic does not have to block everything. In fact, good loops usually start with report-only behavior. They discover work, write a summary, record state, and ask for review. Only after the loop has a track record should it make small changes. Only after those changes are consistently boring should it get broader autonomy.

Autonomy is not a boolean. It is a budgeted permission set that the loop earns.

## Memory is not a bigger prompt

The Oracle article's strongest contribution is its treatment of memory as a lifecycle rather than a pile of context.

It distinguishes a memory-augmented agent from a memory-aware agent. A memory-augmented agent retrieves information and injects it into the prompt. A memory-aware agent actively manages memory: reading, writing, summarizing, forgetting, resolving entities, storing workflow patterns, and deciding when full detail is needed.

That distinction matters because bad memory is worse than no memory. Stale facts mislead the loop. Noisy retrieval bloats the prompt. A giant list of tool schemas degrades tool selection. Old tool outputs consume tokens long after their usefulness has passed.

So memory needs structure.

Conversational memory helps the loop know what happened in this thread. Knowledge memory stores facts and source material. Workflow memory stores procedures that worked before. Entity memory resolves names and systems. Summary memory compresses long histories without deleting the original record. Tool logs preserve raw outputs outside the prompt and replace them with compact references.

This is a much better mental model than "just add RAG."

For loop engineering, memory is the loop's ability to carry consequences forward. It is how the loop avoids repeating the same failed attempt. It is how it remembers that a human rejected a previous approach. It is how it notices that a CI failure has been flaky for three days rather than treating every run as new.

Memory is not a bigger prompt. Memory is operational continuity.

This is where Mozilla's [`cq`](https://github.com/mozilla-ai/cq) project points toward a more interesting future. `cq` treats agent memory less like shared RAG and more like a lifecycle-managed record of things agents have learned. A remembered fact is not merely embedded text. It has a shape: what happened, why it matters, what a future agent should do, where the advice applies, how confident the system is, when it was first observed, when it was last confirmed, whether it has been disputed, and whether it should remain local, graduate to team memory, or become public knowledge.

That `summary / detail / action` split is the important move. A memory that only says "this API failed before" is a note. A memory that says "this API returns a misleading 200 when the payload is malformed; verify the response body before assuming success; add a regression fixture for the malformed case" is operational guidance. It can change the next loop's behavior.

The future-looking capability is not just better recall. It is **memory with a lifecycle**:

- **Applicability**: domains, languages, frameworks, repository areas, and patterns tell the loop when a memory is relevant and when it is cargo cult.
- **Evidence**: confidence, confirmations, first-observed, and last-confirmed timestamps tell the loop whether the memory is fresh, battle-tested, or merely a single anecdote.
- **Dispute state**: flags for stale, incorrect, or duplicate knowledge let future agents challenge memory instead of blindly amplifying it.
- **Replacement**: supersession links let old guidance point to newer guidance rather than lingering forever in semantic search.
- **Scope**: local, private/team, and public tiers keep machine-specific or organization-specific lessons from leaking into global defaults.
- **Provenance**: created-by and review metadata make memory auditable, which matters once agents start learning from other agents.
- **Evolution**: typed extensions and future lifecycle fields leave room for memory schemas to grow without turning every note into an unstructured blob.

The most useful taxonomy in the `cq` architecture is also a warning about memory lifetimes. Some memories are **pitfalls**: durable warnings that should stay visible. Some are **workarounds**: useful now, but really symptoms of missing tooling. Some become **tool recommendations**: stop doing the workaround and use the tool. And enough repeated workarounds become a **tool gap signal**: a product or platform team should build something better. That means a memory system should not only retrieve old advice. It should help decide whether old advice deserves to persist.

Without that lifecycle, memory creates a new failure mode: cargo-cult memory. The loop retrieves stale or overgeneralized guidance because it semantically matches the task, then applies it with high confidence because it came from "memory." The fix is not a bigger vector database. The fix is verification, confidence, timestamps, flags, supersession, scope, and promotion rules.

In other words: loop memory should become less like a scrapbook and more like a governed knowledge base for future action.

## Durable execution is where the demo becomes infrastructure

Inngest's [The Agent Loop Architecture](https://www.inngest.com/blog/agent-loop-architecture) asks the next question: what runs the loop?

A local `/loop` command or a long-running process can be enough for experiments. It is not enough for production. Processes die. Deploys restart. Containers get rescheduled. APIs timeout. LLM calls fail. A retry might accidentally send the same Slack message twice or rerun an expensive model call from the beginning.

The Inngest article frames production agent architecture as three layers:

```text
loop → skill → orchestrator
```

The loop is the trigger and decision-maker. The skill is the durable workflow it calls. The orchestrator is the substrate that schedules runs, checkpoints steps, retries failures, controls concurrency, and records history.

The checkpointing point is the important one. If step three of a five-step workflow fails, retry step three. Do not rerun steps one and two, re-call the model, re-send notifications, and hope the side effects line up.

This is both a correctness feature and a cost feature. A retry that repeats prior LLM calls is a token leak. At small scale that is annoying. At loop scale it becomes architecture.

A loop that cannot survive a restart is not yet production infrastructure.

## Observability is the trust layer

When humans write code, we can ask them what they intended. When an agent writes code, deploys a skill, or makes a decision at 3 a.m., the trace becomes the story.

A useful loop needs run history: what woke it up, what context it assembled, what tools it called, what outputs came back, what it changed, what it skipped, what it retried, what it escalated, and how much it cost.

Logs alone are usually not enough. Logs are text streams. A loop needs operational records: run IDs, step names, inputs, outputs, retry counts, decisions, artifacts, and links back to external systems.

This is why durable execution and observability belong together. Every checkpoint is also an observation point. If the orchestrator records the step, the developer can inspect the loop after the fact. If the loop's actions are not inspectable, trust decays quickly.

The developer's job does not disappear. It changes shape. Instead of manually prompting every turn, the developer tends the garden: checking overnight runs, reading samples, pruning bad skills, tightening gates, adjusting budgets, and deleting loops that no longer pay for themselves.

The agent may author a skill. The team still owns it.

## Loops amplify judgment

The most human-centered warning in the research is that loops make generation cheap while leaving judgment scarce.

That is the real risk. Not that the agent will suddenly become evil. That is too theatrical. The normal failure is quieter: the loop produces more code than anyone reads, more summaries than anyone verifies, more alerts than anyone trusts, and more confident motion than the team can absorb.

The loop did not remove the need for judgment. It multiplied the consequences of the judgment encoded into it.

This is why loop engineering can go in opposite directions. A strong engineer can encode good taste, useful constraints, sharp verifiers, careful budgets, and escalation paths. The loop then scales judgment they already had.

Another team can use the same mechanics to avoid thinking. They let the loop run because it usually works. They stop reading samples. They stop asking whether the work matters. They treat the absence of a failed check as approval. Six months later the system is full of code no one understands.

Same loop shape. Opposite outcome.

Loop engineering is not the abdication of engineering judgment. It is the encoding, scheduling, and auditing of that judgment.

## Failure modes worth naming

Good vocabulary helps because loops fail in patterns.

A **nodding loop** approves its own work. It has no independent verifier.

An **amnesiac loop** forgets prior runs. It has no durable state.

A **manual loop** still depends on the human to press go. It has no trigger or schedule.

A **blind loop** waits for the human to supply every task. It has no discovery.

A **tangled loop** lets parallel agents collide in the same files, tickets, or services. It has no isolation or concurrency control.

A **stuck loop** repeats the same tool call or oscillates between two states. It has no progress detector.

A **fragile loop** restarts from scratch after a crash. It has no checkpointing.

A **spendthrift loop** grows cost silently. It has no budget, token monitoring, or early exit path.

A **surrender loop** keeps moving while humans stop understanding what it is doing.

These names are useful because each points to a missing organ. The fix is rarely "use a smarter model." The fix is usually better harness design: explicit stop conditions, better state, a separate evaluator, scoped tools, durable retries, concurrency limits, or a human gate.

## A practical checklist

Before trusting a loop, I would want answers to these questions:

1. What work does the loop discover?
2. How is that work converted into an agent task?
3. What context is loaded automatically?
4. What context can the agent request on demand?
5. What state survives the run?
6. Which tools are visible, and why?
7. Which tools are forbidden?
8. What artifact captures the intended outcome?
9. Who or what can say no?
10. What proves the goal is complete?
11. What stops repeated tool calls or oscillation?
12. What happens when a step fails?
13. What happens when the process restarts?
14. What is the token or money budget?
15. What is logged per run?
16. When does the human enter the loop?
17. How do we pause or kill it?

If those questions feel heavy, that is a signal. The first loop should be small enough that the answers are boring.

Start with report-only. Add state. Add a verifier. Add a budget. Add gates. Let it run for a week. Read samples. Only then consider letting it make small changes. Never skip straight to unattended action on a production system because the demo looked good once.

## The loop is the new unit of work

Prompts produce outputs. Loops produce behavior.

That is why loop engineering feels like a real shift. It is not a new magic word for prompt engineering. It is the point where agent work starts looking like systems work again: state, scheduling, orchestration, retries, observability, cost control, and accountability.

The model still matters. Better models make better decisions inside the loop. But the loop is what preserves the value of those decisions over time. It is what keeps useful behavior alive when the model changes, the process restarts, or the human walks away.

The moat is not the model by itself. The moat is the governed loop: the memory, skills, verifiers, traces, and human judgment encoded around repeated model action.

Loop engineering is not about giving an LLM a longer prompt.

It is about building a stateful, durable, observable, governable system around repeated model action.
