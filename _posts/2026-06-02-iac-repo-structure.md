---
layout: post
title: Infrastructure as Code Needs Software Engineering, Not More Config Tooling
summary: 'A critique of Terragrunt-style IaC repo fixes and a case for treating
  cloud infrastructure as real software, with reusable libraries, tests, package
  managers, and architecture patterns.'
tags:
- infrastructure-as-code
- iac
- terraform
- opentofu
- terragrunt
- aws-cdk
- software-engineering
- cloud-architecture
source_folder: sources/iac-repo-structure
sources:
- title: 'Gruntwork Guides: Your Infrastructure Repo Is a Mess (Here''s How to Fix
    It)'
  url: https://www.gruntwork.io/blog/gruntwork-guides-your-infrastructure-repo-is-a-mess-heres-how-to-fix-it
  note: Seed source for the Terragrunt live-repository structure, failure modes, and
    repo hygiene principles this draft critiques and builds on.
- title: AWS CDK Constructs
  url: https://docs.aws.amazon.com/cdk/v2/guide/constructs.html
  note: AWS CDK documentation defining L1, L2, and L3 constructs, construct composition,
    package distribution, and reusable infrastructure libraries.
- title: Layer 3 constructs
  url: https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-cdk-layers/layer-3.html
  note: AWS Prescriptive Guidance explaining L3 constructs as reusable patterns for
    resource interactions, extensions, and custom resources.
- title: AWS Solutions Constructs
  url: https://docs.aws.amazon.com/solutions/latest/constructs/welcome.html
  note: AWS documentation for multi-service, well-architected CDK patterns published
    as normal language libraries.
- title: Understanding serverless architectures
  url: https://docs.aws.amazon.com/whitepapers/latest/optimizing-enterprise-economics-with-serverless/understanding-serverless-architectures.html
  note: AWS whitepaper describing managed services and serverless as a way to focus
    on application logic while cloud providers handle infrastructure management.
- title: Messaging Patterns Overview
  url: https://www.enterpriseintegrationpatterns.com/patterns/messaging/
  note: Enterprise Integration Patterns catalog used to frame cloud resources such
    as queues, topics, routers, and consumers as software architecture patterns.
- title: Developing and publishing modules
  url: https://go.dev/doc/modules/developing
  note: Go documentation showing how a mainstream language toolchain supports packages,
    modules, versioning, discovery, and publishing.
- title: How to Write Go Code
  url: https://go.dev/doc/code
  note: Go documentation on organizing code into packages and modules, and using the
    go tool to build, install, and test commands and libraries.
- title: testing package
  url: https://pkg.go.dev/testing
  note: Go standard testing package documentation, used as an example of integrated
    test tooling around code.
- title: Providers Within Modules
  url: https://developer.hashicorp.com/terraform/language/modules/develop/providers
  note: Terraform module/provider documentation illustrating the special global nature
    of provider configuration and the limits of module composition.
- title: TerraConstructs — IaC Library for CDKTF L2 Constructs
  url: https://terraconstructs.dev/
  note: TerraConstructs positioning as AWS CDK-style L2 constructs for CDKTF that
    synthesize to Terraform/OpenTofu, bridging CDK developer experience with Terraform
    operations.
- title: Constructs - CDK for Terraform
  url: https://developer.hashicorp.com/terraform/cdktf/concepts/constructs
  note: HashiCorp CDKTF docs describing constructs as a superset of Terraform modules,
    with strict typing, validation, methods, testing, and architectural-pattern APIs.
- title: TerraConstructs/base GitHub repository
  url: https://github.com/TerraConstructs/base
  note: Repository source for TerraConstructs, including object-oriented constructs,
    Terraform/OpenTofu integration, TypeScript tooling, Projen, pnpm, and Terratest-based
    integration testing.
- title: CDK Terrain — Open-Source CDK for Terraform & OpenTofu
  url: https://cdktn.io
  note: Primary source for CDK Terrain as a 100% open-source, community-driven fork
    and continuation of CDKTF that targets both Terraform and OpenTofu under the
    Open Constructs Foundation.
