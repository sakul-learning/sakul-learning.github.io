---
layout: post
title: Terraform Plugin Framework vs. formae's Plugin SDK
summary: 'A source-grounded comparison of two infrastructure plugin systems: Terraform''s protocol-first provider framework
  and formae''s actor-driven, Pkl-schema plugin SDK.'
tags:
- infrastructure-as-code
- terraform
- formae
- plugin-frameworks
- platform-engineering
source_folder: sources/terraform-plugin-framework-vs-formae-plugin-sdk
sources:
- title: 'Go plugins, actors, and schema evolution: inside formae''s plugin SDK'
  url: https://blog.platform.engineering/go-plugins-actors-and-schema-evolution-inside-formaes-plugin-sdk-353ccfd324ac
  note: Platform Engineering article, copied into the provided gist for accessible source text, describing formae SDK evolution
    from Go native plugins to Ergo actor-based external plugin processes.
- title: so0k gist copy of Platform Engineering formae plugin articles
  url: https://gist.github.com/so0k/9ce450e534eed34d892dc48da277a5c5
  note: Downloaded as a zip to /data/gists/platform-engineering-formae; contains gistfile1.txt with the formae plugin SDK
    article excerpt and gistfile2.txt with the Ergo actor primer.
- title: 'Unlocking Concurrency in Go: A Practical Guide to the Actor Model with Ergo'
  url: https://blog.platform.engineering/unlocking-concurrency-in-go-67a530807616
  note: Platform Engineering Ergo primer copied in gistfile2.txt; explains actor model basics, Ergo nodes, PIDs, Spawn/SpawnRegister,
    message passing, and Go infrastructure-tooling motivation.
- title: formae Plugin SDK overview
  url: https://docs.formae.io/en/latest/plugin-sdk/
  note: Official overview describing formae plugins as separately executed processes with CRUD, discovery, capabilities, rate
    limits, manifests, and Pkl schemas.
- title: formae Resource Schema tutorial
  url: https://docs.formae.io/en/latest/plugin-sdk/tutorial/02-schema/
  note: Schema tutorial showing Pkl ResourceHint and FieldHint annotations, identifiers, createOnly fields, and schema verification.
- title: platform-engineering-labs/formae pkg/plugin README
  url: https://github.com/platform-engineering-labs/formae/blob/main/pkg/plugin/README.md
  note: Repository README for the formae resource plugin SDK, including ResourcePlugin, actor transport, manifest/schema extraction,
    progress, retries, and conformance tests.
- title: hashicorp/terraform-plugin-framework
  url: https://github.com/hashicorp/terraform-plugin-framework
  note: Cloned locally to /data/repos/terraform-plugin-framework for direct code inspection; README and interfaces ground
    the Terraform side of the comparison.
- title: Terraform Plugin Framework documentation
  url: https://developer.hashicorp.com/terraform/plugin/framework
  note: HashiCorp documentation describing provider servers, providers, resources, data sources, functions, schemas, and protocol
    v5/v6 support.
- title: Terraform Plugin Framework benefits
  url: https://developer.hashicorp.com/terraform/plugin/framework-benefits
  note: 'HashiCorp''s rationale for the framework over SDKv2: clearer abstractions, modern Go interfaces, null/unknown handling,
    and explicit control.'
- title: Terraform Plugin Protocol
  url: https://developer.hashicorp.com/terraform/plugin/terraform-plugin-protocol
  note: Protocol documentation for Terraform CLI/plugin compatibility, gRPC/protobuf transport, and protocol v5/v6 boundaries.
---

The most interesting difference between Terraform's Plugin Framework and formae's Plugin SDK is not that both are written in Go, or that both ask plugin authors to implement CRUD. The important difference is where each system places the boundary between a plugin, the engine, and the schema language.

Terraform's framework is a mature provider-development layer around a versioned protocol. It sits between provider authors and Terraform Core, giving Go interfaces for providers, resources, data sources, functions, schemas, plan modification, state upgrades, and provider servers. The framework's job is to make the Terraform Plugin Protocol usable without requiring every provider author to hand-roll gRPC protocol implementations.

formae's SDK, as described in the Platform Engineering article, the Ergo primer copied into the same gist, and the public docs/repository, is newer and more opinionated about orchestration. The plugin is not just a provider binary answering Terraform Core's RPCs. It is a resource actor in a larger agent system. The formae article opens with a useful division of responsibility: the agent knows how to schedule, queue, order, rate-limit, execute, and retry plugin operations; the resource plugin owns the actual API interaction. The plugin author's public surface is deliberately small: implement resource CRUD, status, list, rate limits, discovery filters, and label configuration; put resource schemas in Pkl; ship a manifest.

