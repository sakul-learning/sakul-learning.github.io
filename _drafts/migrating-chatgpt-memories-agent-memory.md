---
layout: post
title: "Migrating ChatGPT Memories Into Agent Memory"
summary: "A practical design note on exporting ChatGPT memories, classifying them for Hermes, and building an agent memory system that can consolidate, dream, and forget safely."
tags:
  - ai-agents
  - memory
  - chatgpt
  - hermes-agent
  - openclaw
  - honcho
  - obsidian
source_folder: sources/migrating-chatgpt-memories-agent-memory
sources:
  - title: "Switch to Claude Without Starting Over"
    url: "https://claude.com/import-memory"
    note: "Anthropic/Claude memory-import page describing the copy-prompt, paste-output migration workflow and highlighting project-scoped editable memory."
  - title: "How do I export my ChatGPT history and data?"
    url: "https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data"
    note: "OpenAI Help Center instructions for exporting ChatGPT account data through ChatGPT settings or the Privacy Portal."
  - title: "Bringing Memory to Claude"
    url: "https://www.anthropic.com/news/memory"
    note: "Anthropic announcement describing Claude memory, project-scoped memories, editable memory summaries, and incognito chats."
  - title: "Memory overview - OpenClaw"
    url: "https://docs.openclaw.ai/concepts/memory"
    note: "OpenClaw documentation for plain-Markdown memory, MEMORY.md, daily notes, DREAMS.md, action-sensitive memories, and memory search."
  - title: "Memory | OpenClaw Docs"
    url: "https://openclaw-ai.com/en/docs/concepts/memory"
    note: "Alternate OpenClaw memory documentation describing daily logs, long-term memory, vector search, and pre-compaction memory flush."
  - title: "Honcho Memory | Hermes Agent"
    url: "https://hermes-agent.nousresearch.com/docs/user-guide/features/honcho/"
    note: "Hermes documentation for Honcho as an AI-native memory backend with dialectic reasoning, user modeling, session context, and multi-agent profile isolation."
  - title: "Honcho documentation"
    url: "https://docs.honcho.dev/v2"
    note: "Honcho documentation describing message storage, working representations, search, the Dialectic API, and prompt-ready context retrieval."
  - title: "plastic-labs/honcho"
    url: "https://github.com/plastic-labs/honcho"
    note: "Honcho repository describing the store-reason-query-inject loop, self-hosting, SDKs, and peer-centric memory model."
  - title: "Why Anthropic Gave Claude a Bedtime"
    url: "https://www.softpagecms.com/2026/05/23/anthropic-claude-dreaming-agent-memory-consolidation/"
    note: "Secondary report on Anthropic's 'dreaming' concept as scheduled offline consolidation of persistent memory, with reviewable output stores."
  - title: "Claude Code Dreams: Anthropic's New Memory Feature"
    url: "https://claudefa.st/blog/guide/mechanics/auto-dream"
    note: "Technical walkthrough of a Claude-style auto-dream memory consolidation pass: orientation, signal gathering, consolidation, pruning, and indexing."
  - title: "chat_shared_conversation_to_file"
    url: "https://github.com/Dicklesworthstone/chat_shared_conversation_to_file"
    note: "Public-share conversation exporter (`csctf`) that converts ChatGPT, Claude, Gemini, and Grok share URLs into Markdown and HTML; used as the side-note example for handing a single ChatGPT conversation to an agent as source material."
---

The first problem in migrating memories out of ChatGPT is not extraction. It is classification.

A memory export is not one thing. It is a mixture of user preferences, project summaries, stale corrections, tool quirks, private facts, temporary commitments, and instructions that may have made sense in one product but become dangerous in another. If we paste that blob straight into Hermes, OpenClaw, Claude, or any long-running agent, we do not get continuity. We get memory debt.

The better migration path is to treat ChatGPT memories as raw source material, then sort them into a memory architecture with clear boundaries: what should be loaded every turn, what should live in searchable history, what should become a skill or workflow, what should expire, and what should be thrown away.

That is why the starting comparison should not be “How do I copy memories?” It should be: **what kind of memory substrate do I want the agent to trust?**

## Three substrates: Obsidian, Honcho, and local filesystem memory

For Hermes-style agents, three practical memory substrates are worth comparing before importing anything.