- title: CDK Terrain Documentation
  url: https://cdktn.io/docs
  note: Documents CDKTN's supported languages, Terraform/OpenTofu compatibility,
    provider ecosystem access, testing, dependency management, abstractions, and
    reusable code patterns.
- title: HCL Interoperability - CDK Terrain
  url: https://cdktn.io/docs/concepts/hcl-interoperability
  note: Explains that CDKTN can synthesize Terraform JSON or HCL, consume existing
    Terraform providers and modules, and generate modules that HCL projects can use.
- title: Unit Tests - CDK Terrain
  url: https://cdktn.io/docs/test/unit-tests
  note: Shows CDKTN testing helpers for synthesizing stacks/scopes and asserting on
    generated HCL-JSON, including snapshot tests and framework-specific setup.
- title: open-constructs/cdk-terrain GitHub repository
  url: https://github.com/open-constructs/cdk-terrain
  note: Repository for CDK Terrain, showing active community development, packages,
    releases, contributors, supported languages, migration guidance, and MPL-2.0
    licensing.
- title: CDK Terrain FAQ
  url: https://github.com/open-constructs/cdk-terrain/blob/main/FAQ.md
  note: FAQ describing CDK Terrain as the community-driven continuation of CDKTF,
    preserving original codebase and commit history under Open Construct Foundation
    stewardship, with both Terraform and OpenTofu support.
- title: Upgrading to CDKTN Version 0.23
  url: https://cdktn.io/docs/release/upgrade-guide-v0-23
  note: Upgrade guide showing current CDKTN releases, package names, runtime support,
    unchanged framework/CLI APIs from v0.22, and verification steps for synthesizing
    output.
- title: The Unsustainable Subsidy
  url: https://tomtunguz.com/ai-model-inflation/
  note: Pricing analysis used to frame LLM token costs as a real economic constraint,
    not a permanently falling background cost.
- title: You're about to feel the AI money squeeze
  url: https://www.theverge.com/ai-artificial-intelligence/917380/ai-monetization-anthropic-openai-token-economics-revenue
  note: Reporting on AI monetization pressure, rate limits, feature restrictions,
    higher prices, and investor pressure after years of subsidized usage.
---

Gruntwork is right about the symptom: many Terraform and OpenTofu repositories become messy because plain HCL lacks enough structure for large systems. But Terragrunt may be the wrong kind of cure. It adds another specialized layer around a configuration language when the deeper problem is that cloud infrastructure is increasingly software architecture — and should be organized with ordinary, portable, well-understood software engineering tools.

A messy infrastructure repository is not just an aesthetic problem. It is an operational risk.

Gruntwork's guide, **["Your Infrastructure Repo Is a Mess — Here's How to Fix It"](https://www.gruntwork.io/blog/gruntwork-guides-your-infrastructure-repo-is-a-mess-heres-how-to-fix-it)**, is useful because it names real failure modes: copy-pasted environments, mega-modules, unclear ownership, state files with too much blast radius, and deployment paths that depend on tribal knowledge.

But the guide also exposes a deeper problem.

Terragrunt is correct that plain Terraform and OpenTofu are under-tooled for large infrastructure systems. The question is whether the answer should be yet another niche tool around a configuration language, or whether Infrastructure as Code should become more serious about the word **code**.

## Terragrunt diagnoses a real gap

The Gruntwork critique lands because many HCL repositories do decay in predictable ways.

A team starts with a simple Terraform file. Then it adds staging. Then production. Then another region. Then another account. Soon the same provider, backend, tag, VPC, IAM, and service settings are copied across many folders. Small differences become hard to classify. Is staging different from production on purpose, or did someone forget to copy the last change?

The opposite strategy is also painful: one giant module that deploys everything. That avoids some repetition, but it creates a module with too many inputs, slow plans, unclear ownership, and a blast radius much larger than the change being reviewed.

Terragrunt's answer is hierarchy, inheritance, generated configuration, stacks, and live-repo conventions. That can make a Terraform/OpenTofu estate more navigable.

The uncomfortable question is: why does an Infrastructure as Code ecosystem need so much external machinery to organize and reuse code?

## The suspicion: this is configuration trying to impersonate software

Terraform modules are useful, but they are not software libraries in the way Go, Python, TypeScript, or Java developers usually mean that phrase.

