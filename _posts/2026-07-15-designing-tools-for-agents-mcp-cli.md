---
layout: post
title: "Stop handing agents a junk drawer: MCP and CLI tool design"
summary: "A short guide to designing tools that agents can choose, call, recover from, and trust—whether the interface is MCP or a command line."
tags:
  - ai-agents
  - mcp
  - cli
  - tool-design
  - developer-experience
sources:
  - title: "From REST to MCP (2/2): The Design Shift"
    url: "https://dev.to/ibrahim_mohammed_47/from-rest-to-mcp-22-the-design-shift-4bda"
    note: "Ibrahim Mohammed's comparison of REST and MCP interface design."
  - title: "Agentic Go CLI Design"
    url: "https://github.com/skillrig/cli/tree/main/.agents/skills/agentic-go-cli-design"
    note: "Skillrig's agent-friendly Go/Cobra CLI design guidance."
  - title: "MCP Tools specification"
    url: "https://modelcontextprotocol.io/specification/2025-11-25/server/tools"
    note: "The protocol definition for discovering and invoking MCP tools."
  - title: "We Cut 40% of Our MCP Tools to Get Into Claude's Connector Directory"
    url: "https://www.elastic.co/search-labs/blog/mcp-connector-claude-directory"
    note: "Elastic's account of the Claude connector review and the resulting tool-catalog changes."
---

An agent does not need another drawer full of tiny, mysterious buttons. It needs a small control panel with labels, guardrails, and a big **"try this next"** arrow.