| Substrate | Best at | Weakness | Migration role |
| --- | --- | --- | --- |
| Obsidian | Human-owned notes, backlinks, long-form project knowledge, evergreen context | Not automatically agentic unless an agent searches/edits it deliberately | Good archive and review layer for imported memories before promotion |
| Honcho | AI-native memory, user modeling, semantic recall, inferred patterns, multi-agent continuity | Service dependency, abstraction over the raw data, needs trust and governance | Good reasoning layer for cross-session personalization and dynamic recall |
| Local filesystem memory | Transparent, inspectable, versionable Markdown/JSON files inside the agent workspace | Can become messy, duplicated, or stale without curation | Good source-of-truth layer for durable facts, preferences, decisions, and lessons |
| Self-hosted Postgres / pgvector stack | Owned database, embeddings, semantic search, structured metadata, exportable rows | More operational work than a hosted memory backend; easier to build a worse Honcho by accident | Good owned-data retrieval layer when the team already runs a compose stack, such as Firecrawl with Postgres |

Obsidian is excellent when the human wants a personal knowledge base. It is a notebook first and an agent memory backend second. Its strength is reviewability: you can put imported memories into folders, add backlinks, tag them, and decide what deserves to be promoted.

Honcho is almost the opposite. It is built for agents that need statefulness. Honcho stores messages and events, reasons over them in the background, builds representations of users and agents, and returns prompt-ready context. That is powerful because the agent does not need to manually maintain every fact. But it also means you need governance: what is the source of truth, what can the service infer, and how do you inspect or override conclusions?

Local filesystem memory is the simplest and most auditable substrate. OpenClaw’s docs make this explicit: the agent remembers by writing plain Markdown files in its workspace; the model only “remembers” what gets written to disk. Hermes has the same spirit in its built-in memory and skills: user facts, environment facts, and procedural lessons are persisted outside the transient chat. The advantage is transparency. The danger is entropy.

There is also a pragmatic fourth option: use infrastructure we already own. A full Firecrawl compose stack with Postgres probably gives us most of the operational ingredients for an owned semantic-search layer, especially if the Postgres image includes pgvector or can be extended to include it. That does not automatically mean we should build the whole memory system ourselves. It means the buy-vs-build question should be framed carefully: buy or use Honcho-style reasoning when it saves time and improves quality, but keep the raw memory data, embeddings, source notes, and export path under our control.

A good migration should use all three layers differently:

1. **Obsidian or source notes** for imported raw material and human review.
2. **Local filesystem memory** for curated, durable, inspectable facts.
3. **Honcho** for inferred representations, semantic recall, and cross-session personalization.
4. **Owned Postgres / pgvector retrieval** when we need local semantic search without surrendering the data plane.

Do not collapse those layers into one giant memory file.

## Exporting ChatGPT memories: two different exports

There are two useful ways to get information out of ChatGPT, and they solve different problems.

The first is OpenAI’s official data export. OpenAI’s Help Center says users can export account data from ChatGPT by going to **Settings → Data Controls → Export Data**, confirming the export, and downloading the emailed ZIP link. Users can also request data through the Privacy Portal. This can include chat history and other account data, although OpenAI notes that exports may take time and the link expires.

That export is good for archival analysis, but it is too large and noisy to import directly into an agent memory system.

The second is a prompt-based memory export. Anthropic’s Claude import page describes a lightweight workflow: copy a provided prompt into the old AI provider, ask it to extract the important context, then paste the result into Claude’s memory import settings. This does not migrate every transcript. It migrates the distilled profile: preferences, instructions, projects, work style, and recurring context.

For Hermes, the same idea is useful, but the output should be classified before it touches memory.

Here is a migration prompt adapted from the Claude-style workflow, tuned for agent memory systems rather than one destination product:

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

If ChatGPT says more memories remain, continue until the export is complete. Then do not paste it straight into Hermes. Put it in a source folder first.

### Side note: sharing a single ChatGPT conversation with your agent

The memory-export prompt above is for durable profile context. Sometimes you want a smaller move: take one useful ChatGPT conversation and hand it to your local agent as source material. Public ChatGPT share links are good for this because they can be fetched without giving the agent your ChatGPT account.