In mainstream software ecosystems, teams expect a rich set of ordinary capabilities:

- packages with public APIs
- dependency management
- semantic versioning
- local development against unpublished packages
- unit tests, integration tests, mocks, fixtures, and contract tests
- object composition
- dependency injection
- reusable interfaces
- override points
- monorepo tooling
- build graphs
- task runners
- generated clients
- type checking
- documentation generated from the code itself

Go is a good reference point because its toolchain is intentionally boring and widely understood. Go code is organized into packages and modules. The `go` tool knows how to fetch, build, install, and test them. The standard `testing` package supports tests, benchmarks, examples, and fuzzing. Modules can be versioned and published from ordinary repositories.

The JavaScript and TypeScript world is messier, but it has the same basic shape. npm, pnpm, yarn, Jest, Vitest, Turborepo, Nx, Lerna, and many other tools exist because organizing and shipping code at scale is a common software problem. Teams may argue over the best tool, but the category is mature.

By comparison, Terraform modules feel constrained. They can be composed, but not extended like classes or refined through normal override mechanisms. There is no first-class dependency injection model comparable to mature application frameworks. Provider configuration has special global behavior. The Terraform docs themselves emphasize that provider configurations are shared across module boundaries and defined only in the root module; reusable child modules must not contain provider blocks. That is understandable for Terraform's execution model, but it is not the same as a general software package system.

So Terragrunt's hierarchy is not just a convenience. It is a workaround for missing language and ecosystem capabilities.

## Infrastructure is no longer only operations plumbing

A common defense of simpler configuration is that infrastructure lifecycle is different from application lifecycle. The argument goes something like this: infrastructure is too dangerous, too stateful, and too operationally sensitive for the complexity of software engineering patterns.

That objection made more sense when infrastructure mostly meant racks, switches, network appliances, operating systems, and long-lived servers. It is less convincing in cloud-native systems.

Modern cloud infrastructure is often software-defined and architecture-shaped:

- queues and topics encode asynchronous workflow
- serverless functions encode business reactions to events
- API gateways encode product interfaces
- event buses encode domain integration
- managed databases encode storage and access patterns
- object stores encode data pipelines
- identity policies encode service boundaries
- software-defined networks encode reachability and segmentation

AWS's serverless guidance describes managed services as a way for the provider to handle capacity provisioning, patching, platform management, availability foundations, and other infrastructure management tasks so teams can focus more directly on business logic and application behavior. That is not classic server-rack operations. It is application architecture expressed through cloud resources.

Enterprise Integration Patterns make the same point from a different direction. Patterns such as publish-subscribe channels, point-to-point channels, request-reply, correlation identifiers, message routers, splitters, aggregators, dead-letter channels, competing consumers, and service activators are software architecture patterns. In the cloud, many of those patterns map directly onto managed infrastructure resources such as SNS, SQS, EventBridge, Lambda, API Gateway, Step Functions, and queues with dead-letter policies.

If the infrastructure resource is implementing part of the integration pattern, then the IaC describing it is not merely configuration. It is part of the software architecture.

## CDK is interesting because it treats infrastructure as libraries

AWS CDK is not automatically better than Terraform. It has its own risks: generated CloudFormation can be opaque, abstractions can hide details, and teams can write terrible code in any language.

But CDK is useful for this discussion because it has a more honest model of Infrastructure as Code.

The AWS CDK construct model has layers:

- **L1 constructs** map closely to individual CloudFormation resources.
- **L2 constructs** provide intent-based APIs with defaults, helper methods, permissions wiring, and resource integration logic.
- **L3 constructs**, also called patterns, combine multiple resources into reusable architecture-level solutions.

That layering matters. It gives teams escape hatches. If a high-level pattern is too opinionated, drop to L2. If L2 is missing or too constrained, drop to L1. If a team repeats the same architecture across products, it can publish an L3 construct as a normal library package.

AWS Solutions Constructs makes this explicit: it provides multi-service, well-architected patterns for defining repeatable infrastructure in familiar programming languages. It supports TypeScript, JavaScript, Python, and Java. Those constructs can use conditionals, loops, object-oriented techniques, normal tests, normal review, normal package distribution, and normal dependency management.

