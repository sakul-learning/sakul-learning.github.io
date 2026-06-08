---
layout: post
title: "From a Rented Cloud Box to a GPU Under the Desk"
summary: "A practical timeline of moving a self-hosted Hermes Agent from a small AWS EC2 trial to a desktop-hosted VM with local memory infrastructure: what worked, what broke, and why the final answer is hybrid rather than fully local."
tags:
  - ai-agents
  - hermes-agent
  - self-hosting
  - migration
  - aws
  - gpu
  - memory
  - hindsight
  - firecrawl
source_folder: sources/migrating-hermes-agent-cloud-to-local
sources:
  - title: "Hermes Agent"
    url: "https://hermes-agent.nousresearch.com/"
    note: "The self-hosted agent framework used for Discord, PR review automation, scheduled jobs, tools, skills, and memory."
  - title: "Migrating Out of ChatGPT: Memory You Own, on an Agent That Runs Your Code"
    url: "/2026/06/03/migrating-chatgpt-memories-agent-memory.html"
    note: "Companion post on memory substrates, migration, and why self-hosted agents need durable cross-session recall."
---

A few days ago my Hermes Agent lived on a rented AWS box. Today it lives in an Ubuntu VM on a desktop under the desk, with a local memory stack reachable over a private virtual network and just enough GPU to make the parts that matter feel owned.

That sounds cleaner than it was.

The actual path was: rent something small, find out whether the agent earns its keep, hit the limits of small cloud hardware, repurpose a desktop we already owned, then decide which parts really belong locally and which parts still make sense in the cloud. The important lesson is not "local good, cloud bad." It is that different parts of an agent have very different hardware and trust profiles.

## Act 1: the rented trial

The first Hermes box was deliberately modest: an AWS `t4g.large` in `us-east-1`, ARM64/Graviton, 2 vCPU, 8 GB RAM, no GPU. It had a stable Elastic IP, a 120 GB `/data` volume for working state, and a tiny 20 GB root disk that repeatedly reminded me it was tiny. To keep cost under control, an EventBridge schedule stopped and started the instance around waking hours.

That was the right starting point. I did not know yet whether a self-hosted agent was going to be a useful piece of infrastructure or just another weekend experiment. A small rented box made the trial reversible.

