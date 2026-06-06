---
layout: post
title: "Migrating Out of ChatGPT: Memory You Own, on an Agent That Runs Your Code"
summary: "Why and how to move off subscription memory toward something you own and run yourself. First what to migrate into — the substrate choices (Obsidian, Honcho, local files, owned Postgres), how Hermes memory actually works, and the pitfalls we hit (including the auxiliary-LLM layer) — then, as an appendix, the validated pipeline for migrating your ChatGPT memories in."
tags:
  - ai-agents
  - memory
  - chatgpt
  - hermes-agent
  - openclaw
  - honcho
  - obsidian
  - hindsight
  - kanban
  - migration
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
  - title: "Hindsight (Vectorize) memory"
    url: "https://hindsight.vectorize.io/"
    note: "Hindsight knowledge-graph agent memory: cloud API and local modes, observations layer, and the reflect synthesis tool; the cloud backend we adopted."
  - title: "Why Anthropic Gave Claude a Bedtime"
    url: "https://www.softpagecms.com/2026/05/23/anthropic-claude-dreaming-agent-memory-consolidation/"
    note: "Secondary report on Anthropic's 'dreaming' concept as scheduled offline consolidation of persistent memory, with reviewable output stores."
  - title: "Claude Code Dreams: Anthropic's New Memory Feature"
    url: "https://claudefa.st/blog/guide/mechanics/auto-dream"
    note: "Technical walkthrough of a Claude-style auto-dream memory consolidation pass: orientation, signal gathering, consolidation, pruning, and indexing."
  - title: "chat_shared_conversation_to_file"
    url: "https://github.com/Dicklesworthstone/chat_shared_conversation_to_file"
    note: "Public-share conversation exporter (`csctf`) that converts ChatGPT, Claude, Gemini, and Grok share URLs into Markdown and HTML; used in the appendix for handing a single ChatGPT conversation to an agent as source material."
---

If you pay for ChatGPT or Claude, your "memory" lives on someone else's servers, governed by someone else's product decisions, and bound to one assistant. This post is about migrating *out* of that — toward memory you own, on an agent you run yourself.