A practical setup is to install a public-share exporter such as `csctf` (`chat_shared_conversation_to_file`) and give Hermes a small procedural skill for it. Then the handoff becomes simple:

> fetch this ChatGPT share into `/data`: `https://chatgpt.com/share/...`

The agent should download the share as Markdown and HTML, put it in a data mount or other agreed source folder, spot-check the result, and report the paths. That turns a one-off conversation into inspectable source material that can be summarized, linked from source notes, or promoted into a real Hermes skill later.

Here is the reusable Hermes skill, with machine-specific installation paths removed:

````markdown
---
name: chatgpt-share-export
description: Use when the user asks to fetch, download, export, or archive a public ChatGPT shared conversation URL into a data directory using csctf.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [chatgpt, export, shared-conversations, csctf, markdown, archive]
    related_skills: [hermes-agent]
---

# ChatGPT Share Export

## Overview

Use this skill to turn a public ChatGPT share URL such as `https://chatgpt.com/share/...` or `https://chat.openai.com/share/...` into local Markdown and HTML files under an agreed data or source-material directory.

The preferred tool is `csctf`, installed as a local CLI from `chat_shared_conversation_to_file`. Use a system Chromium or browser available on the host if Playwright's bundled Chromium cannot be installed for the platform.

## When to Use

Use when the user says things like:

- "fetch this ChatGPT share into `/data`"
- "download this ChatGPT shared conversation"
- "export this share URL as markdown/html"
- "archive this ChatGPT conversation"
- "run csctf on this ChatGPT share link"

Also applicable to csctf-supported public AI share links from Claude, Gemini, and Grok, but the primary expected trigger is ChatGPT share URLs.

Do not use this for private ChatGPT conversations that are not public share URLs. csctf fetches public share pages; it is not an authenticated ChatGPT account exporter.

## Default Output Location

Use the user's requested data directory by default, commonly:

```bash
/data/chatgpt-shares
```

For a URL with ID `<share-id>`, use this base filename pattern:

```text
<data-dir>/chatgpt-shares/chatgpt-share-<share-id>
```

Expected outputs:

```text
<data-dir>/chatgpt-shares/chatgpt-share-<share-id>.md
<data-dir>/chatgpt-shares/chatgpt-share-<share-id>.html
```

If the user asks for a different directory or filename, respect that.

## Quick Recipe

1. Extract the share ID from the URL.
2. Ensure the output directory exists.
3. Run csctf with an explicit `--outfile` base path.
4. Spot-check the generated Markdown and HTML.
5. Report the absolute paths and basic verification results.

Command template:

```bash
set -euo pipefail
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

URL='https://chatgpt.com/share/<share-id>'
ID='<share-id>'
OUTDIR='<data-dir>/chatgpt-shares'
BASE="$OUTDIR/chatgpt-share-$ID"

mkdir -p "$OUTDIR"
csctf "$URL" --timeout-ms 90000 --outfile "$BASE"
```

If `csctf` is not on `PATH`, use the local binary path configured on that machine.

## Verification / Spot Check

After running, verify both files exist and are non-empty:

```bash
MD="$BASE.md"
HTML="$BASE.html"
stat -c '%n %s bytes' "$MD" "$HTML"
wc -l -w -c "$MD" "$HTML"
```

Then inspect the beginning of the Markdown for title, source URL, retrieval timestamp, and role sections:

```bash
python3 - <<'PY'
from pathlib import Path
p = Path('<data-dir>/chatgpt-shares/chatgpt-share-<share-id>.md')
text = p.read_text(errors='replace')
for line in text.splitlines()[:80]:
    if line.strip():
        print(line[:220])
PY
```

Also confirm the HTML title/content references the same conversation:

```bash
python3 - <<'PY'
from pathlib import Path
p = Path('<data-dir>/chatgpt-shares/chatgpt-share-<share-id>.html')
text = p.read_text(errors='replace')
for needle in ['<title>', 'ChatGPT Conversation', 'Source:']:
    print(needle, needle in text)
PY
```

If the user asks for a deeper check, read targeted portions of the Markdown with `read_file`, or search for expected phrases using `search_files`.

## Installation / Repair

If csctf is missing, install or rebuild it with Bun:

