---
layout: post
title: "Migrating Out of ChatGPT: Memory You Own, on an Agent That Runs Your Code"
summary: "Why and how to move off subscription memory toward something you own and run yourself. First what to migrate into — how Hermes agent memory actually works and the pitfalls we hit (including the auxiliary-LLM layer) — then, as an appendix, the practical pipeline for migrating your ChatGPT memories in."
tags:
  - ai-agents
  - memory
  - hermes-agent
  - personal-agent
  - hindsight
  - kanban
  - chatgpt
  - migration
---

If you pay for ChatGPT or Claude, your "memory" lives on someone else's servers, governed by someone else's product decisions, and bound to one assistant. This post is about migrating *out* of that — toward memory you own, on an agent you run yourself.

The reason it's worth the effort isn't just data ownership. It's that a self-hosted agent can do things a subscription assistant won't. The agent this is written for — a self-hosted [Hermes](https://hermes-agent.nousresearch.com/) — doesn't just *read* a pull request and opine. It checks out the branch, installs dependencies, **runs the tests, and exercises real scenarios** before it comments. That's well beyond what a read-only "sandbox" memory provider is willing to give you.

> **Security disclaimer.** Running untrusted code from PR branches is powerful and dangerous. Doing it safely needs strict mechanisms — **allowlists for trusted authors**, scrubbing of untrusted inputs, and tight action boundaries — so a hostile PR can't turn your agent into a foothold. We'll cover that hardening in a future article. Until then: only point this kind of automation at repositories and authors you control.

But before you migrate anything *in*, you need to know what you're migrating *into*. So we'll first establish how Hermes' memory actually works and the pitfalls we hit standing it up — then, in the appendix, the practical pipeline for bringing your ChatGPT memories across.

## How Hermes agent memory actually works

Hermes (like OpenClaw and Claude's project memory) starts with a built-in memory that is just plain Markdown the agent reads and writes: a `MEMORY.md` of durable facts and a `USER.md` profile. The appeal is real — transparent, inspectable, version-controllable; the model only "remembers" what's literally on disk.

On top of that, Hermes supports a pluggable **external memory provider** for semantic recall — and crucially, a layered model: the built-in files stay the **inspectable source of truth**, while the provider adds embedding search and synthesis. The built-in layer is always on; the external one is optional and swappable.

That sounds clean. Standing it up taught us where the sharp edges are.

## The pitfalls (what we actually hit)

### 1. The built-in file memory has a silent ceiling

Built-in memory has a character cap (ours was 2,200). One day the agent quietly started **refusing to store new memories** — `Memory at 2,113/2,200 chars; adding this entry would exceed the limit`. It didn't fail loudly; it just stopped learning. Two more failure modes follow from a flat growing file: **entropy** (duplicates, stale corrections, contradictions accumulate into "memory debt") and **no semantic recall** (the agent only finds what it wrote verbatim and can grep for; rephrase the question and it misses). The file layer is a great source of truth — but you want a semantic layer on top.

### 2. "Local embedded" backends can try to reshape your runtime

Hindsight has a tempting local-embedded mode: an on-instance daemon with built-in Postgres that auto-stops when idle, local embeddings, your own LLM key for extraction. Lovely on paper. But a dry-run of the install told a different story — the local stack resolved to **159 packages including the full CUDA toolkit** (useless on a GPU-less ARM box) and wanted to **downgrade `cryptography` inside the agent's own virtualenv**. Lesson: `--dry-run` any backend install and read what it touches. A memory layer should never get to mutate your agent's dependencies.

### 3. "Just run mem0 locally" is not a flag you flip

mem0 is the obvious open-source choice, and Hermes ships a mem0 plugin — but the stock plugin is **Mem0-Cloud only**: it instantiates the hosted client and needs a Mem0 API key. Self-hosted/OSS mode is an *open, unmerged feature request*, not shipped. "Local mem0" means writing a custom provider, not selecting one.

### 4. A cheap LLM key is not an embeddings key

We wanted everything on one inexpensive DeepSeek key. Worth knowing: **DeepSeek's API has no embeddings endpoint** — chat completions only. Any vector backend still needs a separate embedding model. The clean answer is a small *local* embedder (`bge-small`, 384-dim, ~100 MB, no key) — but that's another resident process on a RAM-tight box.

### 5. Mind the auxiliary-LLM layer — it's where memory quietly breaks

This is the pitfall most people miss. Your agent doesn't make one LLM call per turn; it makes **many**, most of them not to your main model:

- **Context compression** summarizes long conversations.
- **Title generation, triage, profile description, kanban decomposition** each call a model.
- **Memory itself is auxiliary-LLM activity:** extracting facts to *retain*, and reasoning over a *recall* — whether built-in or a cloud provider — are model calls separate from the main turn.

Two things bit us here. First, these auxiliaries were defaulting to providers we had **no credit or auth** for, so they failed — and compression was configured to **fail *open***, meaning when the summarizer errored it proceeded *without* a summary and **silently dropped context the agent needed**. Memory loss that looks like the model "forgetting," but is really a broken auxiliary. We repointed every auxiliary (compression, titles, extraction, etc.) to a single funded, cheap model (`deepseek-v4-flash`).

Second, in **cloud** memory the retain/recall calls are *metered*. So the same levers that control RAM locally now control your bill: retain less often, use a leaner recall budget. Treat the auxiliary layer as a first-class part of your memory design — configure it, fund it, and pick a cheap model for it on purpose.

### 6. For a small box, cloud memory is a reasonable default — with an escape hatch

Stack the constraints together — 8 GB, no GPU, disk pressure, one cheap LLM key — and a **cloud** memory service is the better engineering choice for *this* box. The agent keeps only a light HTTP client. Between the two we had keys for: **mem0 Cloud (free Hobby)** caps at ~**1,000 retrievals/month**, which an always-on agent burns through in days; **Hindsight Cloud** is usage-based with **no request wall**, and you tune cost via retain/recall frequency. We chose Hindsight Cloud, keeping built-in `MEMORY.md` as the always-on source of truth. The one rule: only pick a provider with a real **export** path, so cloud stays a low-regret choice rather than lock-in — which, conveniently, is also what makes the migration in the appendix possible in reverse.

### 7. A task board is working memory, too

The most useful thing we learned wasn't about the store. During parallel work — several Discord threads open at once — the agent kept "forgetting" a task, then lost it entirely after a compression. Two facts explain it: **each Discord thread is its own isolated session** (they don't share live context), and compression can summarize an in-flight instruction away. The fix isn't more memory tokens — it's a **shared task board**. Hermes' SQLite-backed `kanban` is durable across every session, thread, and scheduled job, and survives compression. We wired our PR-reviewer to record its work there: the script deterministically creates one task per pull request (idempotent, so re-reviews append rather than duplicate), the agent only *comments* progress, and the script owns closing or blocking it — so a mid-review compression can never orphan it. It's a direction worth exploring much further: the task board as first-class working memory for multi-step, parallel work.

## Takeaways

- Keep the built-in Markdown files as the inspectable source of truth; add a backend for semantic recall. Watch the size cap — it fails silently.
- `--dry-run` any backend install. On a small/ARM/no-GPU box, "local embedded" can mean CUDA and a runtime-mutating dependency set.
- A cheap LLM key ≠ embeddings.
- **Configure and fund the auxiliary-LLM layer deliberately** — compression and memory extraction are where context quietly disappears.
- For constrained boxes, cloud memory is fine *if* it has an export path.
- Don't put durable, multi-step work in the chat; a shared task board is the cross-session working memory that holds up.

The store is half the system. The other half is making sure the agent doesn't lose the thread — and that you can always take your memory with you. That last point is what makes the migration below safe to do in either direction.

---

# Appendix: Migrating your ChatGPT memories in

Now that there's a system to migrate *into* — built-in files for durable facts, a semantic provider on top, skills for procedures, a task board for working memory — here's the practical pipeline for bringing your ChatGPT context across. The first problem in migrating memories out of ChatGPT is not extraction. It is **classification**: a memory export is a mixture of preferences, project summaries, stale corrections, private facts, temporary commitments, and instructions that made sense in one product but are dangerous in another. Paste that blob straight in and you don't get continuity — you get memory debt. Treat the export as raw source material and sort it.

## Two exports, two purposes

**1. Official data export** (archival): in ChatGPT, **Settings → Data Controls → Export Data**, confirm, and download the emailed ZIP. Store it privately. This is your audit trail, not your import — too large and noisy to load directly.

**2. Prompt-based memory export** (the import): ask ChatGPT to distil its durable context. Tuned for agent memory rather than one destination product:

```text
Export all of my stored memories and any durable context you have learned about me
from past conversations. Preserve my words verbatim where possible, especially for
instructions, preferences, corrections, and standing rules.

Only include information that appears in stored memory or durable cross-chat context.
Do not invent facts from this conversation. If you are unsure whether something is
stored memory or inferred from chat history, label it as uncertain.

Classify each item into exactly one category:
1. Instructions: explicit rules for future conversations (tone, format, approvals, safety).
2. Identity: stable personal facts (name, location, languages, interests).
3. Career: roles, organizations, skills, domains, responsibilities.
4. Projects: one entry per project — name, purpose, status, key decisions, repo if known.
5. Preferences: working style, tool choices, writing/learning preferences, taste.
6. Environment: durable machine, account, repo, deployment, or toolchain facts.
7. Procedures: reusable workflows or lessons that should become skills, not memory.
8. Temporary/expiring: reminders, deadlines, one-off tasks, pending approvals.
9. Contradictions/uncertainty: entries that conflict, look outdated, or need review.

For each entry, output: category; date if known else [unknown]; source confidence
(high/medium/low); exact memory text; recommended destination (user profile, agent
memory, skill, project note, scheduled task, archive, discard); and a one-line reason.

Wrap the entire export in a single Markdown code block. After it, state whether more
memories remain.
```

If it says more remain, continue until complete. Then **do not paste it straight into the agent** — put it in a source folder first.

## A classification scheme for the import

Sort each item by how it will be *used*:

- **User profile** — stable facts that shape interaction style (name, role, "prefers concise technical answers"). Compact and stable.
- **Agent memory** — durable environment/project facts ("this repo's test command is X", "the blog uses Jekyll drafts"). Not temporary progress or stale IDs.
- **Skills** — procedures don't belong in ordinary memory. "When debugging this pipeline, run these five commands in order" becomes a skill: triggers, exact steps, pitfalls, verification. A bad procedure makes the agent repeat a failure forever.
- **Project notes / Obsidian** — background too detailed for always-loaded memory but worth searching sometimes. Inspectable, linkable, prunable.
- **Scheduled tasks / commitments** — "follow up after the interview tomorrow" is a scheduled task, not a permanent memory.
- **Discard / archive** — stale phase status, old PR numbers and commit hashes, "currently working on…", temporary approvals, contradicted preferences, sourceless facts. *A useful import is the smallest set that improves future behavior, not the largest.*

## The pipeline

1. **Export raw account data** (official export) — audit trail, stored privately.
2. **Run the structured export prompt** — continue until no memories remain.
3. **Save the export as source material** — a source folder or Obsidian note; don't inject it yet.
4. **Normalize each entry** — assign scope (global/project/environment/procedure/temporary/archive), durability, confidence, source, destination.
5. **Promote only high-confidence durable entries** — compact facts → user profile / agent memory; reusable workflows → skills; detail → notes; stale → discard.
6. **Run an initial review/consolidation pass** — which entries contradict, which are too temporary, which instructions are unsafe without action boundaries, which should become skills, which need human review.
7. **Schedule recurring consolidation** — memory cleanup is routine, not one-time. A weekly/monthly pass reviews recent sessions, memory changes, and unresolved contradictions, and proposes a *reviewable diff* (additions, removals, merges) with evidence — never a silent mutation.

The target is a memory system that is **transparent** (you can see what the agent believes), **scoped** (project memories don't bleed across work), **action-aware** (approvals and risky instructions carry boundaries — see the security disclaimer up top), and **self-cleaning**. Migrating memories isn't a one-time copy-paste; it's the start of a memory operating system you own.

## Side note: handing a single ChatGPT conversation to your agent

Sometimes you don't want your whole profile — just one useful conversation as source material. Public ChatGPT **share links** are ideal because they can be fetched without giving the agent your account. A small procedural skill makes the handoff one line: *"fetch this ChatGPT share into `/data`: https://chatgpt.com/share/…"*. The agent downloads it as Markdown/HTML with a tool like [`csctf`](https://github.com/Dicklesworthstone/chat_shared_conversation_to_file), spot-checks it, and reports the paths.

```bash
# install (Bun); review any installer before piping remote code to a shell
export BUN_INSTALL="$HOME/.bun"; export PATH="$BUN_INSTALL/bin:$PATH"
command -v bun >/dev/null || { curl -fsSL https://bun.sh/install -o /tmp/bun-install.sh && bash /tmp/bun-install.sh; }
git clone https://github.com/Dicklesworthstone/chat_shared_conversation_to_file "$HOME/csctf" && cd "$HOME/csctf"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 bun install && bun run build

# fetch a share into a stable path
csctf 'https://chatgpt.com/share/<id>' --timeout-ms 90000 --outfile /data/chatgpt-shares/chatgpt-share-<id>
```

Two cautions: it only works on **public** share URLs (private history needs the official export above), and **a transcript is evidence, not memory** — the agent still has to decide whether it contains a durable preference, a project note, a reusable procedure, a temporary task, or nothing worth promoting. Which brings us back to the whole point: the value isn't in copying everything across. It's in owning a system disciplined enough to keep only what makes the agent better.