This is much closer to what software teams already know how to do.

## L2 service integrations versus L3 solution patterns

The L2/L3 distinction also gives a better vocabulary for reusable infrastructure than "module."

An L2 construct is close to a service-level abstraction. It can encode best-practice defaults and expose methods for common interactions. For example, a bucket abstraction can expose permission helpers. A queue abstraction can expose consumer wiring. A function abstraction can expose event-source bindings.

An L3 construct is closer to an architecture pattern. It might represent a static website behind CloudFront, a queue-processing worker with a dead-letter queue, an API backed by a database, or a load-balanced Fargate service. AWS Prescriptive Guidance describes L3 constructs as reusable patterns for resource interactions, resource extensions, and custom resources.

That distinction maps well to software architecture:

- L2: reusable service integration building blocks
- L3: high-level solution patterns

This is what many Terraform module libraries try to approximate, but HCL makes the abstraction boundary awkward. A module can expose variables and outputs, but it does not feel like an API with methods, behavior, dependency injection, override points, or typed composition. The result is often a giant input surface instead of a small, expressive interface.
## TerraConstructs is the sharper test case

TerraConstructs complicates the argument in a productive way. It is not simply another wrapper around HCL in the same category as Terragrunt. Its own positioning is closer to this: keep Terraform/OpenTofu as the operational substrate, but move authoring into CDKTF constructs with TypeScript, strong typing, object-oriented composition, tests, and AWS CDK-inspired L2 abstractions.

That is much closer to the direction this post is arguing for. TerraConstructs explicitly tries to bridge **AWS CDK developer experience** with **Terraform/OpenTofu operational ecosystem**. It claims to provide deterministic, type-safe L2 constructs, synthesize to pure Terraform/OpenTofu output, support existing Terraform-adjacent tooling such as tflint, infracost, and OPA, and validate constructs with unit and end-to-end tests using Terratest.

This is a better answer to the Gruntwork problem than just saying "use CDK instead." Many organizations have real Terraform assets: provider knowledge, state workflows, policy checks, CI conventions, cost tooling, drift tooling, and platform teams who understand Terraform plans. TerraConstructs says: do not throw that away, but stop pretending raw modules are enough of an abstraction system.

The CDKTF docs make the contrast direct. Constructs can represent a single resource, a group of resources, a subsystem, or a full architectural pattern. They can create, modify, enrich, and validate resources; expose methods; operate on a construct tree; use Aspects for cross-cutting concerns; and be tested like normal application code. HashiCorp's own docs describe constructs as a superset of Terraform modules.

That supports the central critique: the weakness is not Terraform's operations model. The weakness is HCL modules as the primary abstraction mechanism for increasingly software-shaped cloud systems.

The important point is not HashiCorp's late stewardship decision. The important point is that CDKTF's corporate steward let the project stagnate badly enough that the community had to decide whether the code-first Terraform path was worth saving. CDK Terrain is the stronger signal: developers looked at the same problem and chose continuation, repair, and community governance rather than giving up on the model.

