# Blog brief: "From a rented cloud box to a GPU under the desk" — the Hermes self-hosting journey

**Purpose:** this is a source brief for Hermes to write a first-person blog post (sakul-learning blog,
Jekyll). It is the *raw timeline + learnings*, not the post. The voice should be the operator's:
practical, honest about tradeoffs, light on hype. Frame the arc as **trial → real use → hitting a wall
→ repurposing hardware we already owned → migrating SaaS to local, and what's actually worth running
locally on dated hardware vs. what still belongs in the cloud.**

---

## Cast (the three machines)

- **EC2 box ("the rented trial")** — AWS `t4g.large`, ARM64/Graviton, **2 vCPU / 8 GB RAM, no GPU**,
  Ubuntu 26.04, us-east-1. A stable Elastic IP, a 120 GB `/data` volume, a tiny 20 GB root that kept
  filling up, and a nightly stop/start schedule to save compute cost. Cheap to start, but every
  constraint that mattered later traces back to "small, ARM, no GPU."
- **podmaster ("the desk")** — a desktop we already had: Intel **i5-12400F (6c/12t), 32 GB RAM,
  GTX 1650 (4 GB VRAM)**, 1 TB NVMe, **Arch Linux** running a Hyprland desktop. The CPU has no iGPU,
  so the one GPU is shared between the desktop and any ML we run.
- **hermes-vm ("the new home")** — an Ubuntu 24.04 KVM guest on podmaster, x86_64, 4 vCPU / 8 GB,
  bridged onto the LAN. Where the agent actually lives now.

---

## Timeline (chronological, with the why at each step)