The reason it's worth the effort isn't just data ownership. It's that a self-hosted agent can do things a subscription assistant won't. The agent this is written for — a self-hosted [Hermes](https://hermes-agent.nousresearch.com/) — doesn't just *read* a pull request and opine. It checks out the branch, installs dependencies, **runs the tests, and exercises real scenarios** before it comments. That's well beyond what a read-only "sandbox" memory provider is willing to give you.

> **Security disclaimer.** Running untrusted code from PR branches is powerful and dangerous. Doing it safely needs strict mechanisms — **allowlists for trusted authors**, scrubbing of untrusted inputs, and tight action boundaries — so a hostile PR can't turn your agent into a foothold. We'll cover that hardening in a future article. Until then: only point this kind of automation at repositories and authors you control.

But before you migrate anything *in*, you need to know what you're migrating *into*. The first problem in migrating memories out of ChatGPT is not extraction — it's **classification**, and that only makes sense once you've chosen a memory architecture. So we'll work in that order: the substrate, how Hermes memory actually works, the pitfalls we hit standing it up, and then — in the appendix — the validated pipeline for bringing your ChatGPT memories across.

## First question: what substrate do you want the agent to trust?

A memory export is a mixture of preferences, project summaries, stale corrections, private facts, temporary commitments, and instructions that made sense in one product but are dangerous in another. Paste that blob straight in and you don't get continuity — you get **memory debt**. The starting question isn't "how do I copy memories?" It's *what kind of substrate do I want the agent to trust?*

For Hermes-style agents, four substrates are worth comparing before importing anything:

| Substrate | Best at | Weakness | Migration role |
| --- | --- | --- | --- |
| **Obsidian** | Human-owned notes, backlinks, long-form project knowledge | Not agentic unless an agent deliberately searches/edits it | Archive + review layer for imported memories before promotion |
| **Honcho** | AI-native memory, user modeling, semantic recall, inferred patterns | Service dependency, abstraction over raw data, needs governance | Reasoning layer for cross-session personalization and recall |
| **Local filesystem memory** | Transparent, inspectable, versionable Markdown/JSON in the workspace | Becomes messy/duplicated/stale without curation | Source-of-truth layer for durable facts, preferences, lessons |
| **Self-hosted Postgres / pgvector** | Owned database, embeddings, semantic search, exportable rows | More ops than a hosted backend; easy to build a worse Honcho by accident | Owned retrieval layer when you already run a compose stack (e.g. Firecrawl + Postgres) |

A few notes from evaluating each:

- **Obsidian** is excellent when the human wants a personal knowledge base — it's a notebook first, an agent backend second. Its strength is reviewability: drop imported memories into folders, backlink and tag them, decide what deserves promotion. We treat it as **a path worth evaluating but didn't explore here** — a great human-review staging area if you want one, orthogonal to the agent's live recall.
- **Honcho** is almost the opposite — built for agents that need statefulness: it stores messages and events, reasons over them in the background, builds representations of users and agents, and returns prompt-ready context. Powerful, because the agent doesn't manually maintain every fact. We researched self-hosting it seriously, and the catch on a small box is real: it's several long-running services (API, a background "deriver", Postgres+pgvector, Redis) and the deriver **must** call out to an LLM/embedding provider, so it's neither free nor fully local unless you accept a trusted external endpoint. Strong as a *reasoning* layer; heavy as the *only* layer.
- **Local filesystem memory** is the simplest and most auditable substrate. [OpenClaw's docs](https://docs.openclaw.ai/concepts/memory) make it explicit: the agent remembers by writing plain Markdown; the model only "remembers" what's on disk. Hermes has the same spirit. The advantage is transparency; the danger is entropy.
- **Owned Postgres / pgvector** is the pragmatic fourth option if you already run the infrastructure — a Firecrawl compose stack with Postgres gives you most of an owned semantic-search layer if the image has (or can add) pgvector. But "nearest-neighbour search" is retrieval, not memory judgment: a table can find similar memories; it can't decide which preference is global, which note is stale, or which lesson should become a skill.

The lesson is to **layer them, not collapse them**: source notes/Obsidian for raw imported material and human review; local files for curated, durable, inspectable facts; a reasoning/semantic provider (Honcho, Hindsight) for inferred recall; owned Postgres/pgvector when you need local retrieval without surrendering the data plane. Keep the export path under your control throughout.

## How Hermes agent memory actually works

Concretely, Hermes starts with a built-in memory that is just plain Markdown: a `MEMORY.md` of durable facts and a `USER.md` profile, always loaded, transparent, version-controllable — the model only "remembers" what's literally on disk. On top of that it supports a **pluggable external provider** for semantic recall, in a layered model: the files stay the inspectable **source of truth**; the provider adds embedding search and synthesis and is swappable.

That's the design. Standing it up taught us where the sharp edges are.

## The pitfalls we hit standing it up

### 1. The built-in file memory has a silent ceiling

Built-in memory has a character cap (ours was 2,200). One day the agent quietly started **refusing to store new memories** — `Memory at 2,113/2,200 chars; adding this entry would exceed the limit`. It didn't fail loudly; it just stopped learning. A flat growing file also accumulates **entropy** (duplicates, contradictions) and offers **no semantic recall** (it finds only what it wrote verbatim and can grep for). Great as a source of truth; you want a semantic layer on top.

### 2. "Local embedded" backends can try to reshape your runtime

Hindsight has a tempting local-embedded mode: an on-instance daemon with built-in Postgres that auto-stops when idle, local embeddings, your own LLM key. Lovely on paper. But a dry-run of the install resolved to **159 packages including the full CUDA toolkit** (useless on a GPU-less ARM box) and wanted to **downgrade `cryptography` inside the agent's own virtualenv**. Lesson: `--dry-run` any backend install and read what it touches. A memory layer should never get to mutate your agent's dependencies.

### 3. "Just run mem0 locally" is not a flag you flip

mem0 is the obvious open-source choice, and Hermes ships a mem0 plugin — but the stock plugin is **Mem0-Cloud only**: it instantiates the hosted client and needs a Mem0 API key. Self-hosted/OSS mode is an *open, unmerged feature request*, not shipped. "Local mem0" means writing a custom provider, not selecting one.

### 4. A cheap LLM key is not an embeddings key

We wanted everything on one inexpensive DeepSeek key. Worth knowing: **DeepSeek's API has no embeddings endpoint** — chat completions only. Any vector backend still needs a separate embedding model. The clean answer is a small *local* embedder (`bge-small`, 384-dim, ~100 MB, no key) — another resident process on a RAM-tight box.

### 5. Ladybug and Holographic — local options worth knowing

Two local providers are worth a mention even though we didn't adopt them. **Ladybug** is a community plugin that backs memory with an embedded graph database (a fork of Kuzu), giving memories a *typed, linked* model — preferences, facts, projects, people, events — with importance scores and named edges, and needing no API key. That data model is more expressive than a flat vector store, and it's a **genuinely promising** project. But it's **young — only about two months old, a couple of commits, effectively a single maintainer** — and it loads its stack (graph DB + ONNX embeddings) in-process and resident, with no idle release. One to *watch and experiment with*, not yet to depend on for a daily driver. **Holographic**, by contrast, is Hermes' zero-dependency escape hatch: pure-Python Holographic Reduced Representations over SQLite — no LLM, no embeddings, no network, no keys. Tiny and fully local; the trade-off is that recall is *algebraic*, not semantic.

### 6. Mind the auxiliary-LLM layer — it's where memory quietly breaks

The pitfall most people miss. Your agent doesn't make one LLM call per turn; it makes **many**, most not to your main model: **context compression**, **title generation, triage, profile description, kanban decomposition**, and — crucially — **memory itself** (extracting facts to *retain*, reasoning over a *recall*) are model calls separate from the main turn.

Two things bit us. First, these auxiliaries defaulted to providers we had **no credit or auth** for, so they failed — and compression was set to **fail *open***, meaning when the summarizer errored it proceeded *without* a summary and **silently dropped context the agent needed**. Memory loss that looks like the model "forgetting" is often a broken auxiliary. We repointed every auxiliary to one funded, cheap model. Second, in **cloud** memory the retain/recall calls are *metered*, so the same levers that control RAM locally now control your bill: retain less often, lean recall budget. Treat the auxiliary layer as first-class: configure it, fund it, pick a cheap model on purpose.

### 7. For a small box, cloud memory is a reasonable default — with an escape hatch

Stack the constraints — 8 GB, no GPU, disk pressure, one cheap LLM key — and a **cloud** memory service is the better engineering choice for *this* box; the agent keeps only a light HTTP client. **mem0 Cloud (free Hobby)** caps at ~**1,000 retrievals/month**, which an always-on agent burns in days; **[Hindsight Cloud](https://hindsight.vectorize.io/)** is usage-based with **no request wall**, tunable via retain/recall frequency. We chose Hindsight Cloud, keeping built-in `MEMORY.md` as the always-on source of truth. The one rule: pick a provider with a real **export** path so cloud stays low-regret — which is also what makes the appendix's migration work in reverse.

### 8. A task board is working memory, too

The most useful thing we learned wasn't about the store. During parallel work — several Discord threads open at once — the agent kept "forgetting" a task, then lost it after a compression. Two facts: **each Discord thread is its own isolated session** (they don't share live context), and compression can summarize an in-flight instruction away. The fix isn't more memory tokens — it's a **shared task board**. Hermes' SQLite-backed `kanban` is durable across every session, thread, and scheduled job, and survives compression. We wired our PR-reviewer to record its work there: the script deterministically creates one task per PR (idempotent — re-reviews append rather than duplicate), the agent only *comments* progress, and the script owns closing/blocking it, so a mid-review compression can't orphan it. The task board as first-class working memory is a direction worth exploring much further.

## Takeaways

- Choose a substrate deliberately and **layer** them; keep the built-in Markdown files as the inspectable source of truth and watch the size cap — it fails silently.
- `--dry-run` any backend install. On a small/ARM/no-GPU box, "local embedded" can mean CUDA and a runtime-mutating dependency set.
- A cheap LLM key ≠ embeddings.
- **Configure and fund the auxiliary-LLM layer deliberately** — compression and memory extraction are where context quietly disappears.
- For constrained boxes, cloud memory is fine *if* it has an export path.
- Don't put durable, multi-step work in the chat; a shared task board is the cross-session working memory that holds up.

The store is half the system. The other half is making sure the agent doesn't lose the thread — and that you can always take your memory with you.

---

# Appendix: Migrating your ChatGPT memories in

Now that there's a system to migrate *into* — built-in files for durable facts, a semantic provider on top, source notes/Obsidian for raw material, skills for procedures, a task board for working memory — here's the validated pipeline for bringing your ChatGPT context across. Remember the framing: the export is **raw source material**, not memory. The work is classification.

## Two exports, two purposes

There are two useful ways to get information out of ChatGPT, and they solve different problems.

**1. OpenAI's official data export** (archival). Per [OpenAI's Help Center](https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data), go to **Settings → Data Controls → Export Data**, confirm, and download the emailed ZIP (the link expires; exports can take time). You can also request data through the Privacy Portal. This is good for archival analysis but **too large and noisy to import directly** — keep it as a private audit trail.

**2. A prompt-based memory export** (the import). [Anthropic's Claude import page](https://claude.com/import-memory) describes the lightweight pattern: copy a prompt into the old provider, ask it to extract the important context, paste the result in. This doesn't migrate every transcript — it migrates the **distilled profile**: preferences, instructions, projects, work style, recurring context. For Hermes, the same idea applies, but the output should be **classified before it touches memory**.

Here is a migration prompt adapted from the Claude-style workflow, tuned for agent memory systems rather than one destination product. The validation in it — verbatim preservation, the uncertain-source label, the strict one-category rule, the per-entry destination + confidence, and the "state whether more remain" loop — is what keeps the import honest:

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

If it says more remain, **continue until the export is complete**. Then do not paste it straight into the agent — put it in a source folder first.

## A classification scheme for the import

Sort each item by how it will be *used*:

- **User profile** — stable facts that shape interaction style (name, role, "prefers concise technical answers"). Compact and stable; these affect the agent across every session.
- **Agent memory** — durable environment/project facts ("this repo's test command is X", "the blog uses Jekyll drafts before publishing"). Not temporary progress or stale artifact IDs.
- **Skills** — procedures don't belong in ordinary memory. "When debugging this pipeline, run these five commands in order" becomes a skill: triggers, exact steps, pitfalls, verification. Procedural memory is operational — a bad procedure makes the agent repeat the same failure forever.
- **Project notes / Obsidian** — background too detailed for always-loaded memory but worth searching sometimes. If the agent may need to search it occasionally but shouldn't read it every session, it belongs in notes, not memory.
- **Scheduled tasks / commitments** — "follow up after the interview tomorrow" is a scheduled task, not a permanent memory. OpenClaw's docs draw the same line: commitments differ from durable facts.
- **Discard / archive** — stale phase status, old PR numbers and commit hashes, "currently working on…", temporary approvals, contradicted preferences, sourceless facts. *A useful import is the smallest set that improves future behavior, not the largest.*

## The pipeline

1. **Export raw account data** (official export) — audit trail, stored privately.
2. **Run the structured export prompt** — continue until no memories remain.
3. **Save the export as source material** — a source folder or Obsidian note; don't inject it yet.
4. **Normalize each entry** — assign scope (global user / project / environment / procedure / temporary / archive), durability (permanent / long-lived / short-lived / expired), confidence (high / medium / low), source (explicit / inferred / unknown), destination.
5. **Promote only high-confidence durable entries** — compact facts → user profile / agent memory; reusable workflows → skills; detail → notes; stale → discard.
6. **Run an initial consolidation/review pass** — which entries contradict, which are too temporary, which instructions are unsafe without action boundaries (see the disclaimer up top), which should become skills, which need human review.
7. **Schedule recurring consolidation ("dreaming")** — memory cleanup is routine, not one-time. Run it *asynchronously, off the critical path*; *don't overwrite the source*; produce a **reviewable diff** (additions, removals, merges) with evidence; prefer recency only with evidence; and separate cleanup from promotion (a discovered lesson should still clear a confidence threshold or human review). A dream that can't cite *why* it wants to delete or rewrite a memory shouldn't be allowed to mutate the store.

The target is a memory system that is **transparent** (you can see what the agent believes), **scoped** (project memories don't bleed across work), **action-aware** (approvals and risky instructions carry boundaries), and **self-cleaning**. Migrating memories isn't a one-time copy-paste; it's the start of a memory operating system you own.

## Side note: sharing a single ChatGPT conversation with your agent

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
