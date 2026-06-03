# Source notes: Terraform Plugin Framework vs. formae's Plugin SDK

Draft: `_drafts/terraform-plugin-framework-vs-formae-plugin-sdk.md`

## Local exploration

- Terraform Plugin Framework repository cloned to: `/data/repos/terraform-plugin-framework`
  - Remote: `https://github.com/hashicorp/terraform-plugin-framework.git`
  - Inspected commit: `350c6321`
- formae repository also cloned for primary-source comparison: `/data/repos/formae`
  - Remote: `https://github.com/platform-engineering-labs/formae.git`
  - Inspected commit: `85860ed`

## Gist download and extraction

The user provided an accessible gist copy of the Platform Engineering material:

- Gist: `https://gist.github.com/so0k/9ce450e534eed34d892dc48da277a5c5`
- Zip downloaded to: `/data/gists/platform-engineering-formae/so0k-9ce450e534eed34d892dc48da277a5c5.zip`
- Extracted directory: `/data/gists/platform-engineering-formae/extracted/9ce450e534eed34d892dc48da277a5c5-main/`
- Files:
  - `gistfile1.txt` — copied text for "Go plugins, actors, and schema evolution: inside formae's plugin SDK".
  - `gistfile2.txt` — copied text for "Unlocking Concurrency in Go: A Practical Guide to the Actor Model with Ergo".

## Extraction caveat resolved

Earlier, `web_extract` could not scrape the Platform Engineering blog article because the page returned an anti-bot / Cloudflare-style verification response. The provided gist now gives accessible text for the formae plugin SDK article and the related Ergo actor primer. The draft has been updated to use the gist text for the Go-native-plugin history, the Ergo actor/network-transparency explanation, and the AI-agent/conformance-harness motivation. Detailed code-level claims still remain grounded in formae docs plus the cloned formae repository.

## Terraform primary-source observations

### README

Path: `/data/repos/terraform-plugin-framework/README.md`

Key points:

- `terraform-plugin-framework` is a Go module for building Terraform providers.
- It is built on `terraform-plugin-go`.
- It aims to expose the power/predictability/versatility of `terraform-plugin-go` while abstracting repetitive implementation details.
- Status: General Availability.
- Follows semantic versioning for Go and Terraform compatibility promises.
- Compatible with Terraform v0.12 and above.
- Current Go requirement in README: Go 1.25 or later.

### Provider interface

Path: `/data/repos/terraform-plugin-framework/provider/provider.go`

Core `Provider` interface:

- `Metadata`
- `Schema`
- `Configure`
- `DataSources`
- `Resources`

Optional provider concepts inspected:

- config validators
- provider-defined functions
- ephemeral resources
- meta schema
- list resources
- actions
- state stores
- imperative validation

Interpretation: Terraform provider surface is broad because the framework models many Terraform language/runtime concepts, not just CRUD.

### Resource interface

Path: `/data/repos/terraform-plugin-framework/resource/resource.go`

Core `Resource` interface:

- `Metadata`
- `Schema`
- `Create`
- `Read`
- `Update`
- `Delete`

Optional resource concepts inspected:

- `ResourceWithConfigure`
- `ResourceWithConfigValidators`
- `ResourceWithImportState`
- `ResourceWithModifyPlan`
- `ResourceWithMoveState`
- `ResourceWithUpgradeState`
- `ResourceWithValidateConfig`
- `ResourceWithIdentity`
- `ResourceWithUpgradeIdentity`

Notable comments:

- `ModifyPlan` is called during plan and apply and has strict constraints around preserving config values and known plan values.
- `UpgradeState` is required because Terraform does not store previous schema information; breaking state data changes must be handled by providers.

### Provider server / protocol adaptation

Path: `/data/repos/terraform-plugin-framework/providerserver/providerserver.go`

Key points:

- `NewProtocol5` and `NewProtocol6` adapt a framework provider to protocol v5/v6 provider servers.
- `Serve` chooses tf5server or tf6server depending on `ServeOpts.ProtocolVersion`.
- Confirms Terraform Framework is protocol-first and delegates to `terraform-plugin-go` protocol server implementations.

### Schema and typed values

Paths:

- `/data/repos/terraform-plugin-framework/resource/schema/schema.go`
- `/data/repos/terraform-plugin-framework/resource/schema/string_attribute.go`
- `/data/repos/terraform-plugin-framework/types/basetypes/string_value.go`

Observed:

- Resource schema contains `Attributes`, `Blocks`, descriptions, deprecation messages, and `Version` for state upgrades.
- String attributes include `Required`, `Optional`, `Computed`, `Sensitive`, validators, plan modifiers, defaults, deprecation, custom types, and write-only support.
- `StringValue` explicitly tracks known/null/unknown state via `attr.ValueState` and methods `IsNull`, `IsUnknown`, and `ValueString`.

