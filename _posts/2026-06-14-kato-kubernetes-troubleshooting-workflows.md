---
layout: post
title: "Kato: deterministic Kubernetes runbooks with AI at the end"
summary: "A look at Kato, a small Kubernetes operator that turns troubleshooting workflows into CRDs and gives the LLM less freedom on purpose."
tags: [kubernetes, sre, ai-agents, workflows, runbooks]
sources:
  - title: "Kato GitHub repository"
    url: "https://github.com/zufardhiyaulhaq/kato"
  - title: "Temporal: Agentic AI"
    url: "https://temporal.io/ai/agentic-ai"
  - title: "Google Gemini API: Build an AI agent with Temporal"
    url: "https://ai.google.dev/gemini-api/docs/temporal-example"
  - title: "Restate: AI agents"
    url: "https://docs.restate.dev/use-cases/ai-agents"
  - title: "Inngest AI"
    url: "https://www.inngest.com/ai"
  - title: "DBOS documentation"
    url: "https://docs.dbos.dev/"
  - title: "HolmesGPT GitHub repository"
    url: "https://github.com/HolmesGPT/holmesgpt"
  - title: "K8sGPT GitHub repository"
    url: "https://github.com/k8sgpt-ai/k8sgpt"
---

> Publication note: Kato was reviewed at commit `e6e78394ff98b50f36c28c9b5e7939c0ee64f91f`; `go test ./...` passed locally.

## Working thesis

Most "AI for Kubernetes troubleshooting" demos start by handing an agent a cluster and asking it to figure out what to do. Kato goes the other way. It asks the human SRE to define the investigation path up front, runs that path deterministically, persists the evidence, and only then asks a model to write the diagnosis.

That makes Kato less flashy than a full agent. It also makes it more interesting.

The design is not "LLM, please debug my cluster." It is closer to "run this reviewed diagnostic workflow, collect the fields I already decided matter, and summarize the evidence without inventing the missing parts." That distinction is the whole product.

## What Kato is

