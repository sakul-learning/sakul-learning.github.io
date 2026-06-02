---
layout: post
title: "Evolving Spec-Driven Development"
summary: "Spec-driven development is moving from static documents toward shared ledgers of intent: collaborative, traceable workflows where humans steer and AI agents execute against versioned specifications."
tags: [spec-driven-development, specledger, ai-agents, software-engineering, workflows]
source_folder: sources/evolving-spec-driven-development
sources:
  - title: "Specledger"
    url: "https://specledger.io"
    note: "Product site describing Specledger as a spec-driven development platform for shared requirements, dashboards, deltas, checkpoints, session indexing, and AI-assisted execution."
  - title: "specledger/specledger"
    url: "https://github.com/specledger/specledger"
    note: "Public Specledger CLI repository inspected for the .agents/commands workflow prompts and CLI capabilities."
  - title: "skillrig/cli"
    url: "https://github.com/skillrig/cli"
    note: "Public CLI repository inspected for improved experimental Specledger workflow prompts, especially implement-workflow, verify-workflow, and checkpoint-workflow."
  - title: "Spec-Driven Development and Specifications"
    url: "https://sakul-learning.github.io/2026/06/01/spec-driven-development-and-specifications/"
    note: "Earlier article establishing the core SDD argument: research discovers the target, specifications make it inspectable, development executes against it, and feedback keeps the system honest."
  - title: "ChatGPT shared conversation: Spec Driven Review Process"
    url: "https://chatgpt.com/share/6a1f652e-9b24-83ec-8cae-f6fbe0bccc2f"
    note: "Shared ChatGPT conversation page was reachable and titled 'Spec Driven Review Process'; accessible page data also included discussion/search context around slash commands, workflows, review, and Claude Code command patterns."
---

> Draft status: unpublished working draft. The argument is source-grounded but should be reviewed before publishing, especially the exact positioning of Specledger's hosted collaboration features versus the local CLI workflows.

## Short summary

The first version of spec-driven development is easy to describe: write down what good looks like before asking people or agents to build it.

That remains true, but it is no longer enough.

As AI-assisted engineering gets more capable, the specification stops being a passive document. It becomes shared infrastructure: a durable place where teams record intent, surface decisions, coordinate human review, route work to agents, detect drift, and learn from implementation.

