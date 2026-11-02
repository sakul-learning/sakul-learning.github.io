---
layout: post
title: "Claude's MCP connector checklist is a design review, not a REST wrapper test"
summary: "Anthropic's current directory checklist requires safe tool boundaries, honest annotations, narrow descriptions, usable failures, and real functional testing. Elastic's connector review shows what those rules change in a production catalog."
tags:
  - ai-agents
  - mcp
  - tool-design
  - claude
  - developer-experience
sources:
  - title: "Connector pre-submission checklist"
    url: "https://claude.com/docs/connectors/building/review-criteria"
    note: "Anthropic's live checklist for MCP connectors submitted to the Claude directory."
  - title: "Submit a connector to the directory"
    url: "https://claude.com/docs/connectors/building/submission"
    note: "Anthropic's submission-portal requirements."
  - title: "We Cut 40% of Our MCP Tools to Get Into Claude's Connector Directory"
    url: "https://www.elastic.co/search-labs/blog/mcp-connector-claude-directory"
    note: "Elastic's October 2026 account of applying the connector review requirements."
  - title: "Stop handing agents a junk drawer: MCP and CLI tool design"
    url: "https://sakul-learning.github.io/2026/07/15/designing-tools-for-agents-mcp-cli/"
    note: "Our earlier explanation of why MCP tools should expose outcomes rather than mirror REST plumbing."
---

In July, I argued that an MCP server should not simply publish one tool per REST endpoint. A traditional API client is written ahead of time; an agent chooses tools at runtime. If we hand it `api_request(method, path, body)`, we have asked the model to recreate our client library from a tool description.

Anthropic's live [Connector pre-submission checklist](https://claude.com/docs/connectors/building/review-criteria) turns that design principle into an acceptance gate for the Claude connector directory. It is not only checking whether an MCP server speaks the protocol. It checks whether every exposed tool has a clear safety boundary, an honest description, usable failures, a sensible response size, and a demonstrably working path through the real service.

