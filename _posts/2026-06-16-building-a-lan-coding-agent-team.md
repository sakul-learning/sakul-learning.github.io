---
layout: post
title: "Building a LAN coding-agent team before the API door closes"
summary: "A practical design for running a small team of coding agents on local hardware, using the Fable/Mythos export-control shock as the warning shot."
tags: [ai-agents, local-llm, coding-agents, vllm, homelab]
---

## The warning shot

The useful lesson from the Fable 5 / Mythos 5 export-control incident is not that every frontier API will disappear tomorrow. It probably will not.

The lesson is narrower and more practical: if your engineering workflow only works while a US-hosted frontier model API remains available to you, then part of your development pipeline is outside your control.

Anthropic said the US government directed it to suspend access to Fable 5 and Mythos 5 for foreign nationals, including foreign nationals inside the United States and Anthropic's own employees. Anthropic disabled both models for all customers while it worked through compliance. Whether you read that as government overreach, inevitable national-security policy, or a preview of API-level export controls, the operating lesson is the same: teams should have a local fallback for the work they cannot afford to pause.

Not a toy chatbot. A LAN service your coding agents can actually use.

## What changed with 12B to 27B models

For a long time, local coding agents had an awkward tradeoff. Small models were fast but too brittle. Big models were useful but needed expensive hardware or painful patience.

The 12B to 27B band is becoming the interesting middle. It is small enough to run on a serious workstation or a modest GPU server, but large enough to handle real coding chores: debugging, tests, refactors, documentation, issue triage, and repo navigation. You still need judgment. You still need tests. But the local model can be good enough to keep agents moving when a cloud model is unavailable, too expensive, rate-limited, or legally awkward.

The Hugging Models thread pointed at `yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF`, a Gemma 4 12B fine-tune distributed as GGUF. The model card says it is based on `google/gemma-4-12B-it`, specializes in Python and algorithmic coding, and was trained on verifiable coding traces from Composer 2.5 with supplementary Fable 5 data. It also says the model is not safety-aligned, is English-centric, and is a personal/hobby release.

That makes it interesting, not automatically production-safe.

For a private LAN lab, it is exactly the kind of model worth testing. For a company foundation model, I would be more cautious. The provenance includes teacher data from a model family that was later pulled behind export controls. Even if the downloadable derivative remains available, compliance and licensing review should happen before anyone wires it into a commercial pipeline.

## The speed target: do not optimize for bragging-right tokens

For coding agents, tokens per second matter because slow models change behavior. A developer will wait for a 30-second answer once. An agent that waits 30 seconds after every tool call becomes useless.

A good practical target:

- Minimum for interactive coding: 50 output tokens/sec with low time-to-first-token.
- Comfortable for IDE-style completions and agent loops: 100+ output tokens/sec, with TTFT under about 500 ms for short prompts.
- LAN agent team target: plan for aggregate throughput, not just one fast stream. Four agents each getting 50 tok/sec feels better than one benchmark screenshot at 180 tok/sec while everyone else queues.

There is a diminishing return after the model is faster than the human or the tool loop. Going from 15 to 50 tok/sec changes the experience. Going from 120 to 220 tok/sec is nice, but usually less important than better batching, shorter prompts, reliable tool calls, and not blowing the KV cache on junk context.

Petar Zrinscak's vLLM tuning post is useful because it benchmarks the server shape, not just a single prompt. On 8x A100 80GB with DeepSeek-R1-Distill-Llama-70B, tensor parallelism crushed pipeline parallelism for a single-node deployment: TP=8 produced about 51.6 output tok/sec on a long single request, while TP=2, PP=4 dropped to about 13.1 tok/sec. For 20 concurrent long prompts, larger `max-num-batched-tokens` values gave much better throughput, with the best tested configuration reaching about 292 output tok/sec and lower inter-token latency than smaller batch-token caps.

The important lesson for a LAN coding-agent server: use the serving stack like a server. Batch requests. Keep prefill under control. Raise `max-num-batched-tokens` as far as memory allows. Do not split a single-node model with pipeline parallelism unless you have a strong reason.

## Hardware recommendation

> **Interactive companion — [Vietnam build explorer](/assets/reports/vietnam-llm-builds.html).** A dynamic report that prices each tier below against live phongvu.vn (VND) listings, with toggles for platform (DIY NVIDIA vs Apple Silicon), reusing parts already in the `podmaster` box, and VND/USD. Grounded to the tiers and targets in this article.

Start by deciding whether you are building a personal assistant, a small agent team, or a shared team service.

### Tier 1: one developer, one or two agents