Interpretation: Terraform's framework encodes plan/state semantics in Go types and values.

## Terraform documentation observations

Sources extracted:

- `https://developer.hashicorp.com/terraform/plugin/framework`
- `https://developer.hashicorp.com/terraform/plugin/framework-benefits`
- `https://developer.hashicorp.com/terraform/plugin/framework/migrating`
- `https://developer.hashicorp.com/terraform/plugin/terraform-plugin-protocol`

Key points:

- HashiCorp recommends the Plugin Framework for new provider development on protocol v5/v6.
- Framework is recommended over SDKv2 for clearer abstractions, modern Go interfaces, better data access, null/unknown handling, and explicit control over behaviors.
- Plugin Protocol is a versioned interface between Terraform CLI and plugins, implemented with protobuf and gRPC.
- Protocol major versions define CLI/plugin compatibility boundaries; minor versions are additive.
- Migration from SDKv2 can be single-cycle for small providers or incremental via `terraform-plugin-mux` for complex providers.

## formae primary-source observations


### Provided gist article observations

Path: `/data/gists/platform-engineering-formae/extracted/9ce450e534eed34d892dc48da277a5c5-main/gistfile1.txt`

Key points from "Go plugins, actors, and schema evolution: inside formae's plugin SDK":

- The formae agent knows how to schedule, queue, order, rate-limit, execute, and retry plugin operations; resource plugins own actual API interaction.
- The public `ResourcePlugin` interface is intentionally tiny: CRUD, `Status`, `List`, and configuration knobs.
- The interface is intentionally small partly because AI coding agents write much of the plugin code; reliable generated plugins depend on a small surface, conformance harness, and LLM-oriented documentation.
- First iteration used Go's native `plugin` package and loaded compiled shared objects in-process.
- Native Go plugins require near-perfect lockstep: exact Go version, exact shared package versions, and exact build flags across host and plugin.
- Transitive dependency conflicts from many wrapped SDKs made native Go plugins a dead end for a public SDK.
- Second iteration lifted the plugin operator into a separate OS process running its own Ergo node.
- The process is persistent, not one process per invocation.
- Moving out-of-process removed shared-linking dependency hell and decoupled licensing.
- Ergo network transparency lets the agent interact with PluginOperator processes the same way whether local in tests, local subprocess in OSS deployment, or remote via satellite agents.

### Provided Ergo primer observations

Path: `/data/gists/platform-engineering-formae/extracted/9ce450e534eed34d892dc48da277a5c5-main/gistfile2.txt`

Key points from "Unlocking Concurrency in Go: A Practical Guide to the Actor Model with Ergo":

- Actor model is presented as an alternative to thread/lock concurrency and Go's CSP-style goroutines/channels.
- Actors process messages, store private state, communicate by sending messages, create more actors, and can change behavior for future messages.
- Erlang is cited as the battle-tested actor runtime influence.
- Ergo brings Erlang/OTP-style actor design patterns to Go, using lightweight processes implemented on goroutines and a zero-external-dependencies philosophy.
- Ergo actors embed `act.Actor`; lifecycle hooks include `Init` and `HandleMessage`.
- Actors are addressed by PIDs; `Spawn` creates actors, `SpawnRegister` creates named actors, and `Send` delivers messages.
- An Ergo node hosts the actor runtime and can spawn registered actors and send initial messages.

### Plugin docs overview

Source: `https://docs.formae.io/en/latest/plugin-sdk/`

Key points:

- Plugins are independent works and run as separate processes or remote services.
- Plugins communicate with formae through documented public interfaces; they are not loaded/linked/executed in process.
- Plugin developers may license plugins under their own license, including proprietary licenses.
- The SDK lets developers extend formae to manage any infrastructure exposing an API.
- Plugins implement CRUD and discovery for unsupported resource types.
- The agent discovers installed plugins, spawns them, receives capabilities, routes operations, and enforces rate limits.
- Plugin authors implement resource schemas in `schema/pkl/*.pkl` and the Go `ResourcePlugin` interface.

### Plugin README

Path: `/data/repos/formae/pkg/plugin/README.md`

Key points:

- Resource plugins teach formae how to create, read, update, delete, and discover cloud/API resources.
- `formae plugin init` scaffolds from `formae-plugin-template`.
- Generated project includes SDK wiring, plugin manifest, Pkl schema package, and conformance tests.
- `ResourcePlugin` includes rate limit, discovery filters, label config, CRUD, `Status`, and `List`.
- Optional interfaces include `ObservablePlugin` and `Configurable`.
- CRUD results embed `ProgressResult`; long-running operations return `InProgress` with `NativeID` and tracking data, then agent polls `Status`.
- SDK retries recoverable error classes.
- Manifest: `formae-plugin.pkl` with name, namespace, version, license, `minFormaeVersion`.
- Schema: `schema/pkl/PklProject` describes resource types, fields, validation, create-only, discoverable/extractable, parent mappings.
- Entry point: `sdk.RunWithManifest` reads manifest, extracts Pkl schemas, wraps plugin, starts Ergo node, announces plugin.
- Constraints: plugins must be stateless across operations; `NativeID` is mandatory; properties travel as JSON; no pointer sharing across actor boundary.

### ResourcePlugin interface

Path: `/data/repos/formae/pkg/plugin/resource.go`

Core interface:

- `RateLimit`
- `DiscoveryFilters`
- `LabelConfig`
- `Create`
- `Read`
- `Update`
- `Delete`
- `Status`
- `List`

Internal `FullResourcePlugin` adds:

- `Name`
- `Version`
- `Namespace`
- `SupportedResources`
- `SchemaForResourceType`

Important comment: plugin identity and schema methods are handled automatically by SDK; plugin authors implement only the public resource contract.

### Actor transport / announcement

Path: `/data/repos/formae/pkg/plugin/actor.go`

Observed:

- `PluginActor` loads `FullResourcePlugin` from environment.
- Builds `PluginCapabilities` from `SupportedResources`, `SchemaForResourceType`, `DiscoveryFilters`, and `LabelConfig`.
- Sends `PluginAnnouncement` to `PluginCoordinator` with name, namespace, version, node name, max requests/sec, and capabilities.
- Monitors coordinator/agent node and shuts down if unavailable.

Interpretation: formae plugin lifecycle is actor/agent centered.

### SDK setup and schema extraction

Paths:

- `/data/repos/formae/pkg/plugin/sdk/run.go`
- `/data/repos/formae/pkg/plugin/descriptors/extract_schema.go`

Observed in `sdk/run.go`:

- `SetupPlugin` finds plugin directory, reads manifest, validates it, locates `schema/pkl/PklProject`, resolves formae schema path from `FORMAE_VERSION` or config, extracts schemas, wraps plugin, configures observability/configuration, and starts/announces plugin.

Observed in `extract_schema.go`:

- Extraction stages plugin dependencies and rewrites `@formae` references to the agent-supplied formae URL/path.
- Purpose: avoid type-identity mismatches and let schema additions work without every plugin's PklProject pin being updated in lockstep.
- Generates wrapper PklProject, resolves dependencies, generates imports, runs `Extractor.pkl`, parses descriptors.

Interpretation: formae's schema evolution approach is mediated through Pkl package resolution and agent-aligned schema extraction.

### Conformance tests

Path: `/data/repos/formae/pkg/plugin-conformance-tests/README.md`

Key points:

- Provider-agnostic Go test harness exercises plugins through real formae CLI and agent.
- Validates create, read, update, replace, destroy, extract, discover, and out-of-band changes.
- CRUD suite checks registration, apply, inventory, extract round-trip, forced-sync idempotency, update, replace, destroy, and out-of-band delete drift detection.
- Discovery suite creates a resource out of band, registers target, triggers scan, and expects unmanaged inventory.

Interpretation: formae bakes platform lifecycle behavior into plugin conformance.

## Revision notes

- After review, removed standalone "formae article" sections from the draft and integrated their points into the comparison: plugin boundary/history, interface size/AI-agent generation, agent-owned orchestration, conformance testing, licensing/dependency boundaries, and deployment topology.

## Comparison thesis

Terraform Plugin Framework is protocol-centered:

- Main goal: make Terraform Plugin Protocol v5/v6 provider development safer and more idiomatic.
- Strengths: maturity, plan/state semantics, null/unknown handling, state migration, registry ecosystem, mux migration from SDKv2.
- Trade-off: provider authors must understand Terraform's many concepts and own much of the provider behavior.

formae Plugin SDK is agent-centered:

- Main goal: let plugins participate in an agent-managed resource lifecycle with discovery, async operation status, rate limits, schema extraction, and reconciliation.
- Strengths: async progress as core API, discovery/inventory as first-class, Pkl schemas as platform contract, conformance tests through real agent lifecycle, actor supervision.
- Trade-off: narrower ecosystem and likely less battle-tested than Terraform; usefulness is tied to formae's operational model.

## Open gaps / follow-up checks

- If the Platform Engineering article becomes accessible, verify whether it makes claims beyond the public docs/repo: specific actor serialization details, schema evolution examples, or internal design trade-offs.
- Consider comparing a concrete Terraform provider scaffold against `formae-plugin-template` in a follow-up article.
- Consider adding code snippets from a real minimal provider/plugin once source examples are selected.
