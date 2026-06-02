# Source notes: IaC repo structure

Published post: `_posts/2026-06-02-iac-repo-structure.md`

## Primary sources

### Gruntwork Guides: Your Infrastructure Repo Is a Mess (Here's How to Fix It)

---
title: "Gruntwork Guides: Your Infrastructure Repo Is a Mess (Here's How to Fix It)"
url: "https://www.gruntwork.io/blog/gruntwork-guides-your-infrastructure-repo-is-a-mess-heres-how-to-fix-it"
author: "Brian Torres"
accessed: "2026-06-02"
topic: "iac-repo-structure"
---

- URL: https://www.gruntwork.io/blog/gruntwork-guides-your-infrastructure-repo-is-a-mess-heres-how-to-fix-it
- Author: Brian Torres, DevOps Solutions Engineer at Gruntwork
- Published: May 19, 2026
- Scope: Terragrunt live infrastructure repository structure for OpenTofu or Terraform.

#### Why this source matters

This is the seed source requested for the draft. It gives a concrete repo-structure argument for Infrastructure as Code: messy repositories fail through duplication, overly large modules, unclear ownership, risky change boundaries, and hidden deployment knowledge.

#### Key points

- Infrastructure repositories often decay when teams add more environments, accounts, regions, and copied folders without a stronger structure.
- Copy-paste environments produce drift because the same configuration must be kept in sync manually across many locations.
- Mega-modules reduce copy-paste but create a large blast radius, slow plans, too many inputs, and unclear ownership.
- Tribal knowledge is a reproducibility failure: if infrastructure only works because a few people know hidden steps, the code is not sufficient.
- A good infrastructure repository should make resource location, shared configuration, dependencies, and deployment paths obvious.
- Gruntwork recommends a Terragrunt hierarchy that mirrors cloud topology: account → region → resource/service.
- Inheritance and stacks can reduce duplication while preserving environment-specific overrides.
- State layout should be treated as a blast-radius decision.
- CI/CD-only deploy paths help remove hidden manual behavior and make plans/applies reproducible.

#### Caveats

- The guide is specifically about Terragrunt patterns for OpenTofu/Terraform live repos.
- Several recommendations rely on Terragrunt features: hierarchical configuration, inherited settings, generated provider/backend files, and stacks.
- The draft now uses this source as a foil: Terragrunt diagnoses real Terraform/OpenTofu limitations, but may also be another specialized wrapper around configuration rather than a general software engineering solution.

## Software engineering ecosystem references

### Developing and publishing Go modules

- URL: https://go.dev/doc/modules/developing
- Accessed: 2026-06-02
- Core use: Go modules show a mainstream, boring model for organizing related packages, publishing them from normal repositories, versioning them with semantic versioning, and letting tools fetch and use them.
- Blog use: contrast normal software package systems with Terraform modules.

### How to Write Go Code

- URL: https://go.dev/doc/code
- Accessed: 2026-06-02
- Core use: Go code is organized into packages and modules. The `go` tool supports building, installing, and testing packages and commands.
- Blog use: supports the claim that mainstream languages have integrated workflows for libraries, binaries, and reusable code organization.

### Go testing package

- URL: https://pkg.go.dev/testing
- Accessed: 2026-06-02
- Core use: Go's `testing` package and `go test` support tests, benchmarks, examples, fuzzing, package-internal tests, and black-box tests.
- Blog use: example of an integrated test model around code, compared with infrastructure configuration where testing often requires external conventions.

## Terraform/OpenTofu module limitation references

### Providers Within Modules

- URL: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Accessed: 2026-06-02
- Core use: Terraform provider configurations are global to a configuration, shared across module boundaries, and defined only in the root module. Reusable modules must not contain provider blocks. Provider inheritance and explicit provider passing are special Terraform mechanisms.
- Blog use: illustrates that Terraform modules do not behave like ordinary software packages with normal dependency injection and encapsulation.

## Cloud architecture / managed service references

### Understanding serverless architectures

- URL: https://docs.aws.amazon.com/whitepapers/latest/optimizing-enterprise-economics-with-serverless/understanding-serverless-architectures.html
- Accessed: 2026-06-02
- Core use: AWS describes serverless as using managed services where the provider handles capacity provisioning, patching, infrastructure management, platform management, fault tolerance, and availability foundations, allowing teams to focus on business logic.
- Blog use: argues that cloud infrastructure is not only classic IT operations. In managed-service/serverless systems, infrastructure resources often encode application behavior and architecture.
- Caveat: AWS marks this whitepaper as historical reference; use it for conceptual framing, not current product details.

### Messaging Patterns Overview — Enterprise Integration Patterns

- URL: https://www.enterpriseintegrationpatterns.com/patterns/messaging/
- Accessed: 2026-06-02
- Core use: Enterprise Integration Patterns catalogs 65 messaging patterns harvested from integration projects over decades, including publish-subscribe channels, point-to-point channels, request-reply, routers, splitters, aggregators, dead-letter channels, competing consumers, and service activators.
- Blog use: connects cloud services such as queues, topics, event buses, functions, and API gateways to established software architecture patterns.