CDK Terrain, at [cdktn.io](https://cdktn.io), is a community-driven fork and continuation of CDKTF hosted by the Open Constructs Foundation. Its docs describe the same core promise this article cares about: define infrastructure in familiar programming languages, synthesize Terraform-compatible configuration, and keep using Terraform or OpenTofu as the execution engine. It supports TypeScript, Python, Java, C#, and Go; can use Terraform and OpenTofu providers and modules; can interoperate with existing HCL projects; and provides testing helpers around synthesized output.

That matters because it changes the story. CDKTF was not killed by lack of need. The need is obvious: teams want the Terraform/OpenTofu ecosystem, but they also want testing, dependency management, abstractions, reusable code patterns, and real language tooling. CDK Terrain is a prime example of a community pulling together around a better future for IaC: execution-engine agnostic, open source, and aimed at preserving the software-engineering path HashiCorp neglected.

So CDK Terrain and TerraConstructs should become central examples in the article, not footnotes. They are the middle path:

- not raw HCL modules
- not Terragrunt-only hierarchy over config
- not CloudFormation-only AWS CDK
- but CDK-style constructs that synthesize to Terraform/OpenTofu

That middle path tests the whole thesis. If it works, the right critique of Terragrunt is not "custom tools are bad." It is that custom tools should move IaC toward ordinary software engineering capabilities, not deeper into bespoke configuration orchestration.

## LLMs make the abstraction problem sharper

There is a tempting counterargument: if LLMs can write Terraform for us, maybe HCL's rough edges matter less. Ask an agent for a VPC, an SQS dead-letter pattern, a Lambda integration, a Kubernetes deployment, or an IAM policy, and it can produce pages of plausible HCL in seconds.

That is useful, but it is not a substitute for architecture.

The problem with a messy IaC repository was never merely that humans type too slowly. The problem is that a large system needs stable abstractions, tests, reviewable APIs, versioned reuse, ownership boundaries, and a way to express intent without duplicating implementation detail everywhere. An LLM that generates another thousand lines of HCL can make the repository larger faster. It does not automatically make the design better.

Token economics make this more important, not less. Recent AI-market reporting and pricing analysis point in the same direction: the heavily subsidized era of abundant cheap inference is under pressure from rate limits, enterprise metering, feature restrictions, price changes, investor expectations, and margin discipline. Even if model quality keeps rising, teams should not design their infrastructure workflow around repeatedly regenerating and re-reviewing low-level configuration forever.

The better use of LLMs is at a higher level of intent. Let the model help design or call a tested construct: "give this service an event-driven ingestion path with a dead-letter queue, least-privilege permissions, alarms, and cost tags." Then the durable artifact should be a software library with tests, defaults, override points, and a public API — not a one-off blob of HCL that must be audited from scratch every time.

This is another reason proper software engineering matters in IaC. Good constructs amortize thinking. They reduce repeated token spend. They reduce repeated human review. They give agents something safer to compose. And they keep the important decisions in versioned, tested code instead of scattering them across generated configuration.

## The critique of "yet another tool"

Terragrunt may still be the right pragmatic choice for teams already invested in Terraform/OpenTofu. If the organization has years of modules, policies, state, providers, and operational workflows, then Terragrunt's conventions can impose much-needed structure without replacing the whole stack.

But we should be clear-eyed about what kind of solution it is.

Terragrunt is niche tooling for a niche configuration ecosystem. It teaches teams more Terragrunt-specific concepts: `terragrunt.hcl`, hierarchical includes, dependency blocks, generated files, stacks, live repo conventions, and wrapper-driven workflows. Those concepts can be effective, but they do not transfer as widely as ordinary software engineering practices.

TerraConstructs is different enough that it should be judged separately. It is still custom IaC tooling, but its abstractions are closer to transferable software concepts: typed classes, construct trees, package-managed libraries, tests, methods, composition, and cross-cutting aspects. That does not automatically make it safe or durable, but it makes it a more serious answer to the "Infrastructure as Code" promise than another layer of HCL orchestration.

A Go package, a Python library, or a TypeScript construct library teaches patterns that apply beyond one IaC tool. Package boundaries, tests, mocks, dependency injection, semantic versioning, monorepo build graphs, and API design are not infrastructure-specific. They are how software teams already manage complexity.

If Infrastructure as Code is supposed to be code, then the default should not be: write config, discover it cannot scale, then add another config wrapper.

The default should be: use mature software engineering tools to model infrastructure as part of the application architecture.

## The better framing

The point is not to say "Terragrunt is bad." That would be too easy and not quite fair.

A better position is:

1. Gruntwork is right about the failure modes of messy IaC repositories.
2. Terragrunt is a pragmatic response to Terraform/OpenTofu's missing repo, reuse, inheritance, and orchestration capabilities.
3. But Terragrunt also demonstrates the limits of treating IaC as configuration first and code second.
4. Cloud infrastructure increasingly encodes software architecture patterns, especially in serverless and managed-service systems.
5. Therefore, the long-term direction should be boring, transferable software engineering: packages, tests, types, dependency management, composition, dependency injection, and reusable architecture libraries.

The strongest version of the argument is not anti-Terragrunt. It is anti-accidental-specialization.

When the problem is software complexity, the solution should look more like software engineering than another bespoke layer of configuration semantics.
