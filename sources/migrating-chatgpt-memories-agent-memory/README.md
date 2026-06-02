# Source notes: Migrating ChatGPT Memories Into Agent Memory

## Working thesis

Migrating memories from ChatGPT into Hermes should not be treated as a direct copy operation. The safer pattern is to export, classify, review, and then promote memories into the right substrate: user profile, durable agent memory, procedural skills, project notes, scheduled tasks, or archive/discard.

## Source map

### Claude memory import

- URL: https://claude.com/import-memory
- Key point: Claude promotes a two-step migration flow: paste a provided prompt into another AI provider, then paste the generated context into Claude memory settings.
- Relevant framing: users have spent months teaching an AI how they work; context should not disappear when they switch tools.
- Design implication for Hermes: use the same prompt-export pattern, but add classification before import.

### OpenAI ChatGPT data export

- URL: https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data
- Key point: OpenAI supports data export through ChatGPT settings and the Privacy Portal.
- Export path from ChatGPT account: profile icon → Settings → Data Controls → Export Data → Confirm export → email download link.
- Caveats: export may take up to 7 days; email download link expires; only most recent request is fulfilled.
- Design implication: official account export is useful as archive/audit trail, not as direct agent memory input.

### Anthropic Claude memory announcement

- URL: https://www.anthropic.com/news/memory
- Key point: Claude memory is optional, project-scoped, viewable/editable by users, and paired with incognito chats.
- Design implication: project-scoped memory is a safety and relevance boundary; imported memories should not all be global.

### OpenClaw memory overview

- URL: https://docs.openclaw.ai/concepts/memory
- Key point: OpenClaw memory is plain Markdown in the workspace; the model only remembers what is written to disk.
- Memory files:
  - `MEMORY.md`: durable facts, preferences, standing decisions.
  - `memory/YYYY-MM-DD.md`: working notes, observations, daily context.
  - `DREAMS.md`: dream diary and consolidation summaries for review.
- Design implication: transparent filesystem memory is an excellent source-of-truth layer, but needs curation.
- Important detail: action-sensitive memories should include boundaries around approval, expiry, authority, and safe-to-act timing.

### Alternate OpenClaw memory docs

- URL: https://openclaw-ai.com/en/docs/concepts/memory
- Key point: describes daily logs, long-term memory, semantic search, and automatic memory flush before compaction.
- Design implication: memory should be written before context compaction, but later reviewed and promoted rather than kept as raw logs.

### Hermes Honcho memory docs

- URL: https://hermes-agent.nousresearch.com/docs/user-guide/features/honcho/
- Key point: Honcho is an AI-native backend for Hermes with dialectic reasoning, user modeling, session context, semantic conclusions, and multi-agent profile isolation.
- Design implication: Honcho should be treated as a reasoning/recall layer that complements inspectable local memory.

### Honcho documentation and repository

- URLs:
  - https://docs.honcho.dev/v2
  - https://github.com/plastic-labs/honcho
- Key point: Honcho stores messages/events, reasons over them, produces working representations, supports search, and returns prompt-ready context.
- Core loop: store → reason → query → inject.
- Design implication: agent memory can be entity-centric and inference-rich, not only a key-value list of facts.

### Firecrawl compose stack / owned Postgres retrieval note

- User note: there is a full Docker Compose stack with Postgres for Firecrawl, and it probably includes or can support pgvector capabilities for semantic search.
- Design implication: carefully evaluate build vs buy. Honcho or similar systems may provide better reasoning and user-modeling out of the box, but local Postgres/pgvector can preserve ownership of raw memory data, embeddings, source notes, and export paths.
- Caveat: pgvector retrieval is not itself a memory model. It can find similar entries, but classification, contradiction resolution, promotion to skills, and pruning still require an agentic curator or human review.

### Dreaming / memory consolidation reports

- URLs:
  - https://www.softpagecms.com/2026/05/23/anthropic-claude-dreaming-agent-memory-consolidation/
  - https://claudefa.st/blog/guide/mechanics/auto-dream
- Key point: secondary reports describe Anthropic/Claude-style dreaming as offline memory consolidation: merge duplicates, resolve contradictions, prune stale references, identify recurring patterns, and output a reviewable memory store.
- Design implication: Hermes should support dream passes as reviewable diffs, not silent destructive rewrites.

## Proposed migration prompt

```text
Export all of my stored memories and any durable context you have learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions, preferences, corrections, and standing rules.

Only include information that appears in stored memory or durable cross-chat context. Do not invent facts from this conversation. If you are unsure whether something is stored memory or inferred from chat history, label it as uncertain.

Classify each item into exactly one category:

1. Instructions: explicit rules I asked you to follow in future conversations, including tone, format, style, approvals, safety boundaries, and corrections to your behavior.
2. Identity: stable personal facts such as name, location, languages, interests, family, education, or public biographical context.
3. Career: current and past roles, organizations, skills, domains, and professional responsibilities.
4. Projects: ongoing or meaningful projects. Use one entry per project with project name, purpose, status, important decisions, and known repository or workspace if available.
5. Preferences: broad working style, tool choices, writing preferences, learning preferences, and taste.
6. Environment: durable machine, account, repository, deployment, or toolchain facts that future agents may need.
7. Procedures: reusable workflows, troubleshooting steps, or lessons learned that should become skills rather than ordinary memory.
8. Temporary or expiring context: reminders, deadlines, one-off tasks, phase status, pending approvals, or anything likely to become stale.
9. Contradictions and uncertainty: entries that conflict, appear outdated, or need human review.

For each entry, output:
- category
- date if known, otherwise [unknown]
- source confidence: high / medium / low
- exact memory text or closest faithful wording
- recommended destination: user profile, agent memory, skill, project note, scheduled task, archive, or discard
- reason for the recommendation

Wrap the entire export in a single Markdown code block. After the code block, state whether more memories remain.
```

## Article structure

1. Start with comparison of Obsidian, Honcho, local filesystem memory, and owned Postgres/pgvector retrieval.
2. Explain two ChatGPT export paths: official data export and prompt-based memory export.
3. Present classification schema for Hermes imports.
4. Deep dive into memory architecture for agents: session context, working notes, curated memory, searchable archive, skills, governance.
5. Compare OpenClaw Markdown-first memory and Honcho reasoning-first memory.
6. Evaluate dreaming as asynchronous memory maintenance.
7. End with practical migration pipeline.