```bash
set -euo pipefail
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Install Bun if missing. Review installer scripts before piping remote code to a shell.
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install -o /tmp/bun-install.sh
  bash /tmp/bun-install.sh
fi

INSTALL_DIR='<install-dir>/chat_shared_conversation_to_file'
if [ ! -d "$INSTALL_DIR/.git" ]; then
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone https://github.com/Dicklesworthstone/chat_shared_conversation_to_file "$INSTALL_DIR"
else
  git -C "$INSTALL_DIR" pull --ff-only
fi

cd "$INSTALL_DIR"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 bun install
bun run build
```

If Playwright's browser download is unsupported on the host, configure csctf to use an available system Chrome/Chromium installation.

## Common Pitfalls

1. **Playwright Chromium install can fail on some Linux/ARM combinations.** Use `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 bun install` and rely on a system Chrome/Chromium where needed.

2. **Forgetting explicit `--outfile`.** Without it, csctf writes to the current directory with an inferred filename. Use an explicit base path under the data/source directory so the user gets a stable, easy-to-find artifact.

3. **Stopping after the CLI says success.** Always spot-check file sizes, line counts, and the first Markdown content before reporting success.

4. **Assuming this works for private conversations.** It only works on public share URLs; private account history needs a different export path.

5. **Treating the export as memory immediately.** A conversation transcript is source material. Summaries, preferences, and procedures still need classification before promotion into memory or skills.

## Reporting Format

When done, tell the user:

- Markdown path
- HTML path
- file sizes / line counts
- detected title
- brief spot-check result

Example:

```text
Exported and spot-checked:

- <data-dir>/chatgpt-shares/chatgpt-share-<id>.md
- <data-dir>/chatgpt-shares/chatgpt-share-<id>.html

Title detected: <title>
Markdown: <bytes> bytes, <lines> lines
HTML: <bytes> bytes, <lines> lines
```

## Verification Checklist

- [ ] URL is a public share URL.
- [ ] Output directory exists under the requested data/source directory.
- [ ] csctf completed with exit code 0.
- [ ] Markdown and HTML files exist and are non-empty.
- [ ] Markdown contains title, source URL, and role sections.
- [ ] HTML contains the expected title or conversation heading.
- [ ] Final response includes absolute paths.
````

That last pitfall is the important memory-system point: sharing a ChatGPT conversation with an agent is not the same as making it memory. The export is evidence. The agent still has to decide whether the conversation contains a durable user preference, a project note, a reusable procedure, a temporary task, or nothing worth promoting.

## A classification scheme for Hermes memory imports

A Hermes migration should separate imported items by how they will be used.

### User profile

Use this for stable facts about the user:

- communication preferences
- name, role, interests, broad working style
- durable preferences such as “prefers concise technical answers”

These memories affect the agent’s interaction style across sessions. They should be compact and stable.

### Agent memory

Use this for durable environment and project facts:

- “This machine’s GitHub CLI auth is stored under a specific config path”
- “This repository uses a particular test command”
- “The blog repo uses Jekyll drafts before publication”

This layer helps the agent act correctly in a specific environment. It should not contain temporary task progress or stale artifact IDs.

### Skills

Procedures do not belong in ordinary memory. If an imported item says, “when debugging this pipeline, run these five commands in this order,” it should become a skill: trigger conditions, exact steps, pitfalls, and verification.

This matters because procedural memory is operational. A bad procedure can make the agent repeat the same failure forever.

### Project notes or Obsidian

Project background that is too detailed for bootstrap memory should live in searchable notes. Obsidian is useful here because the human can inspect, link, and prune it. Local Markdown folders are also fine.

The rule is simple: if the agent may need to search it sometimes but should not read it every session, it belongs in notes, not always-loaded memory.

### Scheduled tasks or commitments

A future check-in is not long-term memory. If the export says “follow up after the interview tomorrow,” that should become a scheduled task or short-lived commitment, not a permanent memory.

OpenClaw’s memory docs make a similar distinction: commitments and scheduled tasks are different from durable facts.

### Discard or archive

Some memories should not migrate:

- stale phase status
- old PR numbers and commit hashes
- “currently working on…” entries
- temporary approvals
- contradicted preferences
- facts without a trustworthy source

A useful import is not the largest import. It is the smallest set that improves future behavior.

## Designing a good memory system for agents

A good memory system for agents such as OpenClaw and Hermes needs at least six layers.