[Elastic's account of its review](https://www.elastic.co/search-labs/blog/mcp-connector-claude-directory) shows the practical effect. The team says it touched more than 100 tools across three solution lines and reduced one Elasticsearch catalog from 36 published tools to 22. The useful lesson is not “always have fewer tools.” It is that **a tool catalog is an agent interface, not a REST inventory**.

This post records the current checklist, links it to the earlier [REST-to-MCP design post](https://sakul-learning.github.io/2026/07/15/designing-tools-for-agents-mcp-cli/), and uses Elastic's examples to make the rules concrete.

## The rule that makes a generic REST wrapper fail

Anthropic's checklist is unambiguous: a tool that accepts both safe HTTP methods (`GET`, `HEAD`, `OPTIONS`) and unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) is rejected. The documentation calls out the canonical anti-pattern:

```text
api_request({ method, path, body })
```

Writing “use GET for reads” in the description does not fix it. The operations must be in separate tools. The checklist says to split the catch-all tool into a read-only tool and one or more write tools; ideally, writes are split further into create, update, and delete.

That gives a precise boundary to the advice from July. We can compose a predictable sequence behind an outcome-oriented tool—say, `create_project({ team, name, repository })`—when the sequence has one accountable result and one stable safety profile. But we should not combine fundamentally different effects merely because the underlying REST API puts them behind the same route or because a smaller catalog looks tidy.

Elastic found this exact issue. It split `cases.attachments` into:

```text
cases.get_attachments
cases.manage_attachments
```

It also removed `execute_connector_sub_action` from the MCP catalog rather than trying to describe its many possible behaviors. That is the point of the review rule: an agent should not have to infer whether the current mode reads, changes, or destroys something.

A compact test for a proposed tool is:

```text
one tool = one understandable outcome + one honest risk label
```

## Tool annotations: permissions defaults, not authorization

The checklist requires every tool to include a title plus the applicable safety hint:

- `readOnlyHint: true` for a read-only tool;
- `destructiveHint: true` for a tool that modifies or deletes data.

These annotations drive Claude's auto-permissions. A read-only tool can run without a confirmation on every call; a destructive one always prompts. MCP also supports `idempotentHint` and `openWorldHint`, which should be set accurately whenever they apply.

Elastic illustrates the UX payoff: in its connector, **Get Document by ID** defaulted to “Always allow,” while **Generate Workflow** defaulted to “Needs approval.” The model and user receive the risk signal before the call—not from a guess after it fails.

But hints do not authorize anything. A malicious or buggy client can ignore them, and an innocuous-looking read can still disclose sensitive data if the service permits it. The server remains responsible for authentication, authorization, validation, and auditability. An accurate hint is a usability and governance aid; it is not a permission check.

## The complete tool-design checklist

The current Anthropic page applies these rules to **every** exposed tool:

1. **Separate reads from writes.** Do not accept safe and unsafe HTTP methods in one tool. Split writes by action type where practical.
2. **Document custom query tools.** If callers construct freeform paths, query strings, or request bodies, the description must name or link to the target API. A purpose-built tool that calls a fixed endpoint internally does not need this reference.
3. **Provide annotations.** Every tool needs a title and its applicable read-only or destructive hint.
4. **Keep names short.** Tool names must be 64 characters or fewer.
5. **Write narrow, accurate descriptions.** State what the tool does and when to call it; ensure the description matches its actual behavior.
6. **Avoid prompt-injection patterns.** Tool descriptions may describe the tool, but must not direct Claude to use unrequested external software, interfere with other tools, fetch behavioral instructions elsewhere, contain hidden or encoded instructions, attempt to override system instructions, or promote products unrelated to the tool's job.

Those last two points turn “documentation quality” into a runtime concern. A vague description makes selection unreliable. A description that tries to steer the model outside the tool's purpose becomes a security and policy problem. The safe pattern is deliberately dull: name the capability, the input constraints, the useful exclusions, and the result shape.

For example, this tells the model too little:

```text
search_logs(service, query)
"Search logs."
```

This creates a usable boundary:

```text
Search application logs while investigating runtime behavior.
`service` is a deployed service name. Times are UTC and may span at most
24 hours. This does not search security audit events.
```

## A connector must work, fail helpfully, and respect scope

The checklist goes beyond tool metadata. It requires every tool to return a successful response for valid parameters. Generic `Internal Server Error` and `Bad Request` failures without detail fail review. Inputs should be validated rather than silently accepted, and errors should tell the caller how to recover.

This aligns with the earlier article's “failure is a fork in the road” rule. A useful MCP failure tells the agent whether a change happened, what caused the problem, and the safe next action. It does not invite the agent to retry a destructive request blindly or to request credentials in chat.

Anthropic also checks that servers:

- return a response sized for the task rather than a database dump when the caller asked for a summary;
- collect no more conversation data than the tool requires;
- do not query Claude's memory, chat history, conversation summaries, or user files;
- call first-party APIs, or APIs the publisher legitimately proxies, from a server domain that matches the service;
- do not expose unsupported connector use cases: transferring financial assets or generating AI images, video, or audio. Tools for diagrams, charts, and UI mockups remain allowed.

Elastic's review experience adds useful implementation detail. Reviewers considered the language in tool and parameter descriptions, the implications of response metadata, token efficiency, expected error messages, and whether a tool was worth listing when a license tier or product flavor could not actually use it. That is why “it is a valid endpoint” is not a sufficient reason to publish it as an MCP tool.

## Submission evidence is part of the product

A working server is necessary but not sufficient. The current checklist asks for:

- **test credentials** for a fully populated account;
- **public documentation** by the publish date—an article or help-center page is acceptable, although private documentation can be shared during review;
- **allowed link URIs**, recommended for servers using `ui/open-link`; declared HTTPS origins and custom schemes can open without an extra prompt;
- confirmation that every tool was tested both in the **MCP Inspector** and as a **custom connector in Claude**.

The submission documentation supplies the portal detail; Elastic reports that its submission itself needed a sandbox environment, documentation, and three example prompts. Its server was unusual because every customer deployment had an embedded MCP server rather than one fixed URL. Elastic therefore had to create an isolated “Anthropic MCP Test” deployment and arrange a live connection from its own Claude Enterprise account.

That operational detail matters. A reviewer must be able to authenticate, call real tools with meaningful data, and see expected outcomes without being handed production access or an empty test tenant.

## Approval is not a release rehearsal

Elastic's second lesson is about launch readiness. Once approved, its connector was public immediately—there was no final Publish button or confirmation. Its first configuration form requested a server URL but not the per-customer OAuth `client_id` and `client_secret` that its non-static deployment model required. Early users therefore could not connect until the form was corrected.

The design implication is broader than this specific marketplace: a connector's setup path is part of the interface. If customers supply an instance URL, OAuth client, scopes, regions, or tenant identifiers, those requirements need to be represented in the submission material and tested before review. Also test the directory's account model. Elastic notes that Claude Enterprise allows one directory connection for a connector; users with separate Dev, QA, and Prod instances need additional custom connectors.

## Community review, Verified review, and the practical bar

Anthropic automatically scans each submission for policy compliance and lists compliant connectors as Community connectors by default. A connector judged highly useful may be escalated automatically to the higher-touch, slower **Verified** review, where reviewers functionally test every tool. The same checklist applies to either label; the label is a quality signal, not a different runtime mode.

Elastic reports that its review caught legitimate bugs, led it to automate a quality bar for tool definitions, and forced the catalog reduction described above. That is a useful mindset for any team preparing an MCP server: do not treat the checklist as friction to evade. Use it as a design review that exposes places where the agent is being asked to compensate for an API-shaped interface.

## A pre-implementation checklist for teams

Before publishing an MCP tool, ask:

1. Does it deliver one agent-understandable outcome?
2. Can it truthfully be called read-only or destructive, without explaining a mode switch?
3. If it is a write, should create, update, and delete be separate capabilities?
4. Does the name fit within 64 characters and does the description say exactly when to use it?
5. Does the description avoid model-behavior instructions and unrequested external actions?
6. Is the output limited to what the next decision needs?
7. Do invalid inputs and service failures yield actionable recovery information?
8. Does the tool call an API we own or legitimately proxy, and does it avoid collecting unnecessary conversational data?
9. Has the tool been run successfully through the Inspector and Claude with realistic test data?
10. Can a new customer complete authentication and configuration from the documentation alone?

If those questions are difficult to answer, do not add another REST wrapper. Redesign the agent-facing capability first.

## Sources

- Anthropic, ["Connector pre-submission checklist"](https://claude.com/docs/connectors/building/review-criteria)
- Anthropic, ["Submit a connector to the directory"](https://claude.com/docs/connectors/building/submission)
- Sean Story, Elastic, ["We Cut 40% of Our MCP Tools to Get Into Claude's Connector Directory"](https://www.elastic.co/search-labs/blog/mcp-connector-claude-directory)
- Sakul Learning, ["Stop handing agents a junk drawer: MCP and CLI tool design"](https://sakul-learning.github.io/2026/07/15/designing-tools-for-agents-mcp-cli/)
