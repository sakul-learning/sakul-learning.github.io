---
source_url: https://danielmeppiel.github.io/agentic-sdlc-handbook/handbook/ch01-the-agentic-sdlc-thesis.html
title: "The Agentic SDLC Thesis"
author: Daniel Meppiel
retrieved: 2026-07-13
---

# Source note: *The Agentic SDLC Thesis* (Chapter 1)

This local source capture supports comparison with Sakul Learning's **outer-loop** model. `chapter.md` is a Markdown conversion of the canonical page's `<main>` content retrieved on 2026-07-13; it is a snapshot, not an assertion that the source will remain unchanged.

## Thesis captured

The chapter argues that production agentic SDLC failure is primarily an **information and control-architecture** problem rather than a raw-model-intelligence problem:

- context is finite and fragile;
- organizational knowledge must be explicit before an agent can use it;
- model output remains probabilistic, so reliability must be designed through constraints, structure, and grounding.

It proposes **PROSE** as five architectural constraints:

| PROSE | Constraint |
| --- | --- |
| P | Progressive Disclosure |
| R | Reduced Scope |
| O | Orchestrated Composition |
| S | Safety Boundaries |
| E | Explicit Hierarchy |

The chapter is careful about scope: its primary evidence is one public PR/case study by the methodology's creator; it claims a useful architectural vocabulary, not independently proven universal results.

## Comparison targets

- **“The outer loop is an accountability system”** — quality, verdict, answerability, back pressure, and accountable ownership.
- **“Designing identity and authorization for the outer loop”** — workflow identity, delegation, authority envelopes, approval brokers, and JIT grants.

## Initial comparison thesis

PROSE primarily answers **how to make an agent's work tractable, contextually grounded, and safer before it reaches a consequential boundary**. The outer loop primarily answers **who may let that work cross the boundary, on what evidence, and who must answer afterward**.

They are complementary layers rather than substitutes:

```text
PROSE / harness architecture
  → makes bounded agent work more likely to be correct and inspectable
  → produces artifacts and evidence
  → outer loop classifies risk, renders a verdict, applies authority, and preserves accountability
```

The main gap in Chapter 1 relative to the outer-loop model is not an absence of safety intent. It is that **Safety Boundaries** remains a broad constraint in this chapter: it does not yet distinguish trigger provenance, workflow identity, delegated user authority, approver/verdict authority, action credentials, and the accountable owner. Its later governance chapters may address those questions; this comparison is intentionally limited to Chapter 1.