Use an Apple Silicon machine with 32GB+ unified memory, or a Windows/Linux box with a 16GB to 24GB GPU.

Run GGUF through llama.cpp, LM Studio, Jan, or Ollama. For Gemma 4 12B Coder, the model card's Q4_K_M quant is the practical starting point. It is around 7GB and should leave room for useful context on a 16GB GPU. On 24GB, you can push context much harder or move to Q6/Q8.

This tier is good for local privacy, offline work, and a single coding assistant. It is not where I would run a team of autonomous agents.

### Tier 2: LAN coding-agent workstation

Use one high-end consumer or workstation GPU:

- RTX 4090 / 5090 class: 24GB to 32GB VRAM.
- RTX 6000 Ada / RTX Pro 6000 class: 48GB+ VRAM.
- 64GB to 128GB system RAM.
- Fast NVMe storage for model files and repo worktrees.
- 10GbE if multiple machines will hit it hard.

This is the sweet spot for a home lab or small office. Serve a 12B quantized coding model for the fast lane, and optionally keep a slower 27B-ish model for harder tasks. Put OpenAI-compatible endpoints on the LAN so Codex-style, OpenCode-style, Continue, Aider, or custom Hermes agents can swap providers without changing their whole workflow.

If you want vLLM with official BF16 Gemma 4 12B, vLLM's Gemma 4 recipe lists 40GB+ NVIDIA memory for the 12B dense model. That pushes you toward 48GB workstation cards or A40/L40S/A6000-class hardware. Quantized GGUF is much easier to fit on consumer GPUs, but vLLM is usually the better path once you care about multi-user throughput.

### Tier 3: shared LAN inference server

Use a real server shape:

- 2x to 4x L40S / RTX 6000 Ada / A6000-class GPUs for cost-effective local serving, or
- 1x to 2x H100/A100 80GB if you already have access and want long-context BF16 serving, or
- 8x A100/H100 only if you are serving large 70B-class models or many concurrent users.

For the 12B to 27B band, a single 48GB card is already serious. Two 48GB cards give you room for one fast model, one higher-quality model, or more concurrency. I would not jump straight to an 8-GPU box unless the workload has proven it needs it.

## The architecture I would build

Put the model server behind a boring LAN API:

1. `llama.cpp` or LM Studio for quick GGUF experiments.
2. vLLM for the shared service once the model choice stabilizes.
3. LiteLLM or a tiny gateway in front, so tools talk to one OpenAI-compatible endpoint.
4. Per-agent API keys, logs, and budgets even on the LAN. Local does not mean unaudited.
5. A fast model lane and a deep model lane.

The fast lane handles:

- code search summaries,
- test failure explanations,
- small patches,
- doc updates,
- PR comment drafting,
- shell-command planning,
- routine refactors.

The deep lane handles:

- architecture review,
- larger diffs,
- tricky bugs,
- multi-file reasoning,
- security-sensitive review.

Then build the agents around that split. Do not let every task hit the biggest model. Most work in a coding-agent loop is not deep thinking. It is reading files, deciding the next tool call, summarizing output, and making small edits. The local fast lane should be cheap enough that you do not care if three agents are running at once.

## Add a context scout, not just a bigger model

Mitko Vasilev's FastContext note points at the next obvious layer in the stack: stop using the main coding model as an expensive repo-discovery engine.

Microsoft's `FastContext-1.0-4B-SFT` is a small repository-exploration subagent. It is not meant to be your main coder. It gets called by the main agent, runs read-only repo tools like `READ`, `GLOB`, and `GREP`, then returns compact file paths and line ranges. Microsoft says repo reading and searching accounted for 56.2% of tool-use turns and 46.5% of main-agent tokens in their trajectory analysis. Moving that work to a cheap local explorer improved benchmark results while cutting main-agent token use sharply.

That fits the LAN setup perfectly:

1. The main coding agent receives the user task.
2. It asks FastContext: "find the files and line ranges relevant to this bug."
3. FastContext searches the repo locally and returns citations, not a giant blob of copied source.
4. The main agent spends its context on reasoning, patching, and testing instead of rediscovering `grep`.

There is also a GGUF build worth noting: `plunderstruck/FastContext-1.0-4B-SFT-ROCmFP4-GGUF`. It packages the 4B FastContext model as a 2.7GB GGUF tuned for AMD Strix Halo / Ryzen AI Max+ 395 through a custom ROCmFP4 llama.cpp fork. That is not the universal download for every box; it is a very specific build. For a normal NVIDIA workstation, I would start from Microsoft's upstream model through SGLang/vLLM or convert/choose a standard GGUF quant that your runtime supports. For a Strix Halo mini workstation, the ROCmFP4 GGUF is interesting because it turns the APU into a cheap always-on repo scout.

