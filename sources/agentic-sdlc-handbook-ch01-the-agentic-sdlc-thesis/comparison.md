# Comparison: PROSE and the outer loop

**Scope:** This compares only Chapter 1, *The Agentic SDLC Thesis*, with Sakul Learning's **outer-loop** and **identity/authorization** articles. It does not attribute claims from later Handbook chapters to Chapter 1.

## Executive conclusion

The models are complementary, not competing.

> **PROSE makes bounded agent work more dependable. The outer loop makes consequential advancement governable and answerable.**

Chapter 1's PROSE framework is primarily about the epistemic and execution conditions of agent work: relevant context, task size, composition, instruction hierarchy, and safety boundaries. The outer loop is primarily about organizational consequence: evidence, verdicts, accountable ownership, durable workflow state, identity, delegation, and narrowly bounded authorization.

An agent can satisfy PROSE and still lack authority to merge or deploy. A workflow can preserve approvals and still receive a poor candidate if the agent was given the wrong context. Reliable agentic delivery needs both planes.

## Source claims retained from Chapter 1

The chapter argues that complex-codebase agent failures are structurally caused by:

1. **Finite, fragile context** — larger context windows do not make indiscriminate context loading safe.
2. **Implicit knowledge** — undocumented architecture, conventions, and decisions are invisible to agents.
3. **Probabilistic output** — reliability must come from constraints, structure, and grounding rather than model confidence.

It proposes **PROSE**:

| Constraint | Primary concern |
| --- | --- |
| **Progressive Disclosure** | Relevant context arrives just in time, not all at once. |
| **Reduced Scope** | Work fits within effective context capacity. |
| **Orchestrated Composition** | Simple primitives compose instead of one monolithic agent prompt. |
| **Safety Boundaries** | Autonomy is constrained by guardrails. |
| **Explicit Hierarchy** | Global-to-local guidance narrows with the task. |

The chapter candidly limits its evidence: the primary implementation evidence is one public PR/case study by the methodology's creator, not independent enterprise-scale replication.

## Mapping to the outer loop

| PROSE constraint | Closest outer-loop counterpart | Alignment | Difference that matters |
| --- | --- | --- | --- |
| Progressive Disclosure | Stage input, evidence brief, durable artifacts | Both reject indiscriminate information loading. | PROSE optimizes what an **agent needs now**; the outer loop optimizes what a **decision-maker must reconstruct later**. Relevance is not auditability. |
| Reduced Scope | Small slices, file/time/change budgets, risk routing | Both make work bounded and inspectable. | PROSE bounds work to preserve cognitive reliability; the outer loop also bounds blast radius, review burden, and remediation responsibility. |
| Orchestrated Composition | Durable stages for investigate, implement, verify, approve, deploy | Both reject monolithic runs. | Composition alone does not create authority separation. The outer loop requires different rights and decision rules per stage. |
| Safety Boundaries | Least privilege, JIT elevation, approval broker, cancellation, CI/policy gates | Strong overlap on constrained autonomy. | Chapter 1 does not define identity provenance, delegation, credential minting, verdict semantics, or target-side enforcement. |
| Explicit Hierarchy | Policy inheritance, risk policy, authority envelope, escalation | Both make constraints scoped and explicit. | PROSE hierarchy is about **which instructions apply**. Outer-loop hierarchy is about **who may authorize what**. A local rule is not an authorization grant. |
| Transparency | Quality evidence, answerability, process truth | Both value inspectable systems. | PROSE makes agent behavior explainable; the outer loop also asks why the consequence was allowed, by whom, and what happens if it was wrong. |

## Alignment and overlap

### Reliability is an architectural property

Both frameworks reject the belief that a stronger model alone produces trustworthy delivery. Each puts system design around the model: constraints, structured work, observability, and feedback.

### Small, composable work

PROSE's Reduced Scope and Orchestrated Composition reinforce the outer loop's narrow, testable, mergeable slices and staged workflow. They give two independent reasons to avoid a long, private, mega-agent run:

- it exceeds useful agent context; and
- it exceeds a human's ability to inspect, own, and remediate.

### Constraints before autonomous execution

Both models treat specifications, non-goals, tooling limits, checks, and escalation rules as operating inputs, not optional prose hidden in a generic prompt.

### Verification over self-report

PROSE's treatment of probabilistic output supports the outer-loop claim that a transcript, confidence score, or green test alone is not a decision. The outer loop adds the key operational test: evidence becomes a guardrail only when it can change a concrete transition.

## Gaps in Chapter 1 relative to the outer loop

These are scope differences, not necessarily defects; later Handbook chapters may cover them.