That is the direction [Specledger](https://specledger.io) points toward. It frames SDD as a collaborative platform rather than a folder of documents: requirements, design, implementation, checkpoints, session history, dashboards, deltas, and human decision points all tied back to a shared source of truth.

The evolution is from **spec as document** to **spec as ledger**.

## The old SDD baseline

In the earlier article, I described spec-driven development as the bridge between research and development.

Research discovers what good looks like. Specifications make that definition inspectable. Development executes against it. Feedback keeps the system honest.

That model is still the foundation. A useful specification turns vague intent into something people can review:

- What problem are we solving?
- What behavior matters?
- What is explicitly out of scope?
- What constraints are non-negotiable?
- What examples prove the work is correct?
- What risks or assumptions still need validation?

This already makes software development better because it moves feedback earlier. It is cheaper to fix a sentence than a production incident.

But AI agents change the pressure on the process.

If a human misreads vague intent, the team may lose a day. If a powerful agent misreads vague intent, it can produce a large, plausible, internally consistent wrong implementation very quickly. Cheap code generation makes the quality of the target more important, not less.

So SDD needs to evolve beyond "write a spec, then implement." It needs an operating model for collaboration.

## Specledger's useful reframing

Specledger's product language is direct: it wants to be the single source of truth for spec-driven development. The important part is not just that it manages specs. The important part is that it treats SDD as a coordination problem.

The platform emphasizes:

- **human dashboards** for tracking, reviewing, and steering AI collaboration
- **spec deltas and checkpoints** so changes leave a trail
- **session indexing** so AI work becomes reusable organizational context
- **multi-repo support** for features that do not fit neatly inside one repository
- **CLI bootstrap and agent compatibility** so the workflow can live inside normal engineering tools

That is a stronger framing than "documentation for AI." Documentation is something you read. A ledger is something teams use to coordinate, audit, and reconcile reality.

In a serious AI-assisted workflow, the core question is not "can the agent write code?" The question is "can the team keep intent, implementation, review, and future memory aligned while the agent writes code?"

Specledger is interesting because it attacks that alignment problem directly.

## The command prompts show the workflow shape

The most concrete evidence is in the repositories' `.agents/commands` prompts.

The standard Specledger command set looks like a complete SDD lifecycle:

1. `/specledger.constitution` establishes project principles.
2. `/specledger.specify` turns a natural language feature description into a structured spec.
3. `/specledger.clarify` asks targeted questions and writes the answers back into the spec.
4. `/specledger.plan` turns the spec into architecture, stack choices, phases, and design artifacts.
5. `/specledger.tasks` creates dependency-ordered implementation work, backed by the `sl issue` tracker.
6. `/specledger.verify` checks consistency across `spec.md`, `plan.md`, and `tasks.md` before implementation.
7. `/specledger.implement` executes the task plan.
8. `/specledger.checkpoint` performs a critical divergence review between implementation and plan.
9. `/specledger.spike` gives uncertainty a first-class research workflow.
10. `/specledger.checklist` creates focused review checklists.
11. `/specledger.onboard` walks a user through the whole process.

That sequence matters because it is not just a prompt library. It is an attempt to make the implicit engineering loop explicit.

The commands repeatedly encode the same pattern:

- discover the current feature context with `sl spec info`
- read the generated artifact before editing it
- treat the constitution as authoritative
- preserve handoffs between phases
- make missing context visible instead of hallucinating it
- map requirements to design, tasks, and tests
- verify consistency before implementation
- checkpoint divergence after implementation

This is SDD becoming operational.

## From linear commands to collaborative workflows

The improved prompts in `skillrig/cli` push the idea further.

The experimental `specledger.implement-workflow` command intentionally skips the durable issue ledger for a faster path, then launches a deterministic multi-agent implementation workflow. The pipeline is not random fan-out. It is dependency ordered:

- scaffold the public API first
- implement primitives in parallel where files are disjoint
- implement operations once primitives exist
- wire the CLI
- add tests
- verify and repair until checks pass
- synchronize documentation

The prompt is opinionated about how to use agents safely. Every subagent prompt must begin with a `SKILLS:` line, because the design artifacts say what to build while skills carry how the repository builds things. It also insists on final verification through `make check`.

That is a useful evolution. A spec alone can tell an agent the goal. A workflow tells the agent system how to divide labor without losing the goal.

The paired `specledger.verify-workflow` command is even more revealing. It verifies artifacts without `tasks.md` by sending multiple independent reviewers through the same spec, plan, research, data model, contracts, and quickstart. The prompt explicitly says independent reviewers catch different problems, then merges the findings into one report.

That is a mature SDD pattern:

> Do not trust one confident pass. Use independent review to detect drift, stale wording, missing coverage, and contradictions before implementation starts.

The `checkpoint-workflow` prompt then closes the loop after implementation. It takes an adversarial reviewer stance: assume the implementation has gaps until proven otherwise. It compares actual code and test results against the planned artifacts and classifies divergences.

This is the loop becoming inspectable:

1. specify intent
2. clarify decisions
3. plan implementation
4. verify artifacts
5. execute workflow
6. checkpoint divergence
7. update the spec or fix the implementation

## A platform for shared SDD workflows

This is where Specledger's platform angle becomes important.

A local `.agents/commands` directory can encode a good workflow for one repository. But real SDD is social. Requirements come from users, product, design, engineering, security, QA, operations, and previous implementation history. If the workflow only lives in one agent's context window, it is fragile.

A shared platform can give teams several things that plain prompt files cannot fully provide:

- a common place to review requirements and decisions
- durable checkpoints that survive chat sessions
- traceability from spec changes to implementation changes
- visibility into which decisions were human-made and which were agent-proposed
- session indexing so prior work becomes searchable context
- multi-repo coordination for features that cross service boundaries
- shared workflow conventions across teams and tools

That is why the phrase "ledger" is useful. A ledger is not just storage. It records changes in a way that can be inspected later.

For AI-assisted development, that is the difference between "the agent did something" and "the team can explain why the system changed."

## The human role moves to decision quality

This also changes the human role.

In a naive agent workflow, the human asks for code, waits, and reviews the result. That is a weak loop because the most important decisions may already be buried inside generated implementation.

In an evolved SDD workflow, humans steer earlier:

- approve or correct requirements
- resolve clarifying questions
- review tradeoffs in the plan
- decide when ambiguity is acceptable
- choose which risks need spikes
- inspect verification findings before implementation
- checkpoint divergence after implementation

The agent still executes, but execution is surrounded by decision points.

This matches Specledger's stated principle: humans steer, AI executes. The value is not that humans micromanage every line of code. The value is that humans keep authority over intent, tradeoffs, and acceptance.

## SDD as organizational memory

The next step is memory.

A single spec helps one feature. A ledger of specs, decisions, checkpoints, sessions, and deltas helps the organization learn.

That matters because many engineering failures are not novel. Teams rediscover the same constraints, repeat the same architectural arguments, forget why a tradeoff was chosen, or lose context when a chat session ends.

Specledger's session indexing and context-compounding language points at this deeper value. If every feature leaves behind a structured trail, future agents and future humans can start from a better place:

- previous decisions are easier to find
- old assumptions can be challenged explicitly
- recurring review failures can become checklist items
- stable implementation patterns can become skills
- cross-repo dependencies can be made visible instead of tribal

The spec becomes more than a pre-code artifact. It becomes part of the team's long-term memory.

## The tension: speed versus durability

The `skillrig/cli` workflow prompts also expose a healthy tension.

The experimental implementation workflow says it skips the durable `sl issue` ledger because the quickstart is intentionally smaller. That is a real tradeoff. Sometimes a team wants the full traceable workflow. Sometimes it wants a faster, bounded, deterministic workflow that still reads the design artifacts and gates on checks.

This is probably where SDD will keep evolving.

Not every feature needs the same amount of ceremony. A tiny bug fix does not need the same ledger as a multi-repo payment integration. But every workflow still needs a way to preserve the right amount of intent, verification, and review.

The mature version of SDD is not maximum documentation. It is calibrated traceability.

Use more ledger when the risk, ambiguity, or coordination cost is high. Use lighter workflows when the target is already clear. But do not remove the feedback loop.

## Why this matters for AI engineering

AI makes implementation faster, but it does not make intent obvious.

That creates a new bottleneck:

> The scarce resource is not generated code. The scarce resource is shared, inspectable, correct intent.

Spec-driven development began as a way to make intent explicit. Platforms like Specledger suggest the next stage: make intent collaborative, traceable, reviewable, executable, and memorable.

The practical shape is emerging:

- specs define behavior
- plans connect behavior to architecture
- tasks or workflows divide execution
- verification checks alignment before code
- checkpointing checks divergence after code
- dashboards and deltas keep humans in the steering loop
- session indexes and skills let context compound

That is how SDD evolves from a writing habit into an engineering system.

## Conclusion

The future of spec-driven development is not simply better prompts or longer requirements documents.

It is shared workflow infrastructure.

Specledger is interesting because it treats SDD as a collaborative ledger of intent: a place where humans, AI agents, specs, plans, issues, checkpoints, reviews, and sessions can stay aligned.

That is the right direction for agentic software development. The more capable the agents become, the more important it is to know what they are supposed to optimize for, who approved the tradeoffs, how divergence is detected, and what the team learns from each loop.

The spec is no longer just where clarity lives.

It is where collaboration, control, and memory begin.
