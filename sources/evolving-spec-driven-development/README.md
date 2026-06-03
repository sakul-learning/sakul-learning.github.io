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
- Local downloaded export:
  - Markdown: `/data/chatgpt-shares/chatgpt-share-6a1f652e-9b24-83ec-8cae-f6fbe0bccc2f.md`
  - HTML: `/data/chatgpt-shares/chatgpt-share-6a1f652e-9b24-83ec-8cae-f6fbe0bccc2f.html`
  - Markdown spot check: 24,317 bytes, 919 lines.
  - Title: "Spec Driven Review Process".
- Key ideas from the conversation:
  - Spec review should be treated as a first-class SDD quality function, not as an informal prelude to code review.
  - Primary Product Owner review question: "Does this document create a coherent, executable path from intent to delivery while minimizing ambiguity, risk, waste, and future rework?"
  - Product Owner review looks for implicit intent, ambiguous/missing/contradictory requirements, terminology inconsistencies, muddled concepts, downscope opportunities, phase boundaries, dependencies between workstreams, assumptions, roadmap impacts, and stakeholder gaps.
  - Multi-angle review list: Product Owner, Architecture, Security, QA/Test Strategy, Operations/SRE, Cost/FinOps, Product Strategy, UX, Program/Delivery, Constitution, Roadmap, and Data.
  - Dynamic workflow entrypoint should discover which artifacts exist (`spec.md`, `plan.md`, `quickstart.md`, constitution, roadmap, etc.), then ask which artifacts and reviewers are in scope.
  - Review must still be possible when only `spec.md` exists; missing artifacts are missing context, not automatic failure.
  - Shared reviewer contract: ground findings in artifact sections, use web/docs lookup for current external guidance, prefer clarification over assumption, prefer scope reduction over expansion, prefer phased delivery over large-batch delivery, validate against constitution and roadmap when available.
  - Finding shape: reviewer, severity, artifact, location, evidence, issue, impact, suggested resolution, question for user, recommended answer.
  - Use Matt Pocock's `grill-me` discipline for unresolved decisions: walk the decision tree one branch at a time, ask one question at a time, provide a recommended answer, and inspect artifacts/code instead of asking when discoverable.
- Article use:
  - Added a new section, "Spec review becomes a first-class workflow," and revised the human-steering/loop sections to include reviewer selection, artifact scope, multi-angle review, and one-question-at-a-time ambiguity resolution.

## Argument structure

1. Recap previous SDD baseline: spec as bridge between research and development.
2. Explain why AI agents require stronger workflow structure: high-throughput ambiguity amplification.
3. Introduce Specledger as a platform that treats SDD as collaboration/coordination infrastructure.
4. Use `.agents/commands` as concrete evidence for lifecycle shape.
5. Add the downloaded ChatGPT conversation's missing layer: spec review is its own multi-angle workflow.
6. Use Skillrig workflow prompts to show evolution from linear commands to deterministic multi-agent workflow.
7. Emphasize human steering points and decision quality.
8. Explain ledger/memory value: deltas, checkpoints, session indexing, reusable context.
9. Note tension between speed and durable traceability; propose calibrated traceability.
10. Conclude: future SDD is shared workflow infrastructure, not more static documentation.

## Open review questions

- Should the article include specific screenshots or UI details from the Specledger dashboard? Current draft only uses extracted product-site text.
- Should the direct Product Owner review question be quoted as-is in the final article, or paraphrased as a working framing?
- Should the article compare Specledger to GitHub Issues/Jira/Linear or avoid competitive framing?
- Should the article mention the current CLI command names as examples only, or present them as the recommended SDD sequence?