1. **Evidence is not separated from verdict.** Chapter 1 supports safety and verifiability but does not define who evaluates evidence, which outcomes are valid, or how an advance/block decision is recorded.
2. **No production-boundary accountability contract.** It does not define a named accountable owner, affected boundary, rollback obligation, or the minimum durable record needed to answer for a decision.
3. **No identity/delegation/authorization architecture.** Safety Boundaries is a principle, not a distinction among trigger provenance, workflow identity, agent identity, user delegation, approval authority, execution credentials, and target enforcement.
4. **No durable process-state semantics.** Chapter 1 does not specify long-lived callback approval, idempotency, retry/cancellation, evidence manifests, or state resumption.
5. **No risk-tiered advancement policy.** It does not say when deterministic checks permit automatic progression versus when a named verdict is mandatory.

## Gaps in the outer loop relative to Chapter 1

1. **Context engineering is less explicit.** The outer loop recognizes brownfield knowledge and retained learning, but does not yet prescribe context budgets, relevance selection, or progressive retrieval in PROSE's detail.
2. **Cognitive composition is less explicit.** A durable workflow may be operationally decomposed while its individual agent stage still receives an oversized prompt and undifferentiated tool surface.
3. **Instruction inheritance is less explicit.** The outer loop describes policy and authority hierarchy, but less directly the organization → repository → subsystem → module → task hierarchy needed to surface local engineering conventions.
4. **Portability is less central.** The outer-loop reference implementation is deliberately concrete—Step Functions, IAM, EventBridge, AgentCore. PROSE provides a more tool-agnostic vocabulary. The appropriate response is to distinguish portable principles from a specific enforceable implementation.

## Avoid false equivalence

- **Safety Boundary ≠ authorization architecture.** Tool allowlists and prompt guardrails do not establish identity, least-privilege credentials, separation of duties, JIT elevation, or target-side authorization.
- **Explicit Hierarchy ≠ decision-rights hierarchy.** A repository policy tree can select a coding convention; it cannot authorize a billing rollout.
- **Verification ≠ verdict.** Tests and evaluators yield evidence. A verdict is an explicitly authorized decision under a risk policy.
- **Reduced Scope ≠ low consequence.** A small authorization change or deployment manifest can be high impact.
- **Durable logs ≠ answerability.** Transcripts are not a structured record of intent, policy, evidence, owner, and remediation.
- **Approval ≠ standing credential.** A verdict should permit a bounded transition; it must not create broad, long-lived production access.

## Recommended combined architecture

Treat the models as connected, separate planes.

### 1. Knowledge and execution plane — PROSE

- retrieve stage-relevant, hierarchical instructions and code context;
- bound the task to a context-appropriate slice;
- compose investigation, planning, implementation, verification, and repair as separate primitives;
- constrain writable surfaces, commands, tools, budgets, and escalation conditions.

**Output:** a proposed change plus structured evidence, never an implicit right to create a consequence.

### 2. Process and accountability plane — outer loop

Persist and route:

```text
verified origin and correlation ID
intent, non-goals, and risk class
stage authority envelope
required and received evidence
independent verifier result
verdict and verdict authority
accountable owner and affected boundary
allowed action, rollback/follow-up responsibility
post-action observation and resulting learning
```

### 3. Identity and enforcement plane — outer loop implementation

Keep separate:

```text
originating subject
workflow execution identity
agent workload identity
delegated user subject, if applicable
short-lived technical credential
verdict authority
accountable owner
```

For high-impact actions, evidence leads to a verdict; a separate broker validates that verdict and mints a short-lived, action-specific grant; the target independently authorizes the action.

### 4. Critical interface

Do **not** inject the whole workflow record into every agent call. Compile durable process state into a compact stage package:

```text
task objective and non-goals
applicable local instructions
approved authority envelope
relevant code, architecture, and incident context
required acceptance evidence
explicit stop and escalation conditions
references to fuller durable records when necessary
```

That resolves the apparent tension: the outer loop retains the accountable record while PROSE keeps the agent's context minimal and high-signal.

## Course/blog implications

1. Teach PROSE as an **inner-loop complement**, not a replacement for the outer loop.
2. Use a two-axis frame: **epistemic control** (context, scope, composition, instruction hierarchy) and **authority control** (identity, risk, verdict, JIT grants, accountability).
3. Teach agents as producers of **candidates**; the outer loop authorizes **consequences**.
4. Explain that small batches serve both context reliability and answerability/blast-radius control.
5. Show policy and audit records being selectively compiled into stage context, not dumped wholesale into prompts.
6. Preserve the Handbook's stated evidence limit when teaching PROSE.