That makes the comparison less like "which SDK is better?" and more like this:

> Terraform optimizes for a stable, ecosystem-scale contract between Terraform Core, provider binaries, the Registry, and Terraform configuration. formae optimizes for an agent-managed resource lifecycle where plugin schema, discovery, async progress, and reconciliation are first-class platform concerns.

Both are plugin systems. They solve different parts of the infrastructure problem.

## Two plugin boundaries

Terraform's boundary is protocol-first. The Terraform Plugin Protocol is a versioned interface between Terraform CLI and provider plugins, implemented with Protocol Buffers and gRPC. The framework supports protocol versions 5 and 6; provider servers wrap a `provider.Provider` and expose a protocol-specific server implementation. In the cloned repository, `providerserver.NewProtocol5`, `NewProtocol6`, and `Serve` adapt a framework provider into `tfprotov5` or `tfprotov6` servers.

That protocol boundary matters because Terraform has an enormous provider ecosystem. Compatibility is not only a technical concern; it is a distribution model. Terraform Registry discovery, CLI compatibility, provider release versioning, and migration from SDKv2 all depend on the idea that a provider is a separately distributed executable speaking a known protocol.

formae's boundary is agent-and-actor-first, and the copied article makes clear that this boundary was not the first attempt. The first iteration used Go's native `plugin` package and loaded `.so`/`.dylib` shared libraries in-process. That gave plugin authors the desired tiny interface, but it tied agent and plugin builds to the same Go version, package versions, build flags, and transitive dependency graph. The public documentation now says plugins run as separate processes or remote services and communicate with formae through documented public interfaces, not by being linked into formae. The repo's `pkg/plugin/README.md` adds the implementation detail: the external-plugin entry point calls `sdk.RunWithManifest`, which reads `formae-plugin.pkl`, extracts schemas from `schema/pkl/PklProject`, wraps the user's `ResourcePlugin`, starts an Ergo node, and announces capabilities to the agent. The `PluginActor` builds an announcement with supported resources, resource schemas, match filters, label config, namespace, version, and max request rate, then sends it to the agent's `PluginCoordinator`.

So Terraform treats the plugin boundary as a versioned RPC surface that Terraform Core controls. formae treats it as a process/actor boundary where the plugin announces capabilities and the agent orchestrates resource work.

That is the first architectural trade-off:

| Dimension | Terraform Plugin Framework | formae Plugin SDK |
| --- | --- | --- |
| Primary boundary | Terraform Plugin Protocol v5/v6 | Agent/plugin actor process boundary |
| Transport | gRPC/protobuf through terraform-plugin-go servers | Ergo actor messaging, serialized across process boundary |
| Core lifecycle owner | Terraform Core plan/apply/refresh/import lifecycle | formae agent scheduler, queue, reconciliation, discovery |
| Plugin role | Provider implementation for Terraform resources, data sources, functions, actions | Resource operation worker that announces capabilities and executes CRUD/discovery |
| Distribution emphasis | Registry-compatible provider binaries | Separately licensed plugins with manifest, schema package, and agent discovery |

## Why formae abandoned Go's native plugin package

The copied Platform Engineering article adds an important history that the docs alone only imply. formae's first plugin implementation used Go's built-in `plugin` package. A provider implementation exported a `Plugin` symbol, the agent called `plugin.Open`, looked up that symbol, asserted it implemented `ResourcePlugin`, and then called methods directly in-process.

That design was elegant for a monorepo prototype. It kept the developer surface tiny and avoided a new process per invocation. But Go native plugins have a harsh compatibility model: the host and plugin must be built with the exact same Go toolchain, and any package imported by both host and plugin must be at the exact same version and build flags. For an infrastructure plugin ecosystem, that becomes dependency hell. Different cloud SDKs pull different transitive dependencies; external plugin authors build on their own machines and release on their own schedules. Once the SDK became public, dynamic linking was the wrong boundary.

This history sharpens the Terraform comparison. Terraform also uses separate provider binaries, but for different historical reasons: ecosystem distribution and a stable Terraform Core/plugin protocol. formae moved out-of-process because the agent wanted to preserve a tiny Go interface while escaping Go shared-library lockstep. Terraform's separation is protocol compatibility at ecosystem scale; formae's separation is dependency, licensing, and actor-topology independence.

