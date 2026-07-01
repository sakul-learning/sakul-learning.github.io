---
layout: post
title: "Rent the GPU before you buy the GPU"
summary: "A follow-up to the local Hermes migration and LAN coding-agent team posts: AI on Demand Cluster turns rented GPU marketplaces into a practical dress rehearsal for local LLM hardware. Before spending serious capex on cards, power, cooling, and noise, rent the shape you think you need, run your real Claude Code workload, and measure whether the model is fast, cheap, and capable enough to justify owning it."
tags:
  - ai-agents
  - local-llm
  - self-hosting
  - gpu
  - claude-code
  - open-weights
  - infrastructure
source_folder: sources/lock-in-local-llm-before-buying-hardware
sources:
  - title: "AI on Demand Cluster"
    url: "https://github.com/jhammant/AIonDemandCluster"
    note: "Open-source tool for sizing Hugging Face models, renting GPU capacity on vast.ai or RunPod, serving with vLLM or llama.cpp, and wiring the endpoint into Claude Code Router."
  - title: "From a Rented Cloud Box to a GPU Under the Desk"
    url: "/2026/06/08/migrating-hermes-agent-cloud-to-local.html"
    note: "Earlier post on moving Hermes from a rented cloud instance to local infrastructure, and why the result was hybrid rather than fully local."
  - title: "Building a LAN coding-agent team before the API door closes"
    url: "/2026/06/16/building-a-lan-coding-agent-team/"
    note: "Earlier post on running a small LAN team of coding agents on local hardware as a fallback when frontier APIs become unavailable, too expensive, rate-limited, or legally awkward."
  - title: "Introducing Claude Sonnet 5"
    url: "https://www.anthropic.com/news/claude-sonnet-5"
    note: "Anthropic's June 30, 2026 announcement of Sonnet 5 for Claude, Claude Code, and the API."
  - title: "Claude Fable 5 and Claude Mythos 5"
    url: "https://www.anthropic.com/news/claude-fable-5-mythos-5"
    note: "Anthropic's June 9, 2026 launch post for Fable 5 and Mythos 5, including pricing and capability claims."
  - title: "Redeploying Claude Fable 5"
    url: "https://www.anthropic.com/news/redeploying-fable-5"
    note: "Anthropic's June 30, 2026 update: export controls lifted, Fable 5 returning globally starting July 1."
  - title: "Statement on the US government directive to suspend access to Fable 5 and Mythos 5"
    url: "https://www.anthropic.com/news/fable-mythos-access"
    note: "Anthropic's June 12, 2026 explanation of the temporary Fable/Mythos access suspension."
  - title: "Previewing GPT-5.6 Sol"
    url: "https://openai.com/index/previewing-gpt-5-6-sol/"
    note: "OpenAI's June 26, 2026 preview post for GPT-5.6 Sol, Terra, and Luna, including pricing and restricted-preview access."
  - title: "GPT-5.5 Model"
    url: "https://developers.openai.com/api/docs/models/gpt-5.5"
    note: "OpenAI API model page with GPT-5.5 pricing, long-context rules, and context-window details."
  - title: "OpenAI API Pricing"
    url: "https://developers.openai.com/api/docs/pricing"
    note: "OpenAI API pricing page including GPT-5.4, GPT-5.5, and Codex model rates."
  - title: "GLM-5"
    url: "https://github.com/zai-org/GLM-5"
    note: "Open-source GLM-5/5.1/5.2 repository describing long-context coding and agentic benchmarks."
  - title: "GLM-5.2 on Hugging Face"
    url: "https://huggingface.co/zai-org/GLM-5.2"
    note: "Model card for GLM-5.2 with licensing, 1M context claims, and coding/agent benchmark tables."
---

In the earlier posts [From a Rented Cloud Box to a GPU Under the Desk](/2026/06/08/migrating-hermes-agent-cloud-to-local.html) and [Building a LAN coding-agent team before the API door closes](/2026/06/16/building-a-lan-coding-agent-team/), I was circling the same question from two directions: which parts of the agent stack should live on hardware I control, and how much of a coding-agent workflow can keep moving when frontier APIs are unavailable, too expensive, rate-limited, or legally awkward?

Those were good stopping points, but they left one question hanging: what if the next step is not just local memory or a LAN fallback team, but a local open-weight coding model that is fast enough to use for real Claude Code sessions?