That is the design shift in [Ibrahim Mohammed's REST-to-MCP comparison](https://dev.to/ibrahim_mohammed_47/from-rest-to-mcp-22-the-design-shift-4bda). A traditional REST client is written and tested ahead of time. An agent chooses operations *while the request is happening*. If we simply wrap every REST endpoint as a tool, we make the model reconstruct the client application from scratch.

MCP is the protocol that lets a server advertise named tools with descriptions and JSON schemas, then lets a host invoke them ([specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)). The backend can still be REST. The MCP tool is the agent-friendly adapter.

```text
user request → agent chooses a tool → MCP server → existing API / database
```

The same lesson applies to a shell tool. [Skillrig's agentic Go CLI design](https://github.com/skillrig/cli/tree/main/.agents/skills/agentic-go-cli-design) asks a command to succeed from `--help` alone—not from folklore, a Slack thread, or an agent's heroic guessing.

## 1. Sell outcomes, not plumbing

Bad agent surface:

```text
create_project
link_project_repo
list_project_keys
create_project_key
```

Better, when the sequence is deterministic:

```ts
create_project({ team, name, platform, repository })
// creates, links, finds or creates the usable key, returns the result
```

This is not permission to build `manage_everything()`. The boundary is a **coherent outcome the agent can sensibly choose**.

For a CLI, the equivalent is a command with a crisp job and enough help to run it correctly:

```bash
skillrig verify --help
skillrig add terraform-plan-review --dry-run
```

A useful test: can someone explain the command or tool without saying “well, first call three other things”?

### Coherent does not mean catch-all

There is an important constraint on outcome-oriented design: **do not hide incompatible effects behind a mode switch**. A REST-shaped wrapper such as `api_request({ method, path, body })`, or `manage_attachments({ action: "get" | "delete" })`, turns the model into an API client author at runtime. It also makes the tool's risk impossible to state honestly: is it read-only or destructive?

[Elastic's Claude connector review](https://www.elastic.co/search-labs/blog/mcp-connector-claude-directory) makes this concrete. The review required universal MCP tool annotations and read/write separation. Elastic split `cases.attachments` into `cases.get_attachments` and `cases.manage_attachments`, removed an ambiguous action tool, and reduced its default Elasticsearch catalog from 36 tools to 22.

That is not a contradiction with composing a deterministic workflow such as `create_project`. The distinction is **one accountable outcome with a stable safety profile** versus a remote-control wrapper that asks the model to choose arbitrary transport operations. Combine predictable setup steps when they serve one outcome; split operations when their authority, reversibility, approval requirement, or recovery path differs.

A practical rule:

```text
one tool = one understandable outcome + one honest risk label
```

For MCP, make that label machine-readable with accurate annotations: `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`. They help a host choose sensible approval defaults—such as auto-allowing a document lookup but requiring approval for workflow generation—but they are not authorization. The server must still enforce permissions and validate requests.

The result is the real alternative to “just wrap your REST API”: a deliberately small agent interface. Keep operations that agents can select safely and recover from; remove or redesign endpoints that are merely implementation plumbing, unavailable in a customer's product tier, or too ambiguous to describe precisely.

## 2. Treat descriptions as production code

For an MCP tool, the description is part of the model's runtime decision-making. This is not enough:

```text
search_logs(service, query)
"Search logs."
```

This is much better:

```text
Search application logs while investigating runtime behavior.
`service` is a deployed service name. Times are UTC and may span at most
24 hours. This does not search security audit events.
```

That wording teaches the model when to select the tool, how to build valid arguments, and where *not* to use it. Changing it can change production behavior—even if the handler did not change.

The CLI version is complete `--help`: a long description, examples, argument rules, and standard flags. Help text is not decoration; it is an API an agent reads at runtime.

## 3. Make failure a fork in the road, not a brick wall

A bare `Unauthorized` is a riddle. Did the mutation happen? Should the agent retry? Should it ask the user for a password? (Usually: absolutely not.)

Prefer a structured answer with an explicit recovery path:

```json
{
  "error": "AUTHENTICATION_REQUIRED",
  "state_changed": false,
  "recovery": "Ask the user to reconnect through the account UI, then retry. Do not request credentials in chat."
}
```

The CLI sibling is just as important: preserve the real error, then add a useful route forward.

```text
add failed: remote repository not found
→ Check .skillrig/config.toml for the configured origin.
→ If it is private, run 'gh auth status'.
→ Re-run with --verbose for underlying command output.
```

Skillrig also gives failure classes stable exit codes: usage/config, verification, and missing-prerequisite/auth failures should not all look like “something went wrong.” That makes CI and agents much less guessy.

## 4. Keep the model's backpack light

Agents pay for every repeated call and every irrelevant field they carry in context.

- **Batch** a clear repeated operation: `create_pages(parent, pages[])`, rather than making the model create 20 pages one at a time.
- **Filter** large MCP results to the fields needed for the next decision.
- **Disclose progressively**: a huge MCP server can offer search/detail/read/write tools instead of loading 400 specialist schemas at once.
- **Drill down** in a CLI: show a compact summary, then let `--json`, `jq`, or per-item files reveal the detail that matters.

The last point has a nice nuance. MCP results are often dropped straight into the model conversation, so small responses matter. A CLI can safely offer complete JSON because the agent can filter it first:

```bash
skillrig search terraform-plan-review --json | jq '.requires'
```

Different transport; same goal: do not make the model haul a suitcase full of data to answer a one-field question.

## 5. Put the next rung on the ladder

Good tools do not merely return state. They suggest the relevant next action and carry forward IDs already discovered.

```json
{
  "trace_id": "tr_42",
  "suggested_action": {
    "tool": "get_ai_conversation_details",
    "arguments": { "conversation_id": "conv_9" },
    "reason": "Fetch the full conversation behind this trace."
  }
}
```

A CLI can do the same in plain text:

```text
2 skills matched tag 'terraform'.
→ Run 'skillrig add <skill>' to vendor one,
  or 'skillrig search <name> --json' for full details.
```

That small footer is not fluff. It is navigation for the next agent turn.

## 6. Make dangerous actions deliberately boring

Models can produce well-formed requests that are perfectly wrong for the user's intent. For destructive work, combine layers:

```text
human confirmation → --dry-run / preview → explicit --force → change receipt + recovery path
```

For MCP, the tool description and host should require confirmation for high-impact operations. For CLIs, `--dry-run` previews the write, `--force` makes an overwrite intentional, and the result should say exactly what changed and whether a backup or rollback exists.

## A pocket checklist

Before adding an agent-facing tool or command, ask:

1. Does it represent one understandable outcome **and** one stable safety profile?
2. Can the agent discover and invoke it from its own interface—tool metadata or `--help`?
3. Do its annotations accurately communicate read-only, destructive, idempotent, and external-world behavior?
4. Do its errors preserve the cause and state the recovery?
5. Is its output only as large as the next decision needs?
6. Does it point to the next relevant action?
7. Does a risky mutation require a real human decision and provide a preview?

If the answer is yes, you have not merely exposed an API. You have given an agent a map.

## Sources

- Ibrahim Mohammed, ["From REST to MCP (2/2): The Design Shift"](https://dev.to/ibrahim_mohammed_47/from-rest-to-mcp-22-the-design-shift-4bda)
- Skillrig, ["Agentic Go CLI Design"](https://github.com/skillrig/cli/tree/main/.agents/skills/agentic-go-cli-design)
- Model Context Protocol, ["Tools specification"](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- Sean Story, Elastic, ["We Cut 40% of Our MCP Tools to Get Into Claude's Connector Directory"](https://www.elastic.co/search-labs/blog/mcp-connector-claude-directory)
