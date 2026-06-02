# Source notes: Evolving Spec-Driven Development

Draft created: 2026-06-02

## Working thesis

Spec-driven development is evolving from static specifications into shared workflow infrastructure. The next useful frame is not "write better docs for AI" but "maintain a collaborative ledger of intent" where humans, stakeholders, and AI agents can coordinate around requirements, plans, deltas, checkpoints, reviews, sessions, and implementation evidence.

## Primary sources inspected

### Specledger product site

- URL: https://specledger.io
- Page title: "Specledger - Spec-Driven Development Platform for AI-Assisted Engineering"
- Key claims and framing:
  - "The Single Source of Truth for Spec-Driven Development"
  - surfaces critical human decision points early and clearly
  - keeps engineers, stakeholders, and AI agents aligned from requirements to implementation
  - platform features include Spec-Driven Development, Human Dashboards, Spec Deltas & Checkpoints, Session Indexing, One Command Bootstrap, and Multi-Repo Native workflows
  - core principles: Specs First, Code Second; Every Change Leaves a Trail; Humans Steer, AI Executes; Context Compounds
- Article use:
  - Support for the platform thesis: SDD needs collaboration, traceability, decision visibility, session memory, and multi-repo coordination.

### specledger/specledger GitHub repository

- URL: https://github.com/specledger/specledger
- Local inspection path: `/tmp/sdd-specledger.sLFIZl/specledger`
- Focus requested by user: `.agents/commands` prompts.
- Command files found:
  - `specledger.checklist.md`
  - `specledger.checkpoint.md`
  - `specledger.clarify.md`
  - `specledger.constitution.md`
  - `specledger.implement.md`
  - `specledger.onboard.md`
  - `specledger.plan.md`
  - `specledger.specify.md`
  - `specledger.spike.md`
  - `specledger.tasks.md`
  - `specledger.verify.md`
- Observed workflow sequence:
  - constitution → specify → clarify → plan → tasks → verify → implement → checkpoint, with checklist/spike/onboard as supporting workflows.
- Key command details:
  - `specledger.specify`: starts feature development from natural language; creates/updates a structured feature spec; handoffs to plan/clarify.
  - `specledger.clarify`: asks up to five targeted clarification questions and encodes answers back into the spec.
  - `specledger.plan`: builds technical planning artifacts from the spec and constitution.
  - `specledger.tasks`: generates actionable, dependency-ordered tasks, organized by user story and backed by `sl issue` entries.
  - `specledger.verify`: read-only cross-artifact verification across spec, plan, and tasks; checks consistency, ambiguity, coverage, and constitution conflicts.
  - `specledger.implement`: executes tasks from `tasks.md`.
  - `specledger.checkpoint`: critical divergence review comparing implementation against plan artifacts.
  - `specledger.spike`: time-boxed research, saved under the current spec's research folder.
- Article use:
  - Evidence that Specledger operationalizes SDD as a lifecycle, not a one-off document.

### skillrig/cli GitHub repository

- URL: https://github.com/skillrig/cli
- Local inspection path: `/tmp/sdd-specledger.sLFIZl/skillrig-cli`
- Focus requested by user: similar `.agents/commands` path and improved `specledger.implement-workflow` prompt.
- Command files found:
  - all base Specledger commands listed above
  - additional workflow variants:
    - `specledger.implement-workflow.md`
    - `specledger.implement-workflow-v2.md`
    - `specledger.verify-workflow.md`
    - `specledger.checkpoint-workflow.md`
- `specledger.implement-workflow` observations:
  - experimental deterministic multi-agent Workflow
  - reads design artifacts from `FEATURE_DIR`: plan, research, data-model, contracts, quickstart
  - deliberately skips durable `sl issue` ledger for a smaller/faster quickstart path
  - dependency-ordered pipeline: Scaffold → Primitives → Operations → CLI → Tests → Verify
  - requires every subagent prompt to begin with `SKILLS:` so repository-specific implementation knowledge is loaded before coding
  - final report must include files written, final `make check` result, and remaining failures
- `specledger.verify-workflow` observations:
  - read-only artifact verification without `tasks.md`
  - fans out multiple independent reviewers and merges findings
  - checks coverage, reverse traceability, consistency, and decision integrity
  - explicitly notes independent reviewers catch different issues
- `specledger.checkpoint-workflow` observations:
  - adversarial post-implementation divergence review
  - compares actual implementation and tests against spec/plan/data-model/quickstart expectations
  - classifies divergences by severity
- Article use:
  - Evidence for the next SDD evolution: not just command-by-command execution, but deterministic multi-agent workflows with independent review and post-implementation divergence checks.

### Prior article: Spec-Driven Development and Specifications

- URL: https://sakul-learning.github.io/2026/06/01/spec-driven-development-and-specifications/
- Main findings reused:
  - research discovers the target
  - specifications make the definition of good inspectable
  - development executes against the target
  - feedback keeps the system honest
  - AI agents make specs more important because cheap code generation amplifies unclear intent
  - spec quality determines safe autonomy/leash length
- Article use:
  - Establishes the old baseline before presenting the new "spec as ledger" evolution.

### ChatGPT shared conversation

- URL: https://chatgpt.com/share/6a1f652e-9b24-83ec-8cae-f6fbe0bccc2f
- Accessibility check:
  - Page reachable via `web_extract` and direct HTTP fetch.
  - Title found: "ChatGPT - Spec Driven Review Process".
  - Direct extraction returned only the title and generic page shell, but direct HTML fetch returned a large page payload (~497 KB) with embedded share data and visible signals around "workflow", "review", "slash command", and Claude Code command/search context.
- Caveat:
  - The full turn-by-turn conversation text was not cleanly extractable with the simple web extraction pass; avoid making detailed claims that depend on exact unseen turns.
- Article use:
  - Safe to cite as reachable shared context titled "Spec Driven Review Process" and as general background for command/review workflow direction, not as a source for precise quotations unless manually extracted later.

## Argument structure

1. Recap previous SDD baseline: spec as bridge between research and development.
2. Explain why AI agents require stronger workflow structure: high-throughput ambiguity amplification.
3. Introduce Specledger as a platform that treats SDD as collaboration/coordination infrastructure.
4. Use `.agents/commands` as concrete evidence for lifecycle shape.
5. Use Skillrig workflow prompts to show evolution from linear commands to deterministic multi-agent workflow.
6. Emphasize human steering points and decision quality.
7. Explain ledger/memory value: deltas, checkpoints, session indexing, reusable context.
8. Note tension between speed and durable traceability; propose calibrated traceability.
9. Conclude: future SDD is shared workflow infrastructure, not more static documentation.

## Open review questions

- Should the article include specific screenshots or UI details from the Specledger dashboard? Current draft only uses extracted product-site text.
- Should the ChatGPT share be quoted directly? Need deeper extraction or user-provided excerpts before making exact claims.
- Should the article compare Specledger to GitHub Issues/Jira/Linear or avoid competitive framing?
- Should the article mention the current CLI command names as examples only, or present them as the recommended SDD sequence?