## Ergo and network transparency

The second gist file, the Ergo primer, helps explain why the formae article treats actors as more than an implementation detail. It introduces the actor model as a message-passing concurrency paradigm where actors process messages, hold private state, create more actors, send messages to known addresses, and change behavior for future messages. Ergo brings Erlang/OTP-style actors to Go using lightweight processes implemented on goroutines, with nodes hosting actor runtimes and PIDs naming actor processes.

formae uses that model to make plugin topology less special. The article says the formae agent already hosts an Ergo node and that plugin operations are orchestrated by a `PluginOperator`. The key move was to lift that operator into a separate OS process running its own Ergo node. Because Ergo interaction is message-based, the agent can send messages to a local process, a plugin process on the same machine, or a remote/satellite agent without changing the shape of the call. The article calls this network transparency.

That means formae's actor choice is not merely "Go concurrency style." It is an architectural escape hatch: tests can spawn plugin operators locally without subprocess overhead, OSS deployments can run plugin processes locally, and larger deployments can move plugin processes behind satellite agents. Terraform's provider protocol also gives location-independent executable boundaries, but it is still organized around Terraform Core RPCs. formae's boundary is organized around actors in an agent topology.

## Interfaces: broad Terraform concepts vs. one resource plugin contract

Terraform's framework decomposes provider development into many concepts. The core `provider.Provider` interface in the cloned repo requires `Metadata`, `Schema`, `Configure`, `DataSources`, and `Resources`. Optional interfaces add functions, ephemeral resources, list resources, actions, state stores, config validators, meta schemas, and more. The `resource.Resource` interface requires `Metadata`, `Schema`, `Create`, `Read`, `Update`, and `Delete`, while optional interfaces add import, configuration, validation, plan modification, state moves, state upgrades, identity, and identity upgrades.

This is a very Terraform-shaped design. It reflects the fact that Terraform is not only a CRUD engine. It has data sources, functions, plan-time semantics, unknown values, import, moved blocks, state schema upgrades, provider-defined functions, and emerging concepts such as ephemeral resources and actions. The framework exposes all of that surface because provider authors sometimes need to participate in all of it.

formae's public `ResourcePlugin` is intentionally narrower:

```go
type ResourcePlugin interface {
    RateLimit() RateLimitConfig
    DiscoveryFilters() []MatchFilter
    LabelConfig() LabelConfig

    Create(ctx, req) (*CreateResult, error)
    Read(ctx, req) (*ReadResult, error)
    Update(ctx, req) (*UpdateResult, error)
    Delete(ctx, req) (*DeleteResult, error)
    Status(ctx, req) (*StatusResult, error)
    List(ctx, req) (*ListResult, error)
}
```

The repo comments say plugin identity and schema methods are handled automatically by the SDK. The internal `FullResourcePlugin` adds `Name`, `Version`, `Namespace`, `SupportedResources`, and `SchemaForResourceType`, but plugin authors do not implement those directly. The SDK derives identity from the manifest and schemas from the Pkl package.

That is a strong opinion: resource plugins should stay focused on remote-system operations. Schema declaration, metadata, wrapping, startup, and announcement are SDK responsibilities.

Terraform asks provider authors to model Terraform semantics directly. formae asks plugin authors to implement infrastructure operations and lets the agent/SDK attach those operations to the platform model.

## Schema: Go framework types vs. Pkl as the declarative source of truth

Schema is where the two systems diverge most sharply.

Terraform's framework expresses schemas in Go. A resource returns a `resource/schema.Schema` with `Attributes`, `Blocks`, descriptions, deprecation messages, and a `Version`. A string attribute is a Go struct with fields such as `Required`, `Optional`, `Computed`, `Sensitive`, `Validators`, `PlanModifiers`, `Default`, and `WriteOnly`. These are not incidental flags. They encode Terraform's contract with the practitioner and with state: required vs optional input, computed output, sensitive display, plan-time transformations, validation, deprecation, write-only behavior, and compatibility with specific Terraform versions.

The framework also has a rich value model. The cloned `types/basetypes/string_value.go` shows `StringValue` carrying an explicit state: known, null, or unknown. That is one of the framework's headline improvements over SDKv2. Provider code can distinguish "the user set null" from "Terraform does not know the value yet" from "this is a known string." In Terraform, that distinction is central to planning.