[Kato](https://github.com/zufardhiyaulhaq/kato) describes itself as "Kubernetes troubleshooting via declarative UseCase flows with AI summaries." In practice it is a Go operator, a small HTTP API, a Helm chart, and three CRDs:

- `UseCase` defines the troubleshooting workflow.
- `ModelConfig` points at an OpenAI-compatible model endpoint.
- `Run` records one execution: inputs, step outcomes, selected outputs, phase, summary, warnings, timestamps, and model config.

The repository is small, about 7k counted code lines across 141 files. That matters because this is not a giant SRE platform hiding behind a thin CRD facade. The core ideas are visible in the repo.

A `UseCase` is the DSL. It has inputs, ordered steps, optional `when` conditions, bounded `forEach`, per-step `summaryFilter`, and a final summary prompt. A simple CrashLoopBackOff workflow first checks pod status, then events, then previous logs only if the pod actually restarted, then node details only if the pod was scheduled:

```yaml
steps:
  - name: status
    method: check_pod_status
    with:
      namespace: $(inputs.namespace)
      name: $(inputs.pod)
  - name: events
    method: check_events
    with:
      namespace: $(inputs.namespace)
      involvedObject: $(inputs.pod)
  - name: previous-logs
    method: check_pod_logs
    when: $(steps.status.restartCount) > 0
    with:
      namespace: $(inputs.namespace)
      name: $(inputs.pod)
      previous: "true"
      tailLines: "100"
```

The LLM does not decide to run those checks. The YAML does.

## What can a step do?

This is the first question I had, because "workflow DSL" can mean anything from safe typed operations to "run this shell command as cluster-admin."

Kato is on the safer side. A step can call a registered built-in method. It cannot run arbitrary shell commands, `kubectl`, `bash`, `exec`, or user-supplied scripts. I searched the implementation for the obvious escape hatches (`exec`, `command`, `shell`, `bash`, `kubectl`, `pods/exec`) and did not find a free-form command method. The method interface is typed Go code:

```go
type Method interface {
    Name() string
    Description() string
    Params() []Param
    OutputFields() []OutputField
    Run(ctx context.Context, deps Deps, params map[string]string) (Outputs, error)
}
```

The built-in registry is assembled from method files under `internal/methods/`. The method list currently covers pod status/logs/describe/resources/usage, workloads, ReplicaSets, DaemonSets, StatefulSets, HPAs, Services, Ingresses, ConfigMaps, PVCs, Jobs, CronJobs, Nodes, Events, and two list methods for pod fan-out.

That means a `UseCase` author can compose these checks, but cannot invent a new Kubernetes read at workflow-authoring time unless someone first adds a new Go method and grants the right RBAC. That is an important guardrail. It moves extensibility through code review instead of through arbitrary runtime commands.

The DSL itself still has useful mechanics:

- `with` binds method parameters from inputs or earlier step outputs.
- `when` uses CEL over typed scalar outputs.
- `forEach` iterates over a list output from a previous step.
- `maxItems` caps fan-out. The default is 5 and the hard ceiling is 20.
- `summaryFilter` decides which outputs the LLM sees. Omitted means all outputs; an empty list means audit-only.

Kato validates `UseCase` definitions against known methods, known params, known output fields, valid references, valid `forEach` list outputs, and valid `summaryFilter` fields. That gives the DSL a real contract. A typo in `$(steps.status.restartCount)` is a validation problem, not something the LLM has to improvise around.

## Who runs the checks?

Kato runs inside the cluster using its own Kubernetes client and service account. The typed methods receive two clients: the normal Kubernetes client and an optional metrics client. There is no separate identity per `UseCase`, no per-workflow impersonation, and no indication in the current code that a workflow author can choose credentials.

So RBAC is controlled at install time, mostly by the Helm chart.

For the cluster resources being investigated, the chart grants read verbs: `get`, `list`, and `watch` on pods, pod logs, nodes, services, events, endpoints, ConfigMaps, PVCs, workloads, jobs, HPAs, EndpointSlices, ingresses, and pod metrics. It does not grant mutation verbs for application workloads. No patch Deployments, no delete Pods, no exec into containers.

Kato does write to its own objects. It creates and updates `Run` records, updates Kato CRD statuses, and reads model API key Secrets in the Kato namespace. So "read-only" needs a precise reading: Kato is read-only against the workloads and cluster evidence it diagnoses, not read-only against its own bookkeeping.

That identity model is simple, but it has consequences. If you install Kato broadly, every ready `UseCase` effectively runs with the same broad read identity. Namespaces and teams are not isolated by default. The safety story depends on who can create or update `UseCase` objects, who can trigger `Run` objects, which fields are exposed through `summaryFilter`, and whether the model endpoint is local or hosted.

## The model is intentionally flying on instruments

The LLM has no Kubernetes client. It has no tool loop. It cannot ask for one more log line because a hypothesis occurred to it. The summarizer gives it a system prompt telling it to diagnose only from collected evidence, cite the step evidence, and say inconclusive rather than guessing.

That is the best part of Kato and also the sharpest edge.

The benefit is obvious: the model cannot wander around the cluster. It cannot decide that a risky command would be helpful. It cannot produce a different investigation every time. It cannot hide its evidence trail, because the `Run` stores the step outputs.

But it can only reason over what the workflow author thought to surface.

That creates a different kind of failure mode: not hallucination, but blindness. If the `UseCase` checks pod status, events, and previous logs, the model may produce a very clean explanation for a pod failure while missing a node-level, autoscaler-level, CNI-level, DNS-level, admission-webhook-level, cloud-quota-level, or control-plane-level cause that the workflow never collected.

This is not a bug in Kato. It is the design bargain. Kato takes decision power away from the LLM and gives it back to the runbook author. If the runbook is good, the result is safer and more repeatable. If the runbook is shallow, the model becomes a confident narrator of a narrow evidence set.

The article practically writes its own warning label: deterministic evidence collection does not mean complete evidence collection.

## Where Kato fits well

Kato is a good fit when the diagnostic path is known, bounded, and worth repeating.

CrashLoopBackOff is the easy example. Check status, restarts, last termination reason, events, previous logs, resource limits, maybe the node. If the pod was OOMKilled and memory usage or limits show the pattern, Kato has enough to write a useful answer.

Pending pods are another fit. Check scheduling events, pod spec, node selectors, tolerations, PVCs, and maybe node status. The workflow can encode the usual suspects: insufficient CPU, taints, unbound PVCs, affinity mismatch, bad priority class, or image pull issues if the pod got far enough.

Service has no endpoints? Kato fits nicely. Check the Service selector, endpoint counts, backing pods, pod readiness, and recent events. The model does not need to roam. The evidence is small and structured.

Cluster DNS is the best example in the repo. The provided `cluster-dns-usecase.yaml` checks CoreDNS, node-local-dns, the kube-dns Service, HPAs, Corefile ConfigMaps, events, failing pods, logs, previous logs, resource requests/limits, and live usage when metrics-server is available. That is exactly the shape Kato wants: an SRE has already encoded the checklist, and the model explains the collected results.

I would also put pre-flight and post-deploy checks in this bucket. After deploying an app, run a Kato `UseCase` that checks Deployment rollout state, HPA state, Services, Ingress, recent warning events, and a bounded sample of failing pods. It is not a general incident commander. It is a repeatable health narrative for one known workload.

## Where Kato starts to struggle

The harder cases are the ones where the first symptom is far away from the cause.

Take an HPA that wants more replicas but the cluster cannot place them. Kato has a `check_hpa` method, and it can report min/max/current/desired replicas, `atMax`, `ableToScale`, `scalingLimited`, metrics, and condition text. That is useful. But if the real problem is lack of compute, Kato also needs the workflow to inspect unschedulable pods, scheduling events, node allocatable capacity, node conditions, and probably autoscaler-specific objects or logs.

With Cluster Autoscaler or Karpenter, the missing evidence can live outside Kato's current method set. Why did Karpenter not provision? Was there an instance type constraint? A subnet or security group discovery issue? A cloud quota problem? A NodePool limit? A consolidation or disruption setting? Did Cluster Autoscaler refuse to scale because of max node group size, unready nodes, taints, or a failed cloud-provider call? Kato's current built-ins can see Kubernetes pods, nodes, events, HPAs, and workloads. They do not appear to include Karpenter CRDs, Cluster Autoscaler status/config/log parsing, cloud provider quota checks, or controller logs unless those are exposed through ordinary pod logs and explicitly included in a workflow.

Node pressure and evictions are similar. Kato can check node conditions, describe nodes, list failing pods, inspect pod status, read events, compare resource requests/limits, and use metrics-server for pod usage. That can catch a lot. But high eviction rates often require a broader view: kubelet eviction thresholds, imagefs/nodefs pressure, ephemeral-storage usage, DaemonSet overhead, noisy neighbors, container runtime issues, actual node disk usage, cloud volume problems, and time-series trends. The current method set does not give you arbitrary node filesystem metrics or Prometheus queries. If the event history has already rotated away, the model may see only the aftermath.

Admission and control-plane failures are another awkward category. A pod stuck because a webhook times out may show up in events. But the root cause might be the webhook Deployment, its Service endpoints, network policy, DNS, certificate expiry, or API server admission latency. Kato can diagnose that only if the workflow author connects those dots and collects those objects.

The pattern is the same every time: Kato is strong when the workflow author knows the dependency graph. It is weak when the problem requires discovering the dependency graph during the incident.

## Broken-cluster paradox

There is an obvious operational concern: Kato runs inside the cluster it is supposed to troubleshoot.

That is fine for many app-level incidents. A broken Deployment, a bad Service selector, a CrashLooping workload, or a missing ConfigMap does not necessarily stop the Kato controller, the API server, CoreDNS, metrics-server, and the model endpoint from working.

But for cluster-level incidents, the placement matters a lot. If the API server is degraded, Kato's Kubernetes reads slow down or fail. If DNS is broken, Kato may still talk to the API server through in-cluster config, but model endpoints, webhooks, or external services may fail depending on networking. If the nodes hosting Kato are under memory or disk pressure, the troubleshooting tool can be evicted along with everything else. If metrics-server is down, usage checks degrade to `metricsAvailable: false`. If the CNI is broken badly enough, even an otherwise healthy Kato pod may not reach what it needs.

Kato handles some of this gracefully. Step errors become findings, slow checks hit `KATO_STEP_TIMEOUT`, and LLM failure does not discard the collected evidence. But that is not the same as out-of-band diagnostics.

For serious production use, I would think about deployment topology before I thought about prompts. Run Kato in a protected system namespace. Give it priority and sane resource requests. Consider whether it belongs in every workload cluster, in a management cluster reaching into workload clusters, or both. Keep the model endpoint local if data egress matters. And have a boring fallback for the bad day when the API server, CNI, DNS, or the nodes running Kato are part of the incident.

A troubleshooting tool inside the blast radius is still useful. It is just not a black box flight recorder.

## How this compares to Temporal-style durability

Kato does not use [Temporal](https://temporal.io/ai/agentic-ai), and I do not think it needs to for its current scope. A single Kubernetes operator executing short, read-only checks and writing a `Run` CR is a reasonable architecture.

Temporal solves a broader problem: durable execution across long-running workflows, distributed workers, retries, human intervention, external services, and recoverable state. Temporal's AI messaging is about persisting LLM calls, tool calls, and conversations so agents can survive crashes and resume without repeating completed work. Google's [Gemini + Temporal tutorial](https://ai.google.dev/gemini-api/docs/temporal-example) shows the usual pattern: the workflow owns the agent loop; LLM calls and tool calls are activities; Temporal persists each completed boundary and resumes after failures.

That is a different shape from Kato. In a Temporal-style agent, the workflow engine makes an agentic loop reliable. In Kato, the runbook mostly replaces the agentic loop.

Other durable execution tools land in the same category. [Restate](https://docs.restate.dev/use-cases/ai-agents) emphasizes retrying rate limits and network failures, persisting LLM/tool steps, suspend/resume, human approvals, parallelization, sub-workflows, compensation, and execution traces. [Inngest](https://www.inngest.com/ai) pitches step-level checkpointing, LLM telemetry, flow control, human-in-the-loop waits, and long-running serverless functions. [DBOS](https://docs.dbos.dev/) provides Postgres-backed durable workflows and queues, with AI research-agent and document-pipeline examples.

If Kato grew into remediation, multi-hour investigations, human approval gates, cross-cluster workflows, ticket creation, pull-request fixes, or distributed execution, those systems would become more relevant. At that point Kato would need to answer classic workflow questions: Which steps are idempotent? Which side effects can be repeated? Where are approval signals stored? How are retries bounded? How do you resume after a controller upgrade?

For now, Kato sidesteps most of that by staying narrow.

## How it differs from K8sGPT and HolmesGPT

Kato is also not the same kind of tool as [K8sGPT](https://github.com/k8sgpt-ai/k8sgpt) or [HolmesGPT](https://github.com/HolmesGPT/holmesgpt).

K8sGPT scans a cluster with built-in analyzers and can explain findings with different AI backends. It is broad and easy to run: analyze the cluster, filter by resource, explain, output JSON, optionally serve through MCP. HolmesGPT is broader still: a CNCF SRE agent that can query Kubernetes, observability platforms, cloud services, databases, runbooks, ticketing systems, and more. Its design is much closer to an agentic troubleshooting loop over live data sources.

Kato's bet is different. It is not trying to infer the right analyzer set for every situation. It wants teams to capture their own runbooks as versioned Kubernetes objects. That makes it less general, but also more reviewable. A `UseCase` can be code-reviewed like any other operational policy: what will it read, when will it branch, what will it send to the model, and what prompt will it use?

That is the niche I find compelling.

## What I would watch next

The project is at `0.1.0`, so the interesting question is not whether it already competes with mature SRE platforms. It does not. The interesting question is whether the constraint holds as features arrive.

A few areas are worth watching:

- Per-tenant or per-namespace identity. One service account for every `UseCase` is simple, but not always enough.
- More explicit policy around who can create `UseCase` and `Run` objects. Workflow authors control what evidence gets collected and what the model sees.
- Panic isolation per step, which the development docs already identify as a gap.
- Stronger secret and sensitive-field handling beyond env var redaction and user-managed `summaryFilter`.
- Versioning and compatibility for `UseCase` definitions as methods evolve.
- Multi-replica behavior. The docs currently warn that scaling is not just a replica bump because caches and the external `Run` reconciler are in-process.
- Whether remediation stays out of scope. The moment Kato gets write tools, the trust model changes.
- How it should be deployed for cluster-level failures. In-cluster troubleshooting is convenient until the cluster is what broke.

My instinct is that Kato should resist becoming a full agent platform. Its best idea is the boring one: deterministic evidence collection first, model prose second.

That pattern is useful beyond Kubernetes. A lot of production AI systems would be safer if they used the model less. Not never. Just later, after the system has already done the boring, typed, auditable work.