The tempting answer is to buy hardware. Look at benchmarks, pick a model, buy a card with enough VRAM, and call it infrastructure.

Now I have realised that is a lot of money, and I would like to know whether it is actually worth it before turning the idea into a box under the desk.

A practical way to lock in your local LLM setup is to rent the hardware class first and run the workload you expect to own later: the same repos, the same Claude Code flow, the same tool calls, and the same patience threshold. If it feels slow or unreliable when rented, owning the GPU will not magically fix the model.

That is why [AI on Demand Cluster](https://github.com/jhammant/AIonDemandCluster) caught my eye.

## The missing step between cloud API and home lab

AI on Demand Cluster, or `aiod`, is a small Python tool with a very specific workflow:

1. give it a Hugging Face model;
2. inspect the model metadata and estimate VRAM requirements;
3. find a matching GPU instance on a rented runner marketplace such as vast.ai or RunPod;
4. start a vLLM or llama.cpp server on the rented box;
5. wait until the model is serving;
6. write Claude Code Router config so Claude Code can talk to the open-weight model;
7. benchmark it, watch it, and tear it down when finished.

The README describes it as a way to "spin up any HuggingFace model on a vast.ai GPU" and drive it from Claude Code through Claude Code Router. That description is accurate, but it undersells the architectural value.

This is not merely a convenience wrapper around GPU rental. It is a rehearsal environment for a hardware purchase.

If you think you want a 4090 box, rent a 4090. If you think you need an A6000-class memory footprint, rent that. If you are convinced your workload needs 80GB cards, prove it by renting one for an afternoon before turning the idea into capex, power draw, noise, heat, driver maintenance, and opportunity cost.

## How `aiod` actually works

I cloned the repository and read through the implementation. It is early, but it is not just a shell script glued to a cloud API.

The sizing layer lives in `aiod/sizing.py`. It takes a Hugging Face repo ID or URL, calls the Hub API, reads model metadata, and tries to derive the real shape of the model: parameter count, dtype, layer count, hidden size, attention heads, key-value heads, and context length. From there it estimates VRAM for different serving modes.

This is the sizing work I do not want to do by hand every time I look at a new model. `aiod` turns it into an explicit estimate:

- model weights: parameters × bytes per parameter;
- KV cache: model shape × context length × concurrency;
- serving overhead: CUDA context, activations, framework overhead, and fixed per-GPU reservation;
- quantization tradeoff: bf16/fp16, fp8, AWQ int4, GPTQ int4, or GGUF variants.

The implementation is intentionally conservative: it applies a weight overhead multiplier, reserves fixed VRAM per GPU, and plans against known GPU tiers from RTX 4090 through B200. It then maps the requirement to feasible GPU counts and tensor-parallel sizes.

That matters because "fits in VRAM" is not a yes/no question you want to discover after the delivery driver leaves a very expensive card on your doorstep.

The provider layer then turns that plan into live market prices. `aiod/vast.py` talks directly to the vast.ai REST API. It filters for verified rentable offers, direct public port availability, reliability, disk space, GPU memory, compute capability, network bandwidth, and maximum hourly price. `aiod/runpod.py` implements the same shape for RunPod, using RunPod's GraphQL API for GPU pricing and the REST API for pod lifecycle.

The bootstrap layer builds the actual serving command. Safetensors, AWQ, GPTQ, and fp8 models go through `vllm/vllm-openai`. GGUF models go through the llama.cpp CUDA server image. vLLM is started with OpenAI-compatible `/v1` endpoints, API-key protection, tensor parallelism, quantization flags, and tool-call parsing enabled for Claude Code style workloads.

The local adapter is Claude Code Router. Claude Code speaks Anthropic's Messages API. vLLM and llama.cpp expose OpenAI-compatible chat completions. CCR sits between them and translates. `aiod` writes the provider/router block into `~/.claude-code-router/config.json`, preserving the rest of your router config.

What you get is a ready-to-go Claude Code backend on a rented open-weight model. Very neat: run the experiment, use the session, then tear the runner down when you are done.

I also ran the repo's checks locally. The default test suite passed: 205 tests green, with six live-provider tests deselected. Ruff also passed. That does not prove the tool is production hardened, but it does show the author has encoded the API assumptions and sizing behavior in tests rather than leaving them as README folklore.

## Why this is better than buying from a spreadsheet

The mistake in local LLM planning is treating the model as the whole system.

A model card can tell you parameter count. A benchmark table can tell you someone else's tokens per second. A Reddit thread can tell you that a certain quant "feels good" on a certain card. None of those answer the question you actually care about:

> Will this setup make my agent useful enough, at the speed and cost I need, on the work I actually do?

Claude Code is an especially unforgiving workload for this. It is not a single chat completion. It is a tool-heavy loop: inspect files, reason about a repo, call tools, edit, test, observe, recover, and continue. A model that looks good in chat can fall apart when it has to maintain intent across a long refactor, emit valid tool calls, recover from failing tests, and avoid filling the context with low-signal sludge.

So the validation loop should look more like this:

1. choose the model you think you want to own;
2. use `aiod estimate` to see the approximate VRAM and live rental price;
3. rent the closest hardware shape to the card or box you are considering;
4. run Claude Code through CCR against that model;
5. benchmark TTFT, tokens/sec, throughput, and cost per million output tokens;
6. run your actual project tasks, not only synthetic prompts;
7. tear it down;
8. only then decide whether ownership beats rental or API use.

The `aiod bench` command is the start of that loop. It measures time to first token, decode speed, aggregate throughput under concurrency, and a derived dollar-per-million-output-tokens figure based on the instance price. That is the right direction because a local purchase should be justified by measured workload economics, not by the psychological appeal of owning the GPU.

For a coding agent, I would add a second benchmark layer on top: task success. Pick three to five representative tasks from your real workflow:

- read a medium-sized repository and explain its architecture;
- fix a failing test;
- implement a small feature behind existing tests;
- perform a code review with concrete line references;
- run a tool-heavy investigation that requires several command outputs.

Record not just tokens/sec, but whether the model completes the task, how much steering it needs, how often tool calls break, and whether you trust the patch it produces.

This is the agent-specific part of the buying decision. Tokens/sec tells you whether the server is fast. The task score tells you whether the setup is useful enough to justify owning.

## The frontier-model problem: price and access move under your feet

The timing is awkward in a useful way.

Anthropic announced [Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5) on June 30. It is available in Claude, Claude Code, and the API, with introductory pricing of $2 per million input tokens and $10 per million output tokens through August 31, then standard pricing of $3 and $15. That is a reasonable price for a strong coding model, especially if it replaces a lot of human waiting time.

But the comparison table is no longer simple. OpenAI's [GPT-5.5 API page](https://developers.openai.com/api/docs/models/gpt-5.5) lists GPT-5.5 at $5 per million input tokens and $30 per million output tokens, with prompts above 272K input tokens charged at 2× input and 1.5× output for the whole session. OpenAI's [pricing page](https://developers.openai.com/api/docs/pricing) also lists `gpt-5.3-codex` at $1.75 input and $14 output, while Codex subscriptions turn the same question into plan limits, five-hour windows, and credits once you exhaust the included usage.

Then there is GPT-5.6. OpenAI's [Sol preview](https://openai.com/index/previewing-gpt-5-6-sol/) prices Sol at $5/$30, Terra at $2.50/$15, and Luna at $1/$6 per million input/output tokens. Those numbers are interesting, but access is the catch: Sol is still a limited preview for trusted partners, with access shared with the US government before broader release. That is exactly the same class of problem as the Fable incident, even if the details differ: the best model on the chart is not necessarily the model you can actually use today.

Fable 5 makes the access problem obvious. Anthropic's [launch post](https://www.anthropic.com/news/claude-fable-5-mythos-5) priced Fable 5 at $10 per million input tokens and $50 per million output tokens. Then Anthropic published a [June 12 statement](https://www.anthropic.com/news/fable-mythos-access) saying a US government directive forced it to suspend access to Fable 5 and Mythos 5. On June 30, Anthropic said the export controls had been lifted and that [Fable 5 would return globally starting July 1](https://www.anthropic.com/news/redeploying-fable-5). But the generous period is short: for Pro, Max, Team, and select Enterprise plans, Fable is included for up to 50% of weekly usage limits only through July 7, then moves to usage credits.

So the frontier stack is both excellent and unstable from a planning point of view. Sonnet 5 may be the sensible daily driver. GPT-5.6 Sol may be the impressive thing you cannot yet get. Fable 5 may be the turbo button that becomes expensive after the first week. All of those can be true at the same time.

This is not an argument against frontier models. I want them in the toolbox. It is an argument against treating any one frontier model's current price, quota, or access policy as infrastructure.

## The practical portfolio: frontier APIs, rented GPUs, local hardware

The useful posture is not "replace Claude with local models." That is too blunt.

The useful posture is a portfolio:

- frontier API models for work where capability dominates cost;
- rented open-weight models for experiments, bursts, and hardware validation;
- owned local hardware for repeatable workloads that have proven they deserve to be local.

The previous Hermes migration landed in exactly that shape. Local memory and retrieval were worth owning because they are data-resident, private, repetitive, and cheap enough to run on existing hardware. Frontier reasoning stayed external because the local GPU was too small and model quality mattered more than ideological purity.

`aiod` adds a missing bridge. It lets you test the next local step without pretending you already know the answer.

This is also why the recent GLM excitement is worth testing rather than just bookmarking. The [GLM-5 repository](https://github.com/zai-org/GLM-5) frames the line as "from vibe coding to agentic engineering," and the [GLM-5.2 model card](https://huggingface.co/zai-org/GLM-5.2) claims a 1M-token context, strong Terminal-Bench and SWE-bench Pro results, and open technical access. That is exactly the kind of claim that sounds relevant to a LAN coding-agent setup.

But it still needs to survive our workload. Maybe GLM-5.2 on a rented 80GB node is genuinely useful for long repo sessions. Maybe the model is good but too expensive to serve continuously. Maybe a smaller Qwen, DeepSeek, or GLM variant on a 4090 is good enough for review and triage, but not for autonomous feature work. Maybe tool calling through Claude Code Router is the real bottleneck. Maybe you discover that buying one 24GB card would be a mistake and that the workload really wants 48GB or 80GB. Maybe the opposite happens: a cheaper quantized model on consumer hardware is good enough for 80% of daily tasks.

Those are all valuable answers, and `aiod` is a neat way to get them without buying the hardware first.

And they are much cheaper to learn by renting for a few hours than by buying first and rationalizing later.

## What I would measure before buying

If I were using this as a hardware purchase gate, I would create a small scorecard.

First, hardware fit:

- Which model and quantization did you test?
- How much VRAM did `aiod` estimate?
- Which GPU shape did it select?
- Did it require tensor parallelism or fit on one card?
- How long did cold start take, including image pull and model download?

Second, serving performance:

- Time to first token at normal context size.
- Decode tokens/sec for a single request.
- Throughput under the concurrency you actually expect.
- Cost per million output tokens while rented.
- Failure modes: OOM, slow downloads, vLLM startup failures, tool-call parsing issues.

Third, agent performance:

- Can it use tools reliably through Claude Code Router?
- Can it edit and test a real repository?
- Does it recover from failing commands?
- Does it preserve intent across a long session?
- How often do you need to escalate back to Sonnet, Opus, Fable, or another frontier model?

Fourth, ownership economics:

- What would the equivalent local machine cost?
- What is the realistic power, cooling, and noise cost?
- How many hours per month would it need to run to beat rental or API pricing?
- Are you buying for steady utilization, privacy, latency, learning, or just vibes?

That last question matters. "Because I want one" is a valid hobby answer. It is not an infrastructure justification.

## The purchase decision should be boring

The best hardware decisions feel boring after the measurement is done.

If the rented 4090 profile runs your routine coding-agent tasks at acceptable latency, and you use it enough hours per month that ownership wins, buying a 4090-class box is not a leap of faith. It is replacing a measured rental with a controlled asset.

If the rented 80GB setup is amazing but only for occasional deep tasks, maybe you should keep renting it. If Fable 5 or Sonnet 5 solves the problem faster despite token cost, maybe the API remains the right abstraction for that slice. If the open-weight model is good for repo search, summarization, and first-pass review but not for final patches, route it that way.

The point is not to crown one model or one deployment mode.

The point is to stop guessing.

The local LLM conversation often jumps straight from aspiration to shopping list. AI on Demand Cluster suggests a better middle step: rent the target shape, run the real workload, measure the numbers, and decide with evidence.

That is how you turn "I want a local LLM box" into an engineering decision.