### Act 1 — Standing up the trial (early June 2026)
Spun up the EC2 box purely to *try* a self-hosted [Hermes](https://hermes-agent.nousresearch.com/)
agent without committing hardware. Wired it to Discord (the family/team chat surface), gave it a
persona (SOUL.md), and pointed it at a model: **gpt-5.5 via OpenAI Codex (ChatGPT Plus)** with a
**DeepSeek** metered fallback for when the Plus quota hit rate limits. Cost discipline from day one:
a nightly EventBridge stop/start so the box only ran during waking hours.

### Act 2 — The agent earns its keep (use cases emerge)
The trial stopped being a toy once it had jobs. What stuck:
- **PR review** — not "read the diff and opine," but *check out the branch, install deps with the
  right package manager (pnpm/yarn via corepack), run the tests, then comment.* Pollers watched
  `open-constructs/cdk-terrain` and `skillrig/cli`, each PR reviewed in an isolated git worktree.
- **A blog** — drafting source-grounded AI round-ups and publishing via GitHub Pages (Jekyll), as the
  identity `sakul-learning`, over SSH + `gh`.
- **An email watcher** (AgentMail → Discord) and a **3×/day AI feed**.
This is the thesis that justifies self-hosting at all: a self-hosted agent will *run things* — tests,
real scenarios, scratch environments — that a read-only SaaS assistant simply won't.

### Act 3 — Hitting the memory wall
The agent could *act*, but it couldn't reliably *remember*. Early memory leaned on conversation-
transcript search; durable, cross-session recall needed a real memory layer. The exploration (worth
telling honestly):
- Looked at owned Postgres/pgvector, mem0, and **Hindsight** (vectorize-io). Lesson worth keeping:
  *nearest-neighbour search is retrieval, not memory judgment* — a table finds similar notes; it
  can't decide which preference is global, which note is stale, which lesson should become a skill.
- Tried Hindsight's tempting **local-embedded** mode on the EC2 box. A `--dry-run` of the install
  resolved to **159 packages including the full CUDA toolkit** (useless on a GPU-less ARM box) and
  wanted to **downgrade `cryptography` inside the agent's own virtualenv**. Hard no. **Lesson:
  `--dry-run` any memory backend and read what it touches — a memory layer must never mutate your
  agent's dependencies.**
- So we settled for **Hindsight *Cloud*** — usage-based, zero box footprint — explicitly *because the
  EC2 box had no GPU and a fragile shared venv.* It worked, but it was a SaaS dependency for the most
  personal data the agent holds.

### Act 4 — Repurposing the desktop + its GPU
The unlock: we already owned a desktop with a **GPU sitting idle most of the day**. The plan — keep
the heavy, hardware-hungry services on the Arch host, run the agent in a VM, and talk to host
services over a private link:
- KVM/libvirt + a **LAN bridge (`br0`)** so the laptop can SSH the VM directly, plus a second NIC on
  libvirt's NAT net (`virbr0`) as a **private host-services path**. The dangerous part — building the
  bridge over the live SSH interface — was de-risked with a MAC-cloned bridge (same DHCP lease, same
  IP) and a dead-man auto-revert timer.
- **Firecrawl** moved to the host (x86_64, so images build locally instead of the EC2 arm64 image
  swap), bound to the NAT gateway `192.168.122.1:3002` — reachable by the VM, **never the LAN**.
- **Local Hindsight** finally became possible: the GPU that the EC2 box never had.

### Act 5 — The SaaS-to-local migration + cutover (2026-06-08, one day)
- Re-created the agent on the VM (fresh x86_64 install pinned to the EC2 commit for config parity),
  copied the *portable* profile (config, secrets, scripts, internal crons, skills, kanban) but **not**
  arch-specific runtime — and re-provisioned toolchains from source via `mise`. gh auth + the blog
  SSH key carried over; `/data` was recreated as a plain dir on the single disk.
- **Local Hindsight** stood up in an **isolated `uv` venv** on the host (the fix for Act 3's shared-
  venv hazard): `hindsight-all` (anti-squat note: plain `pip install hindsight` is an *unrelated*
  Chrome-forensics tool), **bge-small embeddings + a cross-encoder reranker on the GPU**, an embedded
  pgvector Postgres, bound to `192.168.122.1:8888`. Ran as a *user* systemd service with linger
  (the host's sudo needs a password — a user service sidesteps that).
- **Cutover:** stopped + disabled the EC2 gateway (so it can't reclaim the single Discord identity),
  clean-copied the live `state.db`, started the VM gateway → `✓ discord connected`. **Migrated 41
  memories cloud → local.** Then disabled the EC2 nightly schedules and stopped the instance; full
  termination is parked on a soak reminder.

### Act 6 — What we learned about local LLMs on dated hardware
The honest punchline. The GTX 1650 has **4 GB VRAM, shared with the desktop (~2.5 GB), leaving
~1 GB free.** That budget decides everything:
- **Runs great locally:** the *embedding* model (`bge-small`, ~130 MB, ~300 MB on GPU idle / ~800 MB
  under load) and the reranker. This is the part that benefits most from being local — your memory
  vectors and similarity search never leave the box.
- **Does NOT fit locally:** a *capable reasoning LLM*. Hindsight's "thinking"/consolidation step —
  deciding what's a durable fact, what's stale, what to merge — needs real model quality, and you
  can't run that alongside embeddings in ~1 GB of VRAM. So we deliberately point that one step at a
  **cloud LLM (DeepSeek "flash")** — cheap, metered, zero VRAM.
- **The net design is hybrid, and that's the lesson:** put the *data-resident, embarrassingly-
  parallel* work (embeddings, vector store) on the local GPU for ownership and cost; keep the
  *judgment* work on a capable cloud model. "Local memory" doesn't have to mean "local everything" —
  it means the data and the index stay yours, and only an anonymized reasoning call goes out.

---

## Threads to weave through the post (gotchas worth being honest about)
- **`--dry-run` everything**; a memory backend that downgrades your agent's `cryptography` is a no.
- **Optional deps bite twice:** a fresh Hermes install silently omitted `discord.py` (gateway
  couldn't connect) and `hindsight-client` (memory tool failed at runtime *while* `doctor` reported
  the provider "available" — config-check ≠ import-check).
- **Name-squatting is real:** the agent-memory package is `hindsight-all`/`hindsight-client`
  (vectorize-io); plain `hindsight` on PyPI is something else entirely.
- **The boring constraints win:** ARM vs x86 (image builds), a password-gated host sudo (→ user
  systemd services), a single disk with no `/data` volume, and a GPU you share with your own desktop.
- **Memory routing is subtle:** the agent often answers from conversation-transcript search and only
  auto-recalls long-term memory every N turns — so "it answered correctly" isn't proof the new memory
  path fired. Test with an empty context.

## The takeaway (suggested thesis)
A rented cloud box is the right way to *discover* whether a self-hosted agent earns its place. But
once it does, the constraints that make the trial cheap (small, ARM, no GPU) are exactly the ones that
cap it. Repurposing hardware you already own — a desktop GPU that's idle most of the day — turns the
most personal, recurring costs (memory, web-reading) into owned infrastructure, while you keep paying
the cloud only for the narrow slice that genuinely needs a frontier model. The migration is a day of
fiddly plumbing; the payoff is ownership of the agent's brain.

---
*Concrete dates/IDs for accuracy: EC2 trial early June 2026 → VM cutover & local-Hindsight stand-up
2026-06-08 → EC2 stopped 2026-06-08, termination reminder 2026-06-11. Source material: the operator's
session notes + the companion post `2026-06-03-migrating-chatgpt-memories-agent-memory`.*