## AWS CDK references

### AWS CDK Constructs

- URL: https://docs.aws.amazon.com/cdk/v2/guide/constructs.html
- Accessed: 2026-06-02
- Core use: CDK constructs are the building blocks of CDK applications. L1 constructs map directly to CloudFormation resources, L2 constructs provide intent-based APIs with defaults and helper methods, and L3 constructs are patterns that combine resources into larger solutions. Constructs can be written, reused, distributed via package managers such as npm, Maven, and PyPI, and composed into higher-level abstractions.
- Blog use: main evidence for the idea that infrastructure can be modeled as real reusable code libraries.

### AWS Prescriptive Guidance: Layer 3 constructs

- URL: https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-cdk-layers/layer-3.html
- Accessed: 2026-06-02
- Core use: L3 constructs are reusable patterns beyond L2. Common use cases include resource interactions, resource extensions, and custom resources. Examples include multi-resource constructs such as a CloudFront website combining CloudFront, S3, WAF, Route 53, and ACM.
- Blog use: supports the L2 service integration vs L3 solution pattern framing requested for the draft.

### AWS Solutions Constructs

- URL: https://docs.aws.amazon.com/solutions/latest/constructs/welcome.html
- Accessed: 2026-06-02
- Core use: AWS Solutions Constructs is an open-source CDK extension providing multi-service, well-architected patterns for predictable and repeatable infrastructure. It supports TypeScript, JavaScript, Python, and Java, and emphasizes familiar programming languages, loops, conditionals, object-oriented techniques, testing, code review, and reusable abstractions.
- Blog use: strong source for arguing that cloud infrastructure patterns can be shipped as normal language libraries rather than config wrappers.


## TerraConstructs / CDKTF references

### TerraConstructs — IaC Library for CDKTF L2 Constructs

- URL: https://terraconstructs.dev/
- Accessed: 2026-06-02
- Core use: TerraConstructs positions itself as a library of Level 2 CDKTF constructs, initially ported from AWS CDK L2 constructs, combining AWS CDK-style developer experience with Terraform/OpenTofu operational workflows.
- Key claims: deterministic and type-safe, OpenTofu/Terraform ready, Apache 2.0 licensed, AWS CDK inspired, pure Terraform/OpenTofu output, tflint/infracost/OPA compatibility, unit and end-to-end testing, Terratest validation, construct tree, late-bound values, and Aspects for cross-cutting concerns.
- Blog use: important middle position. It weakens a simplistic “custom IaC tooling is bad” argument, because it is custom tooling pointed toward ordinary software engineering abstractions rather than more HCL orchestration.

### Constructs — CDK for Terraform

- URL: https://developer.hashicorp.com/terraform/cdktf/concepts/constructs
- Accessed: 2026-06-02
- Core use: CDKTF docs describe constructs as reusable building blocks that can represent one resource, groups of resources, subsystems, or full architectural patterns. Constructs can create, modify, enrich, and validate resources, use strict type checking and parameter validation, expose methods, operate on construct trees, and be tested like normal code.
- Important quote/frame: constructs are described as a superset of Terraform modules.
- Blog use: supports the argument that the Terraform/OpenTofu operational model is not necessarily the problem; the weak point is HCL modules as the abstraction layer.

### TerraConstructs/base GitHub repository

- URL: https://github.com/TerraConstructs/base
- Accessed: 2026-06-02
- Core use: repository for TerraConstructs. README positions TerraConstructs as object-oriented constructs inspired by AWS CDK, built with CDKTF, using Terraform/OpenTofu’s provider ecosystem and state management.
- Implementation notes: TypeScript project, pnpm, Projen, integration tests, Go/Terratest dependencies.
- Blog use: concrete evidence that the construct-based approach uses mainstream software project machinery, not only IaC-specific config files.


### CDK Terrain — Open-Source CDK for Terraform & OpenTofu

- URL: https://cdktn.io
- Accessed: 2026-06-02
- Core use: CDK Terrain positions itself as a 100% open-source, community-driven fork and continuation of CDKTF. It lets developers define infrastructure in TypeScript, Python, Java, and other languages, works with both Terraform and OpenTofu, and is hosted by the Open Constructs Foundation.
- Blog use: hard-points the article away from an end-of-project framing and toward active community continuation. The important story is not “CDKTF ended,” but “the community decided the code-first Terraform/OpenTofu model was worth preserving and improving.”
- Framing note from user: emphasize HashiCorp stewardship failure and long-running project neglect as the real story; only make specific bugs/CVEs claims where a source backs the exact claim.

### CDK Terrain Documentation

- URL: https://cdktn.io/docs
- Accessed: 2026-06-02
- Core use: CDKTN defines and provisions infrastructure using familiar programming languages instead of HCL, works with Terraform and OpenTofu, supports TypeScript, Python, Java, C#, and Go, and lets teams use existing programming toolchains for testing, dependency management, abstractions, and reusable code patterns.
- Blog use: primary support for the claim that CDK Terrain is a direct example of IaC moving toward ordinary software engineering while preserving Terraform/OpenTofu operations.