formae's schema source of truth is Pkl. The docs show a resource class annotated with `@formae.ResourceHint` and fields annotated with `@formae.FieldHint`. A resource type such as `SFTP::Files::File` declares an identifier JSONPath like `$.path`; fields can be mutable or `createOnly`, where changing them requires replacement. The repo README says `schema/pkl/PklProject` describes supported resource types, fields, validation rules, create-only fields, discoverability, extractability, and parent-resource mappings. At startup, `pkg/plugin/descriptors` extracts resource descriptors and JSON schemas from the Pkl package.

This makes formae's schema story more language-oriented. Pkl is not just metadata stapled onto Go structs; it is the declarative contract that the agent can evaluate, verify, extract, and use for resource discovery/reconciliation. The code in `descriptors/extract_schema.go` stages plugin dependencies, rewrites `@formae` references so plugin schemas resolve against the agent's formae schema version, generates a wrapper Pkl project, resolves dependencies, and runs an extractor to produce resource descriptors.

That dependency rewriting is a subtle but important schema-evolution mechanism. It avoids every plugin having to update its own PklProject pin in lockstep whenever the agent's base schema adds a feature. Terraform's framework handles schema evolution primarily inside provider code and protocol compatibility. formae is using a package/module schema language and an agent-controlled extraction pass to keep plugin schema interpretation aligned with the running platform.

## State and evolution

Terraform has one of the hardest schema-evolution problems in infrastructure software: it must preserve user state across provider upgrades, Terraform upgrades, schema changes, moved resources, imports, and drift refreshes. The framework exposes that reality directly.

A Terraform resource schema has a `Version`. The `ResourceWithUpgradeState` interface lets a resource return a map from prior state versions to `StateUpgrader` implementations. The comments are explicit: Terraform does not store previous schema information, so breaking changes to state data types must be handled by providers. There is also `ResourceWithMoveState` for moved configuration blocks that change resource type, and identity schema/identity upgrade interfaces for newer resource identity support.

That is a powerful but demanding model. Terraform gives provider authors tools to precisely control state compatibility, but provider authors must think in Terraform state terms.

formae's schema evolution story appears more centralized. The article's title foregrounds schema evolution, and the repo shows mechanisms that make this plausible: schemas are Pkl packages, the SDK extracts descriptors at startup, the manifest declares `minFormaeVersion`, and the extractor rewrites plugin dependencies against the agent's formae schema. The docs also emphasize `FieldHint` semantics like `createOnly`, identifier extraction, discoverability, extractability, and parent-child resource relationships. These are schema-level concepts the agent can reason about before or around plugin calls.

The trade-off is maturity vs. centralization. Terraform has years of battle-tested state migration machinery exposed through framework interfaces. formae can make schema evolution feel more like updating a declarative package interpreted by the agent, but that also means its evolution guarantees depend on how consistently the agent, Pkl schema library, descriptor extraction, and plugins are versioned together.

## Planning and reconciliation

Terraform is famous for planning. Its plugin framework is built around Terraform Core's plan/apply model. Provider authors can validate configuration, modify plans, mark replacement requirements, preserve unknowns, and upgrade state. The framework's `ResourceWithModifyPlan` comments show the constraints: config values must be preserved, known planned values cannot later be changed inconsistently, unknown values may remain unknown or be filled with appropriate values, and errors prevent further plan modification.

In other words, Terraform's provider framework gives plugins a seat at the planning table, but Terraform Core owns the table.

formae, by contrast, appears to center the agent's reconciliation loop. The article summary says the formae agent schedules, queues, and reconciles work. The plugin docs say the agent discovers installed plugins, spawns them, routes operations, and enforces rate limits. The conformance test suite validates create, read, update, replace, destroy, extract, discover, forced sync, and out-of-band deletion. That is not just CRUD testing; it is lifecycle testing through the agent and CLI.

This is an important distinction for platform teams:

- Terraform's unit of work is a plan/apply transaction against state.
- formae's unit of work is closer to an agent-managed operation and inventory reconciliation loop.

Terraform practitioners expect a plan to explain what will happen before apply. formae users may expect the agent to continuously know what exists, discover unmanaged resources, detect drift, queue long-running operations, and reconcile desired state with inventory.

Neither model is universally superior. Terraform's plan is still the gold standard for human-reviewed infrastructure change. Agent reconciliation is attractive when infrastructure systems have asynchronous operations, rate limits, discovery needs, and drift behavior that do not fit cleanly into a single human-approved transaction.

## Async operations and rate limits

