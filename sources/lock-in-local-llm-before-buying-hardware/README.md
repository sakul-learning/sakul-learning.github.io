# Source notes: lock in local LLM setup before buying hardware

## AI on Demand Cluster

Repository: https://github.com/jhammant/AIonDemandCluster
Local clone studied at: `/data/repos/research/AIonDemandCluster`
Commit inspected: `0221ed3`

Verification run:

- `uv run --with '.[dev]' pytest -q` -> `205 passed, 6 deselected, 1 warning in 0.89s`
- `uv run --with '.[dev]' ruff check aiod tests` -> `All checks passed!`

Core implementation details:

- `aiod/sizing.py`: pulls Hugging Face model metadata, derives parameter count, config shape, KV cache estimate, and maps requirements to GPU tiers. Uses conservative estimates: weight bytes by quantization, `OVERHEAD_MULT = 1.20`, `FIXED_GB_PER_GPU = 2.0`, context x concurrency for KV cache, and known GPU tiers from RTX 4090 through B200.
- `aiod/vast.py`: direct vast.ai REST client. Searches verified rentable offers with direct public port mapping, reliability floor, compute-cap floor, network bandwidth floor, and max price. Rents with Docker image/env/args, extracts public endpoint, destroys instances.
- `aiod/runpod.py`: RunPod provider with GraphQL GPU pricing and REST pod lifecycle. Uses public TCP port instead of proxy URL to avoid streaming timeout.
- `aiod/bootstrap.py`: creates server command for vLLM (`vllm/vllm-openai`) or llama.cpp GGUF (`ghcr.io/ggml-org/llama.cpp:server-cuda`). vLLM enables auto tool choice and model-family tool-call parser for Claude Code workloads.
- `aiod/bench.py`: benchmarks TTFT, decode tokens/sec, aggregate throughput, and derived $/1M output tokens for the currently running OpenAI-compatible endpoint.
- `README.md`: documents estimate, spin, bench, tune, proxy, idle watch, teardown, and profiles.

Useful framing:

- It is not just a deployment tool. It is a hardware validation loop for open-weight agent models.
- Before buying GPUs, rent a comparable shape, run the actual Claude Code / agent workload, measure tokens/sec and latency, test model behavior, then decide whether the hardware purchase makes sense.
- The important numbers are not only VRAM fit. They are TTFT, sustained decode speed, concurrency, $/1M output tokens, tool-call reliability, and whether the model can actually perform the work.

## Existing Sakul blog context

Prior article 1: `_posts/2026-06-08-migrating-hermes-agent-cloud-to-local.md`
Title: "From a Rented Cloud Box to a GPU Under the Desk"
URL: `/2026/06/08/migrating-hermes-agent-cloud-to-local.html`

Prior article 2: `_posts/2026-06-16-building-a-lan-coding-agent-team.md`
Title: "Building a LAN coding-agent team before the API door closes"
URL: `/2026/06/16/building-a-lan-coding-agent-team/`

Key points to connect:

- The local migration post argued for a hybrid local/cloud setup: local memory embeddings, reranking, vector store, and private services; cloud for model calls that still need frontier reasoning.
- It emphasized that a small GPU under the desk is not a local-AI fantasy box. The GTX 1650 had about 1GB comfortably free once driving the desktop, which fit embeddings and reranking but not capable reasoning models.
- The LAN coding-agent team post made the resilience/access argument: a local or LAN agent service is useful when frontier APIs become unavailable, too expensive, rate-limited, or legally awkward.
- The follow-up should connect both threads: rent first, run the actual coding-agent workload, measure whether open-weight models are fast/capable enough, then decide whether buying hardware makes sense.

## Anthropic sources

- Sonnet 5 announcement: https://www.anthropic.com/news/claude-sonnet-5
  - Published Jun 30, 2026.
  - Available across Claude plans, Claude Code, and API.
  - Intro launch pricing through Aug 31: $2/MTok input, $10/MTok output; standard $3/$15.
  - Anthropic positions it as the most agentic Sonnet yet, close to Opus 4.8 at lower prices.

- Fable 5 and Mythos 5 launch: https://www.anthropic.com/news/claude-fable-5-mythos-5
  - Published Jun 9, 2026.
  - Fable 5 is a Mythos-class model made safe for general use.
  - Pricing: $10/MTok input, $50/MTok output.
  - Strong long-horizon coding and agentic performance claims.

- Fable/Mythos access suspension: https://www.anthropic.com/news/fable-mythos-access
  - Published Jun 12, 2026.
  - US government directive suspended access to Fable 5 and Mythos 5.
  - Anthropic disagreed with the technical basis but complied.

- Fable 5 redeployment: https://www.anthropic.com/news/redeploying-fable-5
  - Published Jun 30, 2026.
  - Export controls lifted Jun 30; Fable 5 available globally starting Jul 1 on Claude Platform, Claude.ai, Claude Code, and Claude Cowork.
  - For Pro, Max, Team, and select Enterprise plans: included for up to 50% of weekly usage limits through Jul 7, then via usage credits.
  - Access on AWS, Google Cloud, and Microsoft Foundry to be re-enabled ASAP.

## OpenAI sources

- GPT-5.5 model page: https://developers.openai.com/api/docs/models/gpt-5.5
  - Pricing: $5/MTok input, $0.50 cached input, $30/MTok output.
  - Context window: 1,050,000 tokens.
  - Prompts over 272K input tokens are priced at 2x input and 1.5x output for the full session.

- OpenAI API pricing: https://developers.openai.com/api/docs/pricing
  - GPT-5.5: $5/$30 standard, GPT-5.4: $2.50/$15, GPT-5.4 mini: $0.75/$4.50.
  - Specialized Codex: `gpt-5.3-codex` listed at $1.75 input, $0.175 cached input, $14 output per million tokens.

- GPT-5.6 Sol preview: https://openai.com/index/previewing-gpt-5-6-sol/
  - Published Jun 26, 2026.
  - Sol $5/$30, Terra $2.50/$15, Luna $1/$6 per million input/output tokens.
  - Preview initially limited to select trusted partners, with access shared with the US government before broader release.

## GLM 5.x sources

- GLM-5 repository: https://github.com/zai-org/GLM-5
  - Frames GLM-5 as "from vibe coding to agentic engineering."
  - GLM-5.2 claims 1M context, coding benchmark gains, and local deployment support via vLLM/SGLang/etc.

- GLM-5.2 Hugging Face model card: https://huggingface.co/zai-org/GLM-5.2
  - MIT license / open technical access.
  - Claims strong Terminal-Bench 2.1, SWE-bench Pro, and agentic benchmark performance.
  - Good candidate to test with `aiod`, not assume from benchmark tables.

## Community cost/access context

Reddit sources found:

- https://www.reddit.com/r/Anthropic/comments/1u1crnq/about_fables_pricing_damn/
  - Cost concerns around $10/$50 per million tokens, heavy use examples, 1M context cost shock.
- https://www.reddit.com/r/ClaudeCode/comments/1u2kmth/will_you_actually_pay_for_fable_5_via_api_usage/
  - Claude Code users reluctant to pay usage-credit/API pricing for heavy Fable workloads after subscription allowance.
- https://www.reddit.com/r/ClaudeAI/comments/1uh3dj3/scoop_powerful_anthropic_model_fable_5_on_track/
  - Return/access concerns: possible paywall, US-only fears, nerfing skepticism before official redeployment.