### 1. Ephemeral session context

This is the current conversation. It is high-bandwidth and low-durability. It can hold nuance, but it disappears or gets compacted. Do not trust it for anything the agent must remember next week.

### 2. Working notes

OpenClaw uses daily files such as `memory/YYYY-MM-DD.md`. This layer is a work journal: observations, decisions, session summaries, raw notes, and partial context. It is useful because it gives the agent somewhere to write before it knows what matters long term.

Hermes can use source folders, session transcripts, Obsidian notes, or project-local Markdown the same way.

### 3. Curated long-term memory

This is the small memory that loads at startup. In OpenClaw that role is `MEMORY.md`. In Hermes it is the durable user and memory stores injected into future turns. This layer must be concise because every token spent here competes with the task.

A good rule: long-term memory should contain declarations, not logs.

Bad:

> On Tuesday we fixed a bug, opened PR 43, then discussed whether to migrate.

Good:

> The project uses Jekyll drafts for unpublished posts; ask before publishing or pushing.

### 4. Searchable archive

Agents need recall without always-on context bloat. OpenClaw exposes memory search over Markdown files. Hermes has session search and can use file search, Obsidian, and external providers. Honcho adds semantic search over conclusions and messages.

This archive should preserve source material so dreams and audits can check whether a memory is still justified.

If we already run Firecrawl in Docker Compose with Postgres, this layer may not need to start from zero. Firecrawl-style ingestion, a Postgres backing store, and pgvector-capable embeddings can form a local retrieval substrate for memory source material: scraped pages, exported ChatGPT memories, session summaries, Obsidian notes, and dream evidence. The trade-off is that vector search is only retrieval, not memory judgment. A Postgres table can find similar memories; it cannot decide by itself which preference is global, which project note is stale, or which procedural lesson deserves to become a skill. That is where an agentic curator, Honcho-like reasoning layer, or human review remains necessary.

The guiding principle is data ownership. If a hosted memory backend is used, the system should still be able to export its conclusions and rehydrate the local store. If a local pgvector backend is used, the system should not pretend that nearest-neighbor search alone is the same as a good memory model.

### 5. Procedural skills

Skills are different from facts. They tell the agent how to do something reliably. Hermes already treats skills as procedural memory. This is where migrations should put reusable workflows: blog publishing, GitHub PR workflows, debugging playbooks, model-serving setup, and so on.

Skills should include verification steps and known pitfalls, because that is how agents avoid relearning the same operational lesson.

### 6. Governance and policy boundaries

Memory can guide action, but it should not enforce policy by itself. OpenClaw’s docs warn that memory can preserve approval context but does not replace approval settings, sandboxing, or scheduled tasks.

Hermes should follow the same principle. If a memory says a user approved something once, the agent should not treat that as permanent permission. Destructive commands, publishing, account changes, and cross-profile edits need policy enforcement outside memory.

## What Hermes can learn from OpenClaw’s Markdown-first memory

OpenClaw’s Markdown-first design is attractive because it is explicit. Files are the source of truth. `MEMORY.md` is long-term memory. Daily notes are working memory. `DREAMS.md` can store consolidation summaries for review.

Hermes can adopt that pattern even when it uses other backends:

- Keep **always-loaded memory** small and declarative.
- Keep **working notes** separate from durable facts.
- Keep **source transcripts** available for audit.
- Keep **skills** separate from factual memory.
- Keep **dream outputs** reviewable before promotion.

The key design idea is not “Markdown is perfect.” It is that memory should be inspectable, scoped, and reversible.

## What Hermes can learn from Honcho

Honcho points in another direction: memory is not only stored text; it is a changing representation of people, agents, groups, projects, and ideas.

That matters because many useful memories are not explicit facts. A user may never say, “I learn best through examples,” but a long history of interactions can make that pattern obvious. Honcho’s Dialectic API and working representations are designed for exactly this: store messages, reason over them, query insights, and inject only the context needed for the current turn.

For Hermes, Honcho is most valuable as a reasoning and recall layer, not as the only memory layer. The local store should still hold explicit, inspectable facts. Honcho can then help answer questions such as:

- What does this user usually care about when reviewing code?
- Which project context is relevant to this thread?
- Is this preference global, or only true for one domain?
- What similar issue happened before?