Terraform providers can of course wait for cloud operations, retry, and poll. But the framework's public resource interface still reads as synchronous CRUD from Terraform Core's perspective: `Create`, `Read`, `Update`, and `Delete` mutate response objects and diagnostics during an RPC. Provider authors usually implement waiting inside those methods or with helper libraries.

formae bakes async progress into the public plugin interface. CRUD results embed a `ProgressResult`; long-running cloud operations return `InProgress` with a `NativeID` and tracking metadata. The agent then calls `Status` on a polling schedule until the operation reaches success or failure. The SDK also classifies recoverable errors such as throttling, network failure, service internal error, timeout, not stabilized, not found, and resource conflict.

This is one of formae's clearest advantages for cloud-provider ergonomics. Many real infrastructure APIs are not synchronous: create starts a job, update triggers stabilization, delete returns before eventual removal, discovery is paginated, and rate limits vary by namespace or service. If the platform's agent owns polling, rate limits, and retries, plugin code can be thinner and more consistent.

Terraform can model the same behavior, but the provider often owns more of the operational loop. formae pushes more of that loop into the platform.

## Discovery and inventory

Terraform has data sources and import, but it is not primarily an inventory discovery engine. Terraform state tracks resources Terraform manages; unmanaged resource discovery is usually handled by import workflows, external tools, or provider-specific data sources.

formae makes discovery part of the plugin contract. `List` is a required method. `DiscoveryFilters` and `LabelConfig` are part of the public interface. The Pkl schema can mark resource types as discoverable and extractable. The conformance tests create resources out-of-band, register targets, trigger discovery scans, and assert that resources appear on an `$unmanaged` stack.

That makes formae more natural for platform teams that want to answer, "What already exists? What can we bring under management? What drifted?" Terraform can answer those questions in pieces, but its core mental model begins with declared configuration and state. formae's model seems to put inventory and discovery closer to the center.

## Testing philosophy

Terraform's framework ecosystem emphasizes unit tests, acceptance tests, migration tests, and provider behavior compatibility. The migration guide recommends test-driven development when moving from SDKv2 to the framework, especially because user Terraform configuration should usually not change during migration.

formae's conformance tests are more platform-integrated. The plugin scaffold wires in tests that run through the real formae CLI and agent. The suite validates not only CRUD but extract, discover, forced sync idempotency, replacement behavior, destroy, and out-of-band deletion. That is a different testing posture: not "does this provider method behave?" but "does this plugin behave correctly inside the platform's lifecycle?"

For a young ecosystem, that is a smart move. A conformance suite can encode platform expectations before dozens of plugins drift into subtly incompatible interpretations of CRUD, discovery, replacement, or progress.

## Licensing and ecosystem implications

Terraform's Plugin Framework repository is MPL-2.0 and belongs to a large ecosystem where public providers are distributed through a registry. The framework README says it has reached general availability, follows semantic versioning, supports Terraform v0.12 and above, and recommends tagged releases.

formae's docs explicitly state a plugin policy: plugins are independent works, executed out-of-process or as remote services, communicating only through documented public interfaces; plugin developers may choose open-source or proprietary licenses; plugin licenses should not impose terms on formae components. The repo files are marked FSL-1.1-ALv2.

This is not a side issue. Plugin architecture is often license architecture. Both systems use out-of-process plugins, but formae's policy is unusually explicit about non-derivative boundaries and plugin licensing independence. Terraform's mature ecosystem has already normalized separately distributed providers; formae is documenting that boundary early.

## Developer experience: who is the plugin author?

Terraform's framework is best for developers who need to expose a system to Terraform practitioners. They must understand Terraform configuration, planning, state, unknown values, import, schema migrations, and acceptance testing. The reward is access to Terraform's ecosystem and a highly recognizable workflow.

formae's SDK seems designed for platform engineers who need to add a resource type to an agent-driven infrastructure platform. They implement operations against a target API, describe resources in Pkl, and rely on the SDK/agent for startup, schema extraction, registration, rate limiting, progress polling, discovery, and conformance testing.

That makes formae potentially easier for internal platform teams, especially when the target system is not a traditional Terraform provider candidate. But it also means a formae plugin is useful inside formae's operational model, not as a general-purpose Terraform provider. Terraform has broader ecosystem reach. formae can be more opinionated because it does not need to support every Terraform use case.

## Where Terraform is stronger

Terraform's Plugin Framework is stronger when compatibility, ecosystem reach, and plan/state semantics dominate.