The architecture becomes more like a small engineering team:

- FastContext: repo scout, read-only, cheap, long-context, local.
- 12B coder: fast implementer for small patches and routine fixes.
- 27B-ish or cloud frontier model: reviewer / hard-problem lane.
- Shell harness: the thing that decides which model gets which job, what tools it can call, and how much context it sees.

This is where a custom agentic shell starts to matter. A LAN model server is only the engine. You still need a cockpit.

## Where llmfit fits

`AlexsJones/llmfit` looks actively maintained. The repo is not archived, had a release on June 9, 2026, and had commits pushed on June 15, 2026. It has a large user signal too: about 28k stars and 1.7k forks at the time I checked.

That makes it useful as a hardware fit explorer. I would not treat any single estimator as gospel, but `llmfit plan` and `llmfit recommend` are exactly the kind of tools you want before buying hardware. Use it to sanity-check whether a model/quant/context combination fits, then verify with a real benchmark on your workload.

The dangerous number is always the weights-only size. A 7GB quantized model is not a 7GB deployment. You need room for KV cache, runtime overhead, batching, and other processes. The moment agents start sending long repo context, KV cache becomes the bill.

## A practical first build

If I were building this today for a LAN coding-agent team, I would start here:

- Hardware: one 48GB NVIDIA workstation GPU if budget allows; otherwise one 24GB to 32GB consumer GPU.
- Fast model: Gemma 4 12B Coder Q4_K_M or Q6_K via llama.cpp for initial testing.
- Server: OpenAI-compatible endpoint bound to LAN, not the public internet.
- Target: 50+ tok/sec per active stream, 100+ tok/sec when only one agent is active.
- Context: start at 16K or 32K. Raise only after measuring memory and latency.
- Agents: three roles at first: researcher, implementer, reviewer.
- Guardrails: repo allowlist, shell-command approval policy, per-agent logs, and test-before-commit rules.

Once the model earns trust, move the shared service to vLLM and tune it like a server: concurrency, batch-token caps, chunked prefill, GPU memory utilization, and request metrics. Watch TTFT and inter-token latency, not just headline tok/sec.

## The point is resilience, not purity

Local coding agents will not replace the best frontier APIs for every task. That is not the bar.

The bar is whether your team can keep moving when the cloud model is down, expensive, rate-limited, policy-gated, region-blocked, or temporarily pulled behind an export-control wall. A LAN model does not need to be the smartest model you use. It needs to be reliable, private, cheap at the margin, and fast enough that agents keep their rhythm.

That is the boring version of AI sovereignty. Not a press release. A box on the network that can still review a diff when the API stops answering.

But the next bottleneck is not only inference speed. It is context routing.

Once the LAN model is working, you need a shell that knows when to call the repo scout, when to call the local coder, when to escalate to a stronger model, and when to stop and run tests. This is why tools like [Pi](https://pi.dev/) are interesting. Pi is a minimal coding-agent harness with custom providers, prompt templates, skills, extensions, session history, and dynamic context hooks. It is not trying to be a sealed IDE. It is closer to a programmable agent shell.

That is the next article: fast context, local repo scouts, and a custom Pi-style shell that turns a model server into a usable coding-agent team.

## Sources and notes

- Anthropic, "Statement on the US government directive to suspend access to Fable 5 and Mythos 5": https://www.anthropic.com/news/fable-mythos-access
- Petar Zrinscak, "Run your own AI at scale: Tuning vLLM for Superb LLM Deployment (Vol. 1)": https://petarzrinscak.substack.com/p/run-your-own-ai-at-scale-vol-1-tuning-vllm
- Hugging Models X thread: https://x.com/huggingmodels/status/2066157716373221623
- Gemma 4 12B Coder GGUF model card: https://huggingface.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF
- Google Gemma 4 12B model card: https://huggingface.co/google/gemma-4-12B
- vLLM Gemma 4 recipe: https://docs.vllm.ai/projects/recipes/en/latest/Google/Gemma4.html
- llmfit repository: https://github.com/AlexsJones/llmfit
- Mitko Vasilev X note on FastContext: https://x.com/iotcoi/status/2066428539465875740
- Microsoft FastContext model card: https://huggingface.co/microsoft/FastContext-1.0-4B-SFT
- FastContext ROCmFP4 GGUF build: https://huggingface.co/plunderstruck/FastContext-1.0-4B-SFT-ROCmFP4-GGUF
- Pi coding agent: https://pi.dev/