The initial setup was simple in spirit: install [Hermes](https://hermes-agent.nousresearch.com/), connect it to Discord, give it a persona, configure tools and scheduled jobs, and point it at a model. In practice it used `gpt-5.5` through OpenAI Codex as the main model, with DeepSeek as a cheaper metered fallback when quota pressure showed up.

At that stage the cloud box was a good fit. It was cheap enough, always reachable enough, and isolated from my laptop. Most importantly, it let me test the workflow without committing to local hardware or network plumbing.

## Act 2: the agent became useful

The trial stopped being a toy when the agent started doing jobs that I would not expect from a normal SaaS chat assistant.

The biggest one was pull request review. Not just "read the diff and give an opinion," but: check out the branch, install dependencies with the repository's package manager, run tests, inspect failures, and only then comment. For `open-constructs/cdk-terrain` and `skillrig/cli`, pollers watched PRs and reviewed them in isolated git worktrees.

That distinction matters. A read-only assistant can summarize a diff. A self-hosted agent can run the code. It can create scratch environments, execute the same commands a maintainer would run, and produce feedback grounded in real tool output.

The same box also picked up the blog workflow for this site, using GitHub Pages and Jekyll under the `sakul-learning` identity. It handled source-grounded drafts, local builds, commits, and publishing. On top of that came smaller but useful jobs: an email watcher that forwarded AgentMail events to Discord, and a three-times-per-day AI feed.

That is the point where self-hosting started to make sense. The agent was no longer a novelty; it was infrastructure.

## Act 3: the memory wall

Execution was the first win. Memory was the first wall.

Early on, Hermes could search previous conversation transcripts. That helps, but transcript search is not the same as durable memory. A transcript can tell the agent that something was said. It cannot reliably decide whether that statement is still true, whether it was a one-off task, whether it should become a persistent preference, or whether it belongs in a reusable skill instead of ordinary memory.

So I looked at a few paths: owned Postgres with pgvector, mem0, and Hindsight. The lesson I kept coming back to was simple: nearest-neighbour search is retrieval, not memory judgment. A vector table can find similar notes. It cannot, by itself, decide which preferences are global, which environment facts are stale, and which procedures should be promoted into skills.

Hindsight was attractive because it tries to provide that memory layer rather than just a bare vector store. The problem was the EC2 box.

I tried Hindsight's local embedded install path cautiously, starting with a dry run. That dry run resolved to 159 packages, including the full CUDA toolkit, on a GPU-less ARM instance. Worse, it wanted to downgrade `cryptography` inside the agent's own virtualenv. That was an immediate stop.

The lesson is worth spelling out: dry-run any memory backend before you install it, and read what it touches. A memory layer should not mutate the agent's runtime out from underneath it.

On the EC2 box the pragmatic answer was Hindsight Cloud. It had no local footprint, avoided the fragile shared virtualenv problem, and worked well enough. But it also meant that the most personal part of the agent — long-term memory — lived in another SaaS service. That was acceptable for the trial. It was not the endpoint I wanted.

## Act 4: the GPU under the desk

The hardware answer was already in the room: a desktop called `podmaster`, with an Intel i5-12400F, 32 GB RAM, a 1 TB NVMe, and a GTX 1650 with 4 GB VRAM. It runs Arch Linux and a Hyprland desktop. The CPU has no integrated GPU, so the GTX 1650 is shared between the display and any ML workload, but most of the day it is still sitting there underused.

The design became:

- keep the heavy, hardware-sensitive services on the Arch host;
- run the Hermes gateway itself in an Ubuntu 24.04 KVM VM;
- bridge the VM onto the LAN so I can administer it directly;
- add a private host-services path over libvirt NAT for services that should be reachable from the VM but not from the LAN.

The scary part was networking. Building a bridge over the live SSH interface is exactly the kind of change that can lock you out. The fix was to treat it like a migration with rollback: clone the MAC address onto the bridge so DHCP kept the same lease and IP, and run a dead-man auto-revert timer in case the new network did not come back cleanly.

Once the VM had stable networking, the split became useful. Firecrawl moved to the Arch host, where x86_64 Docker images build normally instead of requiring ARM image substitutions. It is bound to the host side of libvirt NAT at `192.168.122.1:3002`, reachable by the VM and not exposed to the LAN.

The same pattern made local Hindsight feasible. The EC2 instance had no GPU and a fragile shared Python environment. The desktop had a GPU and enough room to isolate services properly.

## Act 5: the one-day cutover

The actual cutover happened on 2026-06-08.

The new Hermes VM was installed fresh on Ubuntu 24.04, pinned to the same Hermes commit as the EC2 box for configuration parity. I copied the portable profile state — config, secrets, scripts, internal crons, skills, kanban state — but avoided copying architecture-specific runtime. Toolchains were re-provisioned from source, mostly through `mise`. GitHub CLI auth and the blog SSH key carried over. The old separate `/data` volume became a plain directory on the VM's single disk.

Local Hindsight was installed on the Arch host in an isolated `uv` virtualenv, not inside Hermes' own environment. That isolation was the fix for the earlier dry-run scare. The package name mattered too: the agent-memory package is `hindsight-all` / `hindsight-client`; plain `pip install hindsight` is an unrelated Chrome-forensics package.

The local stack used `bge-small` embeddings plus a cross-encoder reranker on the GPU, with embedded pgvector Postgres, bound privately at `192.168.122.1:8888`. Because the host's sudo requires a password, it runs as a user systemd service with linger enabled rather than a root service.

Then came the identity handoff. The EC2 gateway had to be stopped and disabled first, because only one process should own the Discord identity. After copying the live `state.db`, I started the VM gateway and watched it connect: Discord came up cleanly. Then I migrated 41 memories from Hindsight Cloud to the local backend.

Finally, the EC2 nightly stop/start schedules were disabled and the instance was stopped. Full termination is intentionally delayed for a short soak period, but the live agent moved.

## Act 6: what actually runs locally on an old GPU

The GTX 1650 has 4 GB VRAM, but it is also driving the desktop. In practice only about 1 GB was comfortably free once the desktop was running. That budget decides what belongs on the GPU.

Embeddings fit. `bge-small` is roughly 130 MB, and in this setup it uses around 300 MB on the GPU while idle and closer to 800 MB under load. The reranker also fits. That is the sweet spot: memory indexing, similarity search, and reranking are data-resident workloads where local ownership matters. Keeping those vectors and the index on hardware I control is exactly the win I wanted.

A capable reasoning LLM does not fit. Hindsight's judgment step — deciding what is durable, what is stale, what should be merged, and what should become a skill — needs model quality. Trying to cram that into the leftover VRAM would be worse than honest cloud use.

So the final design is hybrid. Embeddings, reranking, and the vector store run locally. The narrow reasoning step uses a cheap cloud LLM, currently DeepSeek's fast model tier. That is not ideological purity, but it is a good engineering trade.

"Local memory" does not have to mean "local everything." For me it means the data and the index stay mine, and only the part that genuinely benefits from a capable external model leaves the machine.

## Gotchas I would repeat to myself next time

First: dry-run dependency-heavy installs. If a memory backend wants to install CUDA on a GPU-less box or downgrade a security-sensitive package in the agent's own virtualenv, stop.

Second: optional dependencies are still dependencies. A fresh Hermes install can look healthy while missing runtime pieces such as `discord.py` for the gateway or `hindsight-client` for the memory tool. A config doctor that says a provider is available is not the same thing as proving the import path works.

Third: package names matter. `hindsight-all` and `hindsight-client` are the Vectorize/Hindsight packages for agent memory. `hindsight` is something else.

Fourth: boring infrastructure constraints dominate the story. ARM versus x86 affects Docker images. Password-gated sudo affects service design. A single disk changes backup and `/data` assumptions. A small GPU shared with the desktop is not a local-AI fantasy box.

Finally: test the path you think you migrated. An agent can answer correctly from transcript search even when long-term memory did not fire. If you want to prove memory routing, test with an empty context and a question only the new memory backend should know.

## The takeaway

A rented cloud box is the right way to discover whether a self-hosted agent deserves to exist. It is cheap, reversible, and avoids turning a curiosity into home-lab plumbing too early.

But once the agent becomes useful, the constraints that made the trial cheap start to cap it. Small ARM CPU. No GPU. Fragile disk layout. Shared virtualenv pressure. SaaS memory for the agent's most personal data.

Repurposing hardware I already owned changed the shape of the system. The desktop under the desk did not become a frontier-model server, and it did not need to. It became a place to keep the agent's data-resident workloads close: memory embeddings, reranking, vector search, web-reading infrastructure, and private services reachable only by the VM.

The cloud did not disappear. It got narrower. Instead of renting a whole always-on environment for everything, I now pay external providers for the slice that still needs them: high-quality reasoning and model calls. The rest lives on hardware I control.

That feels like the right lesson from this migration. Self-hosting an agent is not about pretending the cloud has no value. It is about learning which parts of the agent are yours enough, private enough, and repetitive enough that they should stop being rented.