1. **Ecosystem maturity.** Terraform has a huge provider ecosystem, registry distribution, mature protocol compatibility, and years of provider edge cases.
2. **Plan semantics.** Terraform's plan/apply model and unknown/null value handling are deeply developed.
3. **State migration machinery.** Resource schema versions, state upgraders, moved-state support, identity schema, and protocol compatibility give provider authors explicit tools for long-lived resources.
4. **Language integration.** Provider-defined functions, data sources, resources, actions, ephemeral resources, and other Terraform concepts integrate with HCL and Terraform Core.
5. **Incremental migration from SDKv2.** `terraform-plugin-mux` lets complex providers migrate one resource or data source at a time.

If the question is, "How do I expose an API to Terraform users with minimal surprises over many provider releases?" Terraform's framework is the obvious answer.

## Where formae is stronger

formae's Plugin SDK is stronger when agent-managed operations, discovery, and schema-as-platform-contract matter more than Terraform ecosystem reach.

1. **Async operation model.** `Status` and `ProgressResult` make long-running cloud workflows first-class.
2. **Discovery by design.** `List`, discovery filters, discoverable schemas, unmanaged inventory, and conformance tests treat discovery as core behavior.
3. **Agent-owned orchestration.** Scheduling, queuing, rate limits, plugin announcements, actor supervision, and retries sit in the platform rather than in every plugin.
4. **Pkl schema packages.** Resource schemas can be evaluated, extracted, verified, version-resolved, and used by the agent outside plugin method calls.
5. **Conformance as scaffold.** New plugins start with a lifecycle test suite that exercises real agent behavior.
6. **License boundary clarity.** The docs explicitly frame plugins as independent out-of-process works.

If the question is, "How do I add a new resource family to an agent that manages inventory, discovery, async operations, and reconciliation?" formae's SDK is the more targeted design.

## The deeper design lesson

The Terraform Plugin Framework and formae Plugin SDK both demonstrate a move away from ad hoc plugins toward strongly mediated extension systems.

Terraform learned that provider authors need safer abstractions over a complex protocol. The framework gives them interfaces, typed values, schemas, validators, plan modifiers, state upgraders, and server adapters. It abstracts repetitive protocol machinery while still exposing Terraform's semantics.

formae appears to be starting from a different lesson: infrastructure plugins are not only API adapters; they are participants in an agent's operational system. The SDK hides identity/schema wrapping, extracts Pkl descriptors, announces capabilities through actors, standardizes progress and retry behavior, and tests plugins through real platform lifecycle operations.

One design is protocol-centered. The other is agent-centered.

That distinction will matter more as infrastructure tools become more autonomous. A plugin framework for a human-reviewed plan/apply tool must be conservative about state and compatibility. A plugin SDK for an agentic infrastructure platform must be conservative about scheduling, rate limits, reconciliation, discovery, and restart-safe operation. The same cloud API might need both kinds of adapters.

## A practical recommendation

For most teams, this is not an either/or decision.

Use Terraform Plugin Framework when:

- your users already manage the system with Terraform;
- plan output and state compatibility are non-negotiable;
- you need Terraform Registry distribution;
- provider-defined data sources, functions, imports, or state migrations are central;
- you need broad compatibility with Terraform workflows.

Use formae Plugin SDK when:

- you are extending formae itself;
- resource discovery and inventory matter as much as desired-state application;
- operations are long-running, rate-limited, or need platform-level polling;
- Pkl schemas are part of your platform contract;
- you want plugin authors to implement remote-system operations while the agent owns orchestration.

The exciting possibility is not that formae replaces Terraform or that Terraform absorbs formae's model. It is that infrastructure plugin architecture is splitting into two useful categories:

1. **Protocol plugins** for ecosystem-compatible declarative tools.
2. **Agent plugins** for autonomous reconciliation platforms.

Terraform's Plugin Framework is one of the best examples of the first category. formae's Plugin SDK is an early, concrete example of the second.

The article on formae's plugin SDK is worth reading through that lens. Its references to Go plugins, actors, and schema evolution are not implementation trivia. The Go plugin history explains why the process boundary exists; the Ergo primer explains why that boundary can be actor-shaped rather than just RPC-shaped; the Pkl schema machinery explains how the agent can keep reasoning about resource types outside the plugin's Go code. Together they point to a different center of gravity: an infrastructure platform where plugins are supervised workers in an agent's resource graph, not only RPC endpoints for a plan/apply engine.

That difference is exactly why the comparison is useful.
