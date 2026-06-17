---
layout: post
title: "Eve, Mastra, AgentCore — three answers to durable agent workflows"
summary: "Vercel just dropped Eve, an agent framework with durable execution built in. Mastra has been doing durable workflows for 18 months. AWS has been quietly building the same capabilities into Bedrock AgentCore. A side-by-side comparison of architectures, tradeoffs, and which problem each one is actually solving."
tags: [ai-agents, workflows, durable-execution, agentcore, mastra, vercel-eve, aws, typescript]
---

Yesterday morning at 9:38 AM PT, [Vercel announced Eve](https://x.com/vercel/status/2067180054979936413) — an open-source agent framework that promises to do for agents what Next.js did for the web. The centerpiece: **durable execution**, where agent workflows survive crashes, deploys, and pause indefinitely without losing state.

The thread immediately filled with comparisons. "Like Temporal but for AI agents?" "How does this compare to Mastra?" "Doesn't AWS already do this?"

The short answer: all three are converging on the same pattern — durable execution + sandboxed compute + human-in-the-loop + observability — but they sit at **different layers of the stack** and make fundamentally different bets about what "durability" means. This post maps them side by side.

---

## The three frameworks at a glance

| | **Vercel Eve** | **Mastra.ai** | **AWS Bedrock AgentCore** |
|---|---|---|---|
| **Launched** | June 2026 | October 2024 | July 2025 (GA) |
| **Open source** | ✅ Apache 2.0 | ✅ Apache 2.0 core | ❌ Managed service (Strands Agents SDK is OSS) |
| **Language** | TypeScript (Python beta) | TypeScript-only | Any containerized runtime |
| **GitHub stars** | Just launched | 22,000+ | N/A (managed) |
| **Tagline** | "Like Next.js, for agents" | "TypeScript AI agent framework & platform" | "Build autonomous AI agents that reason, use tools, maintain context" |
| **Production users** | Just launched | PayPal, Replit, Brex, SoftBank, 11x | Enterprise AWS customers |

---

## Architecture: internal vs. external orchestration

This is the axis that matters. Every durable workflow system has to answer the same question: **who owns the orchestration loop?**

**Eve** puts the orchestration *in your application code*. You write a function with `"use workflow"` and `"use step"` directives, and the framework checkpoints every step to an event log. There is no separate orchestrator service — the code IS the orchestrator.

```typescript
export async function bookingAgent(messages: UIMessage[]) {
  "use workflow"
  const flights = await searchFlights(messages)
  const itinerary = await buildItinerary(flights)
  await sleep("3 days") // zero compute cost
  await sendReminder(itinerary)
}

async function searchFlights(args) {
  "use step"  // checkpointed, retryable, encrypted
  return { flights: [...] }
}
```

**Mastra** puts the orchestration in a **graph engine**. You define steps with `createStep()` and compose them with `.then()`, `.branch()`, `.parallel()`. The engine handles execution order, state propagation, and suspend/resume. By default this runs in-process; for managed infrastructure, you deploy to **Inngest** workflow runners.

```typescript
const flightStep = createStep({
  id: 'search-flights',
  execute: async ({ inputData, suspend }) => {
    if (!inputData.dates) return await suspend({})
    return { flights: await searchFlights(inputData) }
  },
})

const workflow = createWorkflow({ id: 'booking' })
  .then(flightStep)
  .then(buildItineraryStep)
  .commit()
```

**AWS AgentCore** offers **three different orchestration surfaces** at different layers:

1. **AgentCore Harness** (Preview) — the built-in agent loop. Model → tool → result → model. Handles context management, failure handling, tool routing. This is a single-agent reasoning loop, not a workflow engine.

2. **Strands Graphs** — SDK-level multi-agent orchestration. A deterministic directed graph where agents are nodes and edges carry output→input. Supports DAG + cyclic topologies, conditional edges, and an interrupt system for human-in-the-loop. Checkpointed via snapshots with session persistence.

3. **Step Functions** — infrastructure-level orchestration. Embed agent reasoning steps into production AWS workflows with retry, error handling, parallel/sequential branching, and human approval. Harness can be created inline from the Step Functions visual builder.

| | **Eve** | **Mastra** | **Strands Graphs** | **Step Fns + AgentCore** |
|---|---|---|---|---|
| **Orchestration model** | Language directive | Graph engine (`.then()/.branch()`) | Directed graph (DAG + cyclic) | State machine (ASL) |
| **Where it runs** | Your code (on Vercel Fluid Compute) | Your process (or Inngest) | Inside AgentCore session | AWS Step Functions |
| **Paradigm** | Code IS the orchestrator | Framework IS the orchestrator | SDK IS the orchestrator | Infrastructure IS the orchestrator |

---

## Durable execution: the heart of it

All three checkpoint workflow state so execution survives failures. The difference is *how* and *what they checkpoint*.

**Eve: event sourcing.** Every `"use step"` writes its inputs, outputs, and stream chunks to an event log — the single source of truth. If a step fails, it replays from the log. All step data is encrypted before leaving your deployment. You only pay for compute your steps actually use. `sleep("7 days")` pauses without consuming resources.

Limits: 50 MB per step payload, 2 GB per run. Runs can span minutes to months.

**Mastra: storage-backed snapshots.** When a step calls `suspend()`, the entire workflow state — step outputs, workflow state variables, execution position — is serialized to storage (SQLite locally, Postgres in production, or Inngest's managed store). Resumption restores exact state and continues from the suspended step.

```typescript
// Step pauses until human approves
const approvalStep = createStep({
  id: 'user-approval',
  resumeSchema: z.object({ approved: z.boolean() }),
  execute: async ({ resumeData, suspend }) => {
    if (!resumeData?.approved) return await suspend({})
    return { result: 'Approved' }
  },
})
// Resume from anywhere — HTTP endpoint, timer, event handler
await run.resume({ step: 'user-approval', resumeData: { approved: true } })
```

Mastra also supports `.sleep()` and `.sleepUntil()` at the workflow level (status: `waiting`) and a **Time Travel** feature for replaying/retrying individual steps after a run completes.

**AgentCore: layered persistence.** Durability isn't one thing — it's a stack:

- **Session-level:** Managed session storage (Preview) persists the agent's filesystem across stop/resume cycles. MicroVM terminates → storage flushed → on next invoke, new microVM mounts the persisted state. Files, packages, artifacts restored exactly as left. 14-day idle expiry.
- **Conversation-level:** AgentCore Memory — short-term (within session) and long-term (across sessions, 4 namespace levels: session → actor → strategy → global). LTM automatically extracts user preferences, facts, and conversation summaries.
- **Orchestrator-level:** Strands Graphs + multi-agent session persistence saves orchestrator state to snapshots. After a crash, restore from `snapshot_latest` and resume from the last completed node.
- **Infrastructure-level:** Step Functions handles retry, error catching, parallel fan-out, and `waitForTaskToken` for indefinite human-in-the-loop pauses.

**The key difference:** Eve and Mastra give you durable execution as a *language feature* or *framework API* — one API call, one directive. AgentCore gives you durable execution as *infrastructure primitives* — you compose them, but you also need to understand which layer does what.

---

## Sandbox / isolated compute

| | **Eve** | **Mastra** | **AgentCore** |
|---|---|---|---|
| **Isolation level** | Per-agent sandbox (Docker, microsandbox, Vercel Sandbox, or just-bash) | None — runs in your Node.js process | **Dedicated microVM per session** |
| **Shell access** | ✅ Real bash, scripts, file I/O | ❌ In-process only | ✅ Persistent shell over WebSocket (up to 10 concurrent) |
| **Code interpreter** | ✅ Sandboxed code execution | ❌ No code execution isolation | ✅ Built-in Code Interpreter tool |
| **Security model** | Container / process isolation | Your Node.js process boundary | microVM-level isolation + IAM |

AgentCore wins on isolation by a wide margin — microVM-per-session with isolated CPU, memory, and filesystem is the only model a bank's security team would approve without additional hardening. Eve's sandbox is good for DX but not microVM-hard. Mastra has no sandbox at all — code execution is your responsibility.

That said, Eve's isolation is *configurable*. For local dev you get `just-bash` (zero setup); for production you get Vercel Sandbox or your own Docker. The tradeoff is flexibility vs. guarantees — you can choose your isolation level, but you have to.

---

## Human-in-the-loop

All three support pausing agent execution for human approval. The DX varies dramatically.

**Eve: `needsApproval` as a tool predicate.** One line. No boilerplate.

```typescript
export default defineTool({
  description: "Run a read-only SQL query",
  inputSchema: z.object({ sql: z.string() }),
  needsApproval: ({ toolInput }) => estimateScanGb(toolInput.sql) > 50,
  async execute({ sql }) { /* ... */ },
})
```

The agent pauses without consuming compute, resumes after approval. This is the cleanest HITL primitive of the three — it's a guard on the tool, not something you wire into the orchestration logic.

**Mastra: `suspend()` in a step.** More explicit, more flexible.

```typescript
execute: async ({ suspend, resumeData }) => {
  if (!resumeData?.approved) return await suspend({ reason: 'Needs approval' })
  return await executeAction()
}
```

You get `suspendData` (what was passed to `suspend()`), `resumeSchema` (type-safe validation of what comes back), and the ability to resume from any context — HTTP endpoint, webhook, timer, another workflow. The tradeoff is more code for more control.

**AgentCore: three HITL surfaces, none as clean as Eve's.**

- **Harness inline functions:** tool executed client-side, harness pauses and returns control to your code. You handle the approval logic yourself.
- **Strands interrupts:** `event.interrupt()` in a hook callback. Agent pauses, caller receives interrupt objects, caller resumes with responses. State persists across interrupt/resume cycles via snapshots.
- **Step Functions:** native `waitForTaskToken` — indefinite pause awaiting external signal. Most flexible, most infrastructure.

The Strands interrupt system is more powerful than it looks — it supports concurrent node execution where each node is independently interruptible, and the `invocation_state` dictionary is serialized with the graph checkpoint so state survives the pause. But it doesn't have Eve's "one line on the tool" elegance.

---

## Multi-agent / subagents

**Eve:** First-class `subagents/` directory. An agent delegates to another agent by referencing its subagent directory. Clean file-system-as-topology model.

**Mastra:** Workflows can compose agents as steps. Agents can use other agents as tools. Workflows can be nested as steps inside larger workflows. The graph builder gives you `.then()`, `.branch()`, `.parallel()` — standard workflow composition primitives.

**AgentCore:** Three multi-agent patterns in Strands Agents SDK:

1. **Graph** — deterministic DAG with conditional edges. Agents as nodes. Supports feedback loops, nested graphs, remote A2A agents, and custom deterministic nodes for business logic.
2. **Swarm** — emergent, agent-driven handoff. Agent decides who to hand off to next. Good for open-ended routing.
3. **Workflow** — a Task Graph invoked as a single tool by an agent. Deterministic, parallel, no cycles.

Plus the **Agent Registry** for service discovery, and **A2A protocol** for agent-to-agent communication across trust boundaries.

---

## Observability

| | **Eve** | **Mastra** | **AgentCore** |
|---|---|---|---|
| **Tracing** | OpenTelemetry — spans for turns, model calls, tool calls, sandbox commands | Studio live step status + Time Travel replay | OpenTelemetry + CloudWatch auto-instrumentation |
| **Export** | Braintrust, Honeycomb, Datadog, Jaeger | Studio (localhost:4111) | CloudWatch generative AI dashboard |
| **Evals** | Scored test suites (local/CI) | Model-graded, rule-based, statistical | Batch evaluations across sessions |
| **Dashboard** | Vercel "Agent Runs" tab | Mastra Studio | CloudWatch Observability page |

Eve wins on ecosystem compatibility (standard OTel). Mastra wins on dev-time debugging (Studio + Time Travel is genuinely good). AgentCore wins on automated evaluation at scale (batch evaluations that discover sessions from CloudWatch, run evaluators, and produce aggregate results — no test harness to maintain).

---

## Deployment & ecosystem

**Eve:** Run anywhere — Vercel (zero-config, encrypted, scalable), Docker, AWS, DigitalOcean, or in-memory locally. The Workflow SDK is open source; Vercel hosting is optional. Vercel Connect handles OAuth with consent and token refresh. Connections (MCP + OpenAPI) are file-based. Channels (Slack, Discord, Teams, Telegram, etc.) are adapter files.

**Mastra:** `npm create mastra@latest` → interactive CLI → `npx mastra dev` → Studio at localhost:4111. Mastra Cloud (public beta since June 2025) for hosting. Inngest for managed workflow runners at scale. 3,300+ models from 94 providers via a unified `provider/model-name` router. Enterprise features (SSO, RBAC) require a paid license. 5,500+ Discord community.

**AgentCore:** AWS-only, but the most complete enterprise story. IAM-integrated identity, VPC networking, multi-region, execution roles, CloudTrail audit logs, service-managed storage, payments infrastructure. Deploy via `agentcore deploy` CLI, SDK, or CloudFormation. The Harness runs any container — you can use Strands Agents, LangGraph, CrewAI, LlamaIndex, Google ADK, or OpenAI Agents SDK. MCP and A2A protocols are first-class.

---

## The real question: which layer do you want to own?

After mapping all three side by side, the choice isn't about features — they're converging. It's about **who handles the infrastructure**.

| If you want... | Choose... |
|---|---|
| Durability as a language feature — `"use workflow"` and forget the plumbing | **Eve** |
| A mature, battle-tested framework with the deepest memory system and a great dev Studio | **Mastra** |
| Enterprise-grade isolation (microVM per session), IAM, compliance, and the ability to run any agent framework | **AgentCore** |
| External orchestration with retry/catch/parallel on AWS infrastructure | **Step Functions + AgentCore** |
| Multi-agent DAGs with conditional routing and checkpointed interrupts | **Strands Graphs** |
| A "demo in 10 minutes" experience that can grow to production | **Eve** |
| Something your security team will approve without additional hardening | **AgentCore** |

None of these are mutually exclusive. You can run Strands Graphs **inside** AgentCore sessions **orchestrated by** Step Functions. You can deploy Mastra **on** Vercel. The convergence means the real architectural decision is about your constraints — compliance, team skills, existing infrastructure, tolerance for managed services.

---

## What I'm watching

1. **Eve's adoption curve.** The "Next.js for agents" pitch is powerful, but Next.js succeeded because React already had mindshare. Does the agent ecosystem have a comparable gravitational center yet? Mastra's 22K stars suggest yes — but Eve just launched at 845K views.

2. **AgentCore Harness going GA.** Currently in Preview — the managed agent loop that eliminates the need for teams to build orchestration from scratch. Combined with the Step Functions integration (also new in June 2026), this is AWS's answer to the "durable workflows for agents" question. If Harness exits Preview with strong Step Functions integration, it becomes the default answer for AWS-native teams.

3. **Mastra's enterprise model.** Apache 2.0 core with enterprise features in `ee/` requiring a paid license is a proven playbook (see: GitLab, Sentry, Supabase). But at $13M seed and 26 employees, Mastra needs revenue. How aggressive will the enterprise/licensed feature split become?

4. **The suspend/resume spectrum.** Eve's `sleep("7 days")`, Mastra's `suspend()` → SQLite, AgentCore's session stop/resume, and Step Functions' `waitForTaskToken` all solve the same problem at different time horizons. I suspect the winner will be whichever framework makes the *transition* between interactive pause and indefinite pause seamless — right now, all three have a cliff somewhere.

---

*Thanks to [so0k](https://github.com/so0k) for the discussion that sparked this comparison. All AgentCore architecture details sourced from the [AWS Bedrock AgentCore Developer Guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/), [Strands Agents documentation](https://strandsagents.com/docs/), [Mastra docs](https://mastra.ai/docs), and the [Vercel Eve announcement](https://vercel.com/blog/introducing-eve).*