### HCL Interoperability — CDK Terrain

- URL: https://cdktn.io/docs/concepts/hcl-interoperability
- Accessed: 2026-06-02
- Core use: CDKTN translates imperative-language configuration to Terraform JSON and, from v0.20, can also generate Terraform HCL with `cdktn synth --hcl`. CDKTN applications can use existing Terraform providers and HCL modules, and can generate modules consumable by HCL Terraform projects.
- Blog use: supports the middle-path argument: teams can adopt code-first constructs without abandoning existing Terraform/OpenTofu assets.

### Unit Tests — CDK Terrain

- URL: https://cdktn.io/docs/test/unit-tests
- Accessed: 2026-06-02
- Core use: CDKTN exposes testing helpers that synthesize stacks or construct scopes and assert on generated HCL-JSON. TypeScript supports Jest assertions and snapshot testing; other languages can use normal assertion frameworks.
- Blog use: evidence for the claim that code-first IaC makes tests and feedback loops part of the authoring model, not an external afterthought.

### open-constructs/cdk-terrain GitHub repository

- URL: https://github.com/open-constructs/cdk-terrain
- Accessed: 2026-06-02
- Core use: repository for CDK Terrain, a community fork of CDKTF. The repo documents the `cdktn-cli` and `cdktn` packages, migration guidance, contribution paths, supported languages, MPL-2.0 license, releases, and ongoing development activity.
- Blog use: source for active community continuation and the project’s concrete implementation footprint.

### CDK Terrain FAQ

- URL: https://github.com/open-constructs/cdk-terrain/blob/main/FAQ.md
- Accessed: 2026-06-02
- Core use: describes CDK Terrain as a community-driven continuation/fork of CDKTF, created with HashiCorp's blessing, preserving original codebase and commit history, and moving stewardship to the Open Construct Foundation.
- Blog use: supports the argument that the interesting fact is community continuation and governance, not a dead-end project narrative. Also supports Terraform/OpenTofu execution-engine agnosticism and drop-in migration intent.

### Upgrading to CDKTN Version 0.23

- URL: https://cdktn.io/docs/release/upgrade-guide-v0-23
- Accessed: 2026-06-02
- Core use: current upgrade guide for CDKTN v0.23.2 showing live release activity, package names (`cdktn`, `cdktn-cli`, `@cdktn/provider-*`), runtime support, and verification via `cdktn synth`.
- Blog use: evidence that CDK Terrain is active software with current releases and migration paths, not merely a static fork announcement.

## LLM and token-economics references

### The Unsustainable Subsidy — Tomasz Tunguz

- URL: https://tomtunguz.com/ai-model-inflation/
- Accessed: 2026-06-02
- Core use: tracks divergent AI pricing strategies and argues that pricing changes reflect a shift from share-gaining subsidy behavior toward margin discipline as capex remains high.
- Blog use: supports the article’s claim that teams should not assume token costs will monotonically fall or remain subsidized enough to make endless low-level IaC generation free.

### You’re about to feel the AI money squeeze — The Verge

- URL: https://www.theverge.com/ai-artificial-intelligence/917380/ai-monetization-anthropic-openai-token-economics-revenue
- Accessed: 2026-06-02
- Core use: reporting on AI monetization pressure: rate limits, feature restrictions, price hikes, enterprise pricing changes, investor pressure, and the end of cheap/free access patterns.
- Blog use: frames LLM-generated HCL as economically non-free. Reusable intent-focused constructs reduce repeated generation, repeated token spend, and repeated human review.

## Additional source targets still needed

- CDK Day presentation material specifically discussing L2 service integration patterns and L3 high-level solution patterns.
- A concrete AWS fan-out / queue-processing / request-reply pattern source with CDK code.
- A concrete TerraConstructs queue/topic/Lambda example to compare against HCL modules and Terragrunt.
- A plain Terraform/OpenTofu source on module design limitations and testing practices.
- A neutral critique of CDK risks: generated-template opacity, abstraction leakage, and imperative-code footguns.

## Revised draft thesis

Gruntwork is right about Terraform/OpenTofu repo failure modes, but Terragrunt is best understood as a pragmatic workaround for missing software-engineering capabilities in HCL. As cloud infrastructure moves toward managed services, serverless, software-defined networking, and service integration patterns, infrastructure resources increasingly encode application architecture. The stronger long-term answer is not more bespoke config orchestration, but transferable software engineering practices: packages, tests, types, dependency management, composition, dependency injection, and reusable architecture libraries. CDK Terrain is now the key middle-path example: an active community continuation of CDKTF that moves toward code-first constructs while preserving Terraform/OpenTofu output. The LLM angle strengthens the same thesis: agents can generate lots of HCL, but reusable intent-focused constructs are cheaper to review, safer to compose, and less dependent on subsidized token economics.