The combination is stronger than either system alone: local files give auditability; Honcho gives synthesis.

## Dreaming: the missing maintenance loop

Long-running memory systems rot.

They collect duplicate entries, old assumptions, relative dates, references to files that no longer exist, and instructions that were true for one phase but wrong later. The more successful the agent is at remembering, the more it needs a way to forget.

That is the role of “dreaming.” Secondary reports describe Anthropic’s dreaming concept as scheduled offline consolidation for managed agents: the agent reviews prior sessions and persistent memory, merges duplicates, resolves contradictions, prunes stale references, identifies recurring mistakes, and produces a cleaned memory store for inspection.

Whether or not every implementation uses Anthropic’s exact mechanism, the architectural pattern is useful:

1. **Do not dream in the critical path.** Run consolidation asynchronously, between tasks.
2. **Do not overwrite the source.** Keep original transcripts and old memory available.
3. **Produce a reviewable diff.** The dream should propose additions, removals, merges, and edits.
4. **Prefer recency only with evidence.** Newer is often right, but not always. A newer hallucination should not erase an older verified fact.
5. **Separate cleanup from promotion.** A dream can discover a lesson, but durable memory should still require confidence thresholds or human review for sensitive changes.

A Hermes dream pass could work like this:

```text
Input:
- current user profile
- current agent memory
- relevant session transcripts
- recent source notes
- skills usage and patch history
- optional Honcho conclusions

Process:
- identify duplicate memories
- detect contradictions
- detect stale entries with expiry signals
- find lessons that should become skills
- find temporary progress logs that should be removed
- find missing action boundaries for risky memories

Output:
- proposed user-profile edits
- proposed memory edits
- proposed skill creations or patches
- proposed archive/discard list
- evidence links to source sessions or files
- confidence score and review requirement
```

The important part is evidence. A dream that cannot cite why it wants to delete or rewrite a memory should not be allowed to mutate the memory system.

## A practical migration pipeline

Here is the workflow I would use to migrate ChatGPT memories into Hermes.

### Step 1: Export raw account data

Use OpenAI’s official data export to preserve the full archive. Store it privately. This is not the import; it is the audit trail.

### Step 2: Run the structured memory export prompt

Ask ChatGPT for a categorized memory export using the prompt above. Continue until it says no more memories remain.

### Step 3: Save the export as source material

Put the raw export in a source folder or Obsidian note. Do not immediately add it to the agent’s injected memory.

### Step 4: Normalize entries

For each item, assign:

- scope: global user, project, environment, procedure, temporary, archive
- durability: permanent, long-lived, short-lived, expired
- confidence: high, medium, low
- source: explicit memory, inferred, unknown
- destination: user profile, memory, skill, note, schedule, discard

### Step 5: Promote only high-confidence durable entries

Add compact stable facts to the user profile or agent memory. Convert reusable workflows into skills. Put project detail into notes. Discard stale progress.

### Step 6: Run an initial dream review

Before trusting the migrated memory, run a consolidation pass that asks:

- Which entries contradict each other?
- Which are too temporary for memory?
- Which instructions are unsafe without action boundaries?
- Which procedures should become skills?
- Which entries need human review?

### Step 7: Schedule recurring dreams

Memory cleanup should be routine. A weekly or monthly dream can review recent sessions, memory changes, skill updates, and unresolved contradictions.

## The design principle: memory should be useful, not maximal

A good agent memory system is not a bigger context window. It is a disciplined information lifecycle.

ChatGPT memories are useful raw material. Anthropic’s import workflow shows that a prompt-based profile export can make migration easy. OpenClaw shows the value of transparent Markdown memory. Hermes shows how durable memory and procedural skills can coexist. Honcho shows how reasoning over history can produce better context than raw retrieval. Dreaming shows why every growing memory system needs maintenance.

The final target should be a memory system with four properties:

1. **Transparent**: humans can see what the agent believes.
2. **Scoped**: project memories do not bleed into unrelated work.
3. **Action-aware**: approvals, temporary constraints, and risky instructions carry boundaries.
4. **Self-cleaning**: dreams identify contradictions, stale facts, duplicate entries, and new lessons.

Migrating memories is not a one-time copy-paste. It is the beginning of a memory operating system.
