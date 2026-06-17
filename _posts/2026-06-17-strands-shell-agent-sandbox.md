---
layout: post
title: "Strands Shell: the agent sandbox that isn't one"
summary: "A deep look at the new open-source agent shell from the Strands team — its in-memory VFS, credential mediation, SSRF guard, and where it fits in an ecosystem that already has Code Interpreter, E2B, Modal, and Claude Code."
tags: [ai-agents, sandbox, code-interpreter, agent-tools, rust, mcp, aws]
---

Last night, [Clare Liguori](https://x.com/clare_liguori/status/2066957450423751019) (AWS Principal Engineer) tweeted:

> *"Introducing Strands Shell 🐚 A shell made for agents. Written in Rust, with bindings for Python and Node.js. Control what agents can see and do with files, network domains, and creds in the shell. All in-process, no fork/exec/syscalls, <1ms cold start."*

The repo — [strands-agents/shell](https://github.com/strands-agents/shell) — had been in private development since February, went public two days ago, and already sits at 68 stars. I spent the evening reading the source, running the test suite (1,757 tests, all green), and mapping it against the things people will immediately compare it to: AgentCore Code Interpreter, E2B, Modal sandboxes, Claude Code's Agent tool, and CloudFlare Code Mode.

The short version: **Strands Shell isn't a sandbox, and it isn't a container runtime. It's a mediation layer — and that's exactly what makes it interesting.**

### Community first reactions

The launch-day conversation on X surfaced clear signals about what people want from a tool like this:

- **Dynamic policy reconfiguration** — Geoff Goodman ([@filearts](https://x.com/filearts)) asked whether network policies can change at runtime: *"It seems like policy is declarative. If we want some dynamism on a running shell is that possible?"* Clare confirmed domain policy is evaluated on each network call, making runtime changes feasible, but there's no mechanism for it yet.

- **WASM browser target** — Adnan Khan ([@adnanthekhan](https://x.com/adnanthekhan)) asked about `wasm32-unknown-unknown` for in-browser use: *"Lots of fun use-cases for a light agent harness that runs entirely in-browser."* Clare's response: *"Oh I like that idea!"*

- **Drop-in binary for coding agents** — Matt Rickard ([@mattrickard](https://x.com/mattrickard)) wants to use it as a transparent shell replacement: *"Any ideas to run it as a binary + config? Codex / Claude run commands through this directly instead of via bindings."* Clare pointed to the MCP server path.

- **Adjacent projects** — [vercel/just-bash](https://github.com/vercel/just-bash) and [torkbot/sandbox](https://github.com/torkbot/sandbox) (libkrun-backed microVMs) came up as related approaches to agent sandboxing, each trading off different points on the mediation-vs-isolation spectrum.

No formal roadmap yet — the repo has zero open issues and zero milestones — but the community vectors are clear.

---

## What it actually is

Strands Shell gives your agent a shell that can't see your real filesystem. You configure what the shell *can* see at construction time via **binds**:

```python
from strands_shell import Shell, Bind

shell = Shell(
    binds=[
        Bind("/host/data", "/workspace", mode="copy"),
        Bind("/host/output", "/output", mode="direct", readonly=False),
    ],
    credentials=[CredEntry(url="api.example.com", api_key_env="EXAMPLE_KEY")],
)
result = shell.run("grep ERROR /workspace/logs | sort | uniq -c | sort -rn | head")
```

The shell runs **in-process** — no subprocess, no `fork`/`exec`, no container daemon. All shell commands are implemented in Rust against an in-memory virtual filesystem. Cold start is under 1ms because there's nothing to boot.

That last sentence is worth sitting with: **this is a shell that doesn't call `/bin/sh`.** Every command — `grep`, `curl`, `jq`, `ls`, `cat`, `wc`, `sort`, `head` — is implemented as a Rust function operating on an in-memory inode tree. The `Kernel` trait mediates every filesystem operation, every network request, every credential resolution.

---

## The VFS: not Docker, not CoW, smarter than it looks

This is where the technical story gets interesting. The virtual filesystem has two bind modes with very different semantics:

### `mode: "copy"` — one-time snapshot at build time

When you bind with `mode="copy"` (the default), the shell recursively walks the host directory and **copies every file into memory** at construction time. The code is remarkably straightforward:

```rust
// src/vfs.rs:844-887 — called once, at Shell::build()
fn copy_from_host(vfs: &mut Vfs, src: &Path, dest: &str, uid: Uid, gid: Gid) {
    for each entry in src:
        if directory → mkdir in VFS, recurse
        if symlink  → create symlink inode
        if file     → std::fs::read() into InodeData::File(Vec<u8>)
                        // executable bit preserved on Unix
}
```

After construction, the VFS is **completely independent** of the host. Changes in the shell don't touch the host. Host changes after construction are invisible. There's no copy-on-write, no layering, no overlay filesystem — it's a flat `HashMap<Ino, Inode>` of bytes. This means:

- ✅ Perfect reproducibility across runs (same binds = same VFS content)
- ✅ No side effects on the host
- ❌ Memory cost scales with bound data size
- ❌ No incremental updates — you rebuild the Shell to refresh

### `mode: "direct"` — live host passthrough (use carefully)

Direct mode creates `HostFile` and `HostDir` inodes that resolve to the real filesystem on every read/write. Symlink traversal is canonicalized to prevent escape. If you set `readonly: false` (the default for direct), writes go to the host. This is the mode to use when the agent needs to produce persistent output or interact with live data.

The key insight: **there is no snapshot mechanism.** The README draws a comparison to Docker image filesystems, but it's aspirational, not implemented. There's no `docker commit` equivalent, no layered CoW, no incremental diff. If you want snapshot semantics, you either use copy mode (which is a point-in-time copy) or you build your own serialization layer on top.

### The inode types

The VFS supports a richer set of inode types than you'd expect from a tool this young:

| Inode type | Purpose |
|---|---|
| `File(Vec<u8>)` | Regular file, content in memory |
| `Dir(BTreeMap)` | Directory with sorted children |
| `Symlink(String)` | Symbolic link (target is a string) |
| `CharDevice` / `BlockDevice` / `Fifo` | Special files for `/dev/null`-style semantics |
| `HostFile(Path, readonly)` | Passthrough to real file |
| `HostDir(Path, readonly)` | Passthrough to real directory |

The VFS starts with an empty `/`, creates standard directories (`/home/lash`, `/tmp`, `/usr/bin`, `/bin`), then processes binds. The agent user is `lash` — a nice touch that makes the inside of the shell feel like a real Linux environment without exposing one.

---

## The security model: mediation, not sandboxing

The README and [SECURITY.md](https://github.com/strands-agents/shell/blob/main/SECURITY.md) are explicit about this:

> *"Strands Shell is a mediation layer, not a security sandbox. It does NOT protect against memory-safety exploits in the shell engine itself, timing side-channels, or an attacker who controls the host process."*

This is the right call. The shell mediates three things through its `Kernel` trait:

### 1. Filesystem mediation
Every path access goes through `Kernel::resolve_path()`. The VFS is deny-by-default — if a path isn't in the inode tree (copy mode) or under a configured bind (direct mode), it returns `ENOENT`. There's no `/etc/passwd` to leak, no `/proc` to enumerate, no `.ssh` to exfiltrate.

### 2. Network mediation (`check_url` + credential injection)
Before any HTTP request, the kernel calls `check_url(url)`. It blocks:
- Loopback addresses (`127.0.0.0/8`, `::1`)
- Link-local addresses (`169.254.0.0/16` — this blocks IMDS)
- Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- Any hostname that resolves to a blocked IP

If the URL passes, `resolve_credential(url)` checks if a `CredEntry` matches. Each credential has a `kind` (currently `"bearer"`), a set of HTTP methods, a URL pattern, and either an inline `api_key` or an `api_key_env` reference. The kernel injects `Authorization: Bearer <token>` into the request — the agent's shell code never sees the credential.

This "agent never sees the credential" pattern is an emerging design principle with two distinct architectural approaches. [Pipelock](https://github.com/luckyPipewrench/pipelock) (720★, Apache 2.0) takes the opposite placement: an out-of-process **network proxy** that sits between the agent and the internet. Its design is "capability separation" — the agent has secrets in its environment but no direct network access; Pipelock has network access but can't access the agent's secrets. It scans outbound requests for credential leaks (62 DLP patterns, with optional redaction that rewrites matched values to typed placeholders like `<pl:aws-access-key:1>` before they leave), blocks exfiltration, and injects auth at the boundary. Bonus: kill switch, Ed25519-signed flight recorder, and OS-native process sandbox (Landlock + seccomp on Linux).

Strands Shell and Pipelock aren't competitors — they compose. Pipelock at the agent boundary for full egress control; Strands Shell inside the execution context for filesystem and command mediation. Same principle, different layer in the stack.

### 3. Command allowlisting
The shell ships with a curated set of commands (`grep`, `curl`, `jq`, `sort`, `wc`, `head`, `cat`, `ls`, `find`, `sed`, `awk`, `xargs`, and more — full list in [COMMANDS.md](https://github.com/strands-agents/shell/blob/main/COMMANDS.md)). There's no `ssh`, no `scp`, no `nc`, no package manager. You can configure which commands are available, but you can't add arbitrary binaries — there's no `exec`.

---

## Where this fits: the three-axis framework

You may be trying to place this, like I was — is it a sandbox? A container runtime? A competitor to Claude Code's Agent tool? It's none of those. Strands Shell, Code Interpreter, Claude Code Agent tool, and CloudFlare Code Mode operate on **different axes**. Here's the framework:

### Axis 1: Execution model — *how* does code run?

| Model | Description | Example |
|---|---|---|
| **Tool-calling** | Agent calls one tool at a time. Each result enters LLM context. Agent reasons, decides next call. | OpenAI function calling, Claude tool use |
| **One-shot code execution** | Agent writes complete script. Sandbox runs it. Only final output returns to agent context. | Code Interpreter, CloudFlare Code Mode, Strands Shell |

This is the axis [CloudFlare named](https://blog.cloudflare.com/code-mode/) when they said "Code Mode beats Tool Mode." The insight: LLMs are better at writing code to call APIs than at calling APIs directly through tool-use tokens they've rarely seen in training data. And one-shot execution keeps intermediate results out of context — the agent gets the answer, not the raw 500-line grep output.

### Axis 2: Coordination model — *how* do agents work together?

| Model | Description | Example |
|---|---|---|
| **Single agent** | One LLM, one session, one toolset | Basic ChatGPT, basic Claude Code |
| **Sub-agent delegation** | Parent spawns children, collects summaries | Claude Code Agent tool, pi.dev `/run reviewer`, Hermes `delegate_task` |
| **Workflow orchestration** | A deterministic script (not an LLM) defines a graph of agents with conditional routing | Claude Code dynamic workflows (`ultracode`) |
| **Agent teams** | Peers share a task list, claim work, coordinate via messages | pi-agent-teams, Claude Code agent teams |

### Axis 3: Session model — *how* are sessions managed?

| Model | Description | Example |
|---|---|---|
| **Turn-based interactive** | Ongoing conversation loop with memory and iteration | Claude Code interactive, E2B PTY sessions |
| **One-shot fire-and-forget** | Execute and produce output, no state retained | Code Interpreter invoke, Strands Shell `run()` |

### Where everything lands

| Tool | Execution model | Coordination | Session | Isolation tech |
|---|---|---|---|---|
| **Strands Shell** | One-shot shell | None (it's a tool) | One-shot | In-process mediation |
| **AgentCore Code Interpreter** | One-shot code | None (it's a tool) | One-shot (per-invoke, session-scoped state) | Firecracker microVM |
| **CloudFlare Code Mode** | One-shot (TS in V8) | None | One-shot | V8 isolate |
| **E2B** | Both (commands + PTY) | None | Session-based | Firecracker microVM |
| **Modal Sandbox** | Both | None | Session-based | gVisor container |
| **Daytona** | Both | None | Session-based | Docker (Kata optional) |
| **Claude Code Agent tool** | Tool-calling | Sub-agent delegation | Turn-based | Host process (agent-configured) |
| **Claude Code dynamic workflows** | Tool-calling | Workflow orchestration | Turn-based per sub-agent | Host process |

Strands Shell isn't competing with Claude Code's Agent tool — they're on different axes. You could use Strands Shell *inside* a Claude Code sub-agent as its execution tool. Strands Shell isn't competing with Code Interpreter either — it's a library you embed; Code Interpreter is a managed service. They solve different parts of the problem.

---

## Comparison: Strands Shell vs. AgentCore Code Interpreter

AgentCore Code Interpreter is the AWS-managed answer to "my agent needs to run code safely." It's a Firecracker microVM with 100+ pre-installed Python libraries, three network modes (Sandbox/Public/VPC), IAM role integration, CloudTrail observability, per-second billing, and built-in session lifecycle management.

Here's the side-by-side:

| Dimension | Code Interpreter (AWS managed) | Strands Shell (OSS library) |
|---|---|---|
| **Isolation** | Dedicated Firecracker microVM per session | In-process mediation (no VM boundary) |
| **Cold start** | Seconds (microVM boot + runtime init) | <1ms (in-process construction) |
| **Languages** | Python, JavaScript, TypeScript | Bourne shell semantics + Lua scripting |
| **Pre-installed tooling** | 100+ Python libraries (boto3, numpy, pandas, duckdb, opencv, spacy…) | Curated shell commands (grep, curl, jq, awk, sed…) |
| **Filesystem** | Per-session isolated, S3/EFS mountable | In-memory VFS with copy/direct bind modes |
| **Network** | Sandbox (S3 only), Public, or VPC via ENI | URL-level allow/deny with credential injection |
| **IAM / auth** | Execution role, MMDS-injected temp credentials | `CredEntry` — bearer tokens injected per-domain |
| **Observability** | CloudTrail spans, CloudWatch metrics (session count, duration, invocations, errors) | None built-in (you instrument) |
| **Session lifecycle** | `StartSession` → `InvokeCodeInterpreter` → `StopSession` | `shell.run(cmd)` — atomic, no session state between calls |
| **Deployment** | AWS-managed, referenced by ARN | Embed in your process (pip install / npm install) |
| **Cost** | Per-session billing | Free (you host it) |
| **File size limits** | Inline up to 100MB, S3 upload up to 5GB | Bound by available memory (copy mode loads files into RAM) |
| **Multi-tenancy** | Hardware isolation between customers | No isolation between Shell instances in the same process |

**The rule of thumb:** If your agent runs on AWS and needs Python data analysis with managed security, reach for Code Interpreter. If your agent needs sub-millisecond shell pipelines, runs outside AWS, or you want library-level control over the execution environment, reach for Strands Shell.

They compose well: a Strands agent running on AgentCore Runtime can use Code Interpreter as its Python execution tool *and* embed Strands Shell for shell-heavy workflows — each handling what it's best at.

---

## Three use cases where Strands Shell shines

### 1. Configuration auditing with mediation

An agent auditing Nginx configurations across a fleet doesn't need access to the whole filesystem. Bind `/etc/nginx` in copy mode — config files are small, the copy is instant, and the VFS is isolated. The agent runs `grep -rn "listen 80" /etc/nginx | wc -l`, sorts by server block, and returns a structured report. It never sees `/etc/shadow`, never touches the real filesystem. For larger or remote data, direct mode with `readonly: true` lets the agent stream through logs on an attached volume without copying them into memory first.

### 2. Eval harnesses

Running 10,000 agent evaluations requires sub-millisecond cold starts and perfect reproducibility. Strands Shell constructs in under 1ms, uses exactly the same VFS content every time (copy mode), and leaves no side effects. Compare to Docker-based eval harnesses where container startup alone adds 90ms–2s per test case.

### 3. MCP server for multi-agent teams

Strands Shell can run as an MCP server over stdio, making it available to any MCP-compatible agent:

```json
{
  "mcpServers": {
    "shell": {
      "command": "uvx",
      "args": ["strands-shell", "--mcp", "--config", "sandbox.toml"]
    }
  }
}
```

Multiple agents can share a shell server, each getting its own isolated VFS per session config. The MCP tools (`shell_spawn`, `shell_grep`, `shell_curl`, etc.) are exposed with full JSON schema — the agent never touches a raw shell prompt.

---

## When NOT to use it

Strands Shell is explicit about its limits:

- **It's not a security sandbox.** For adversarial or multi-tenant workloads, run each Shell instance inside a container or microVM. The mediation layer assumes the agent isn't actively trying to exploit the shell engine itself.
- **It's not a container runtime.** There's no image layering, no `docker build` equivalent, no ECR integration. If you need OCI images with pre-installed toolchains, use Code Interpreter, E2B, or Modal.
- **It's not a workflow orchestrator.** Strands Shell is a tool that agents use, not a framework for coordinating multiple agents. If you need conditional routing, parallel execution, or retry logic across agent invocations, reach for Step Functions, Strands Graph, or Claude Code dynamic workflows — not Shell.
- **No interactive turns.** `shell.run()` is synchronous and atomic. There's no session state between calls, no PTY, no conversation loop. If your agent needs an interactive terminal where it can explore and iterate, E2B's PTY or Modal's sandbox sessions are better fits.

---

## The decision matrix

| Your situation | Use |
|---|---|
| Agent on AWS, needs Python data analysis, managed security | **AgentCore Code Interpreter** |
| Agent needs sub-ms shell pipelines, library-level control | **Strands Shell** |
| Agent needs interactive terminal session with state | **E2B PTY** or **Modal Sandbox** |
| Agent needs full OCI container with custom toolchain | **E2B / Modal / Daytona / Northflank** |
| Agent needs TypeScript execution at the edge, zero cold start | **CloudFlare Code Mode (Dynamic Workers)** |
| Multiple agents need to coordinate with conditional routing | **Step Functions** (AWS) or **Strands Graph** (SDK) |
| You need both shell + Python, AWS-native, fully managed | **Code Interpreter** + embed Strands Shell for shell tasks |
| You're building an eval harness with 10k+ runs | **Strands Shell** (sub-ms cold start, zero side effects) |
| You want to give multiple agents a shared shell tool via MCP | **Strands Shell MCP server** |

---

Strands Shell is one of those tools that's easy to mis-categorize because it looks like things we already know — a shell, a sandbox, a container runtime. It's none of those. It's a **filesystem mediation layer with a shell interface**, and it occupies a narrow but genuine gap in the agent tooling landscape: the space between "give the agent unrestricted `subprocess.run()`" and "provision a full microVM for every shell command." That gap matters more than it first appears.

---

*Strands Shell source code exploration — VFS internals, bind semantics, credential injection, SSRF guard — was done against the [strands-agents/shell](https://github.com/strands-agents/shell) repo at commit `9bf907c`.*
