---
layout: post
title: "Giving a Personal Agent a Memory That Holds Up"
summary: "Practical notes from setting up long-term memory for a self-hosted personal agent: where the built-in file memory breaks, what we learned trying local and cloud memory backends, why DeepSeek can't embed, and how a task board turned out to matter as much as the memory store."
tags:
  - ai-agents
  - memory
  - hermes-agent
  - personal-agent
  - hindsight
  - kanban
---

Most writing about agent memory starts with importing your ChatGPT history. That's the easy part. The hard part is the system you import *into*: what your long-running personal agent should remember every turn, what it should be able to search, what should expire, and where all of that actually lives on a small box you pay for yourself.

This is a field report from doing exactly that on a self-hosted [Hermes](https://hermes-agent.nousresearch.com/) agent running on a modest cloud VM — an 8 GB ARM instance with no GPU, already running other services. The constraints turned out to drive every decision, so I'll be concrete about them.

## Where you start: built-in file memory, and where it breaks

Hermes (like OpenClaw and Claude's project memory) ships a built-in memory that is just plain Markdown the agent reads and writes: a `MEMORY.md` of durable facts and a `USER.md` profile. The appeal is real — it's transparent, inspectable, version-controllable, and the model only "remembers" what's literally on disk. For a while this is enough.

Then you hit the edges, and they're worth naming because they're what justify everything that follows:

- **The hard size cap.** Built-in memory has a character limit (ours was 2,200). One day the agent quietly started *refusing to store new memories* — `Memory at 2,113/2,200 chars; adding this entry would exceed the limit`. It didn't fail loudly; it just stopped learning. Raising the cap buys time, but a flat file that only grows is not a long-term memory.
- **Entropy.** A single growing file accumulates duplicates, stale corrections, and contradictions. Without curation it becomes memory debt rather than memory.
- **No semantic recall.** The agent "remembers" only what it wrote verbatim and can grep for. Ask it something phrased differently from how the fact was stored and it misses. There's no notion of *related* memories, consolidation, or "what do I believe about X, and why."

So the built-in layer is a great **source of truth** — but you want a second, semantic layer on top for real recall. Keep the files; add a backend. That framing — built-in files as the inspectable ground truth, an external provider for semantic recall and synthesis — is the architecture worth aiming for. The interesting question is *which backend*, and here the small-box constraints bite hard.

## Picking a backend: what actually happened

Hermes supports a list of pluggable external memory providers (honcho, mem0, hindsight, holographic, ladybug, and more). On paper several looked perfect. In practice:

**"Local embedded" backends can quietly try to reshape your runtime.** Hindsight has a tempting local-embedded mode: an on-instance daemon with built-in Postgres that auto-stops when idle, local embeddings, and your own LLM key for extraction. Lovely on paper. But a dry-run of the install told a different story: the local stack resolved to **159 packages including the full CUDA toolkit** — useless on a GPU-less ARM box — and it wanted to **downgrade `cryptography` inside the agent's own virtualenv**. Installing it would have bloated a near-full disk and mutated the runtime the agent depends on. Lesson: before adopting any memory backend, `--dry-run` the install and read what it touches. A memory layer should never get to downgrade your agent's dependencies.

**"Just run mem0 locally" is not a flag you flip.** mem0 is the obvious open-source choice, and Hermes ships a mem0 plugin — but the stock plugin is **Mem0-Cloud only**: it instantiates the hosted `MemoryClient` and needs a Mem0 API key. Self-hosted/OSS mode (point it at a local embedder + your own vector store) is an *open, unmerged feature request*, not shipped. So "local mem0" means writing a custom provider, not selecting one. Good to know before you plan around it.

**A cheap LLM key is not an embeddings key.** We wanted to run everything through one inexpensive DeepSeek key. Worth knowing: **DeepSeek's API has no embeddings endpoint** — it's chat-completions only. Any vector-search backend (mem0, Hindsight local, etc.) still needs a separate embedding model. The clean answer is a small *local* embedder (e.g. `bge-small`, 384-dim, ~100 MB, no key), but that's another resident process on a box where RAM is the binding constraint.

**Ladybug — genuinely interesting, but early.** One community plugin, Ladybug, backs its memory with an embedded graph database (a fork of Kuzu) and gives memories a *typed, linked* model — preferences, facts, projects, people, events — with importance scores and named edges. That data model is more expressive than a flat vector store, and it needs no API key. But it's **young**: a couple of months old, a handful of commits, effectively a single maintainer, and it loads its stack (graph DB, ONNX embeddings, more) **in-process and resident** — no idle release on a box that's already swapping. It's a project to *watch and experiment with*, not yet one to depend on for a daily driver.

**Holographic — the zero-dependency escape hatch.** If privacy and footprint dominate, Hermes' `holographic` provider is pure-Python Holographic Reduced Representations over SQLite: no LLM, no embeddings, no network, no keys. Tiny and fully local. The trade-off is that recall is *algebraic*, not semantic — closer to clever keyword/structure matching than to embedding search.

## The pragmatic answer for a small box: go cloud (carefully)

Stack all those constraints together — 8 GB, no GPU, disk pressure, one cheap LLM key — and the honest conclusion is that for *this* box, a **cloud** memory service is the better engineering choice. It sidesteps the CUDA/venv/embedder mess entirely; the agent keeps only a light HTTP client.

Between the two cloud options we had keys for:

- **mem0 Cloud (free Hobby tier)** is genuinely free, but the binding limit is **~1,000 retrievals per month**. An always-on agent that recalls roughly once per turn, across multiple threads and scheduled jobs, burns through that in *days*. Free, but not for an always-on agent.
- **Hindsight Cloud** is usage-based with **no request wall** — you pay per token, and the levers that controlled *RAM* locally now control *cost*: retain less often, use a leaner recall budget, and the bill drops. Recall is cheap; the "retain" (write) path is the cost driver, so tuning how often you retain matters most.

We went with Hindsight Cloud, with retain throttled and a mid recall budget, keeping the built-in `MEMORY.md` as the always-on source of truth underneath. The one caveat to take seriously: **cloud means your memory leaves the box**, so only pick a provider with a real export path. (Both mem0 and Hindsight offer `get_all`/export, so you can migrate or repatriate later — which makes starting on cloud a low-regret move rather than a lock-in.)

## The surprise lever: a task board is working memory too

The most useful thing we learned wasn't about the memory store at all.

Symptom: during a burst of parallel work — several Discord threads open at once, driving a multi-step implementation — the agent kept "forgetting" a task it had been asked to do. It had to be reminded repeatedly, then lost it entirely after a context compression.

Two facts explain it. First, **each Discord thread is its own isolated agent session** — parallel threads don't share live context; they only share what's been flushed to the global memory files. Second, when a session's context gets long, Hermes **compresses** the middle of the conversation into a summary; an in-flight instruction that isn't a "durable fact" can simply be summarized away.

The fix isn't more memory tokens. It's a **shared task board**. Hermes has a SQLite-backed `kanban` that's durable across every session, thread, and scheduled job. A task created in one thread is visible to the agent in another, and — unlike chat context — it *survives compression*. So durable action items belong on the board, not in the conversation.

We started putting this to work by wiring our PR-reviewer to record its work as kanban tasks: the script deterministically creates one task per pull request (idempotent, so re-reviews append rather than duplicate), the agent only *comments* progress on it ("ran the tests, posted the review, here's the link"), and the script owns closing or blocking the task — so a mid-review compression can never orphan it. The board becomes a human-visible audit trail *and* a piece of cross-session working memory. It's an area we want to explore much further: treating the task board as first-class memory for multi-step and parallel work, alongside the semantic store.

## Takeaways

If you're giving a personal agent a memory:

- **Keep the built-in Markdown files** as the inspectable source of truth; add a backend for semantic recall rather than replacing them. Watch the size cap — it can fail silently.
- **Dry-run any backend install** and read what it pulls in. On a small/ARM/no-GPU box, "local embedded" can mean CUDA and a runtime-mutating dependency set.
- **A cheap LLM key ≠ embeddings.** Plan a local embedder, or let a cloud backend handle it.
- **For constrained boxes, cloud memory is a reasonable default** — but only with an export path so it stays a low-regret choice.
- **Don't put durable, multi-step work in the chat.** Parallel sessions are isolated and compression forgets; a shared task board is the cross-session working memory that actually holds up.

The store is half the system. The other half is making sure the agent doesn't lose the thread.
