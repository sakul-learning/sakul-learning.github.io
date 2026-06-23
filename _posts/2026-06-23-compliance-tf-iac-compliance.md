---
layout: post
title: "compliance.tf is what happens when Terraform modules become the platform"
date: 2026-06-23 00:00:00 +0000
categories: infrastructure compliance terraform cdk
source: sources/compliance-tf-iac-compliance/README.md
---

compliance.tf is interesting because it is solving a real pain in the most Terraform way possible: by putting another layer of indirection in front of the module registry.

The pitch is simple. Keep using the public Terraform modules you already know, but change the source address:

```hcl
module "bucket" {
  source  = "cis.compliance.tf/terraform-aws-modules/s3-bucket/aws"
  version = "5.14.0"
}
```

Instead of pulling `terraform-aws-modules/s3-bucket/aws` directly, Terraform asks `cis.compliance.tf` for the module. The hostname becomes the compliance selector. `cis.compliance.tf` means CIS. `soc2.compliance.tf` means SOC 2. `hipaa.compliance.tf` means HIPAA. `pci-dss.compliance.tf` means PCI DSS.

That is clever. It is also a smell.

The module source address is supposed to identify a package. In this model, it also selects the compliance framework, transformed defaults, enforced inputs, and policy behavior. The registry has become the extension point Terraform modules never had.

This is the important distinction: compliance.tf may be tactically useful, but the need for it is not proof that compliant infrastructure requires a specialized registry service. It is proof that broad Terraform modules make weak platform abstractions.

## What the free CIS sample actually shows

The public CIS registry is enough to see the shape of the product. No token was needed for this research.

The CIS v6.0.0 page lists 79 controls across 6 AWS module areas, including CloudTrail, EBS encryption, EC2 IMDSv2, AWS Config, IAM password policy, KMS rotation, RDS encryption, and S3 controls.

For the S3 module, the public page for `terraform-aws-modules/s3-bucket/aws` lists two controls:

- `s3_bucket_mfa_delete_enabled`
- `s3_bucket_versioning_enabled`

The diff page is the useful bit. For the inspected version, compliance.tf shows the CIS variant changing the default for `versioning` from an empty object to an object that enables MFA delete:

```text
versioning: {} -> { "mfa_delete": "Enabled" }
```

The inputs page then shows the other half of the story:

```text
1 enforced input
72 optional inputs
```

That is the whole argument in miniature.

The service can change or lock down a specific input. That may help. But the caller is still interacting with the same broad module interface. The public CIS S3 sample still exposes dozens of optional inputs because the underlying abstraction is still a general-purpose Terraform module.

This is not a criticism of the engineering effort behind compliance.tf. It is a criticism of the layer where the policy is being applied.

A platform team should not have to impersonate a Terraform registry to express "this is our regulated S3 bucket." That should be a normal library contract.

## Terraform modules are parameters, not platform contracts

Terraform modules are useful. They package resources. They reduce copy-paste. They give teams a shared starting point.

But a module is mostly a bundle of HCL with variables and outputs. That is not the same thing as a platform abstraction.

A real platform abstraction can say:

- this bucket stores regulated data;
- this workload is internet-facing but must not expose SSH;
- these permissions are allowed, but wildcard permissions need a reviewed exception;
- this construct must use the central logging bucket;
- this exception expires after 30 days;
- this resource can be integrated through approved grant methods, not arbitrary IAM JSON.

Terraform modules can approximate parts of that with variables, validation blocks, wrappers, policy checks, scanners, and CI. The ecosystem has spent years building those compensating tools.

That is the pile compliance.tf joins: scanners, wrappers, golden modules, internal registries, policy engines, pre-commit hooks, HCL generators, and forks of public modules.

Some of those tools are useful. The pile itself is the warning sign.

## The bad version of S3 hardening

Basic S3 hardening should be boring:

- block public access;
- enable versioning;
- enable server-side encryption;
- require TLS;
- retain production data by default;
- send logs to a central logging bucket where appropriate;
- fail early when a production bucket does not meet the baseline.

In Terraform-module land, that often becomes a long list of inputs:

```hcl
module "bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "5.14.0"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }
}
```

That is configuration. It is not much of a contract.

A caller can omit one field. A caller can copy an example from the wrong repo. A caller can set a valid combination that is invalid for your organization. A scanner can catch the mistake later. A registry can mutate the defaults. A platform team can wrap the module. A vendor can sell a compliance-transformed variant.

But the user is still manipulating the wrong abstraction.

## The boring software-engineering version

In a higher-level IaC framework, the platform team can define the thing it actually means:

```ts
import { RemovalPolicy } from "aws-cdk-lib";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  IBucket,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface RegulatedBucketProps {
  readonly logsBucket: IBucket;
  readonly dataClassification: "internal" | "regulated";
}

export class RegulatedBucket extends Bucket {
  constructor(scope: Construct, id: string, props: RegulatedBucketProps) {
    super(scope, id, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      serverAccessLogsBucket: props.logsBucket,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.node.addValidation({
      validate: () => {
        if (props.dataClassification === "regulated" && !props.logsBucket) {
          return ["Regulated buckets must send access logs to the central logging bucket."];
        }
        return [];
      },
    });
  }
}
```

Application teams then use the platform contract:

```ts
const customerData = new RegulatedBucket(this, "CustomerData", {
  dataClassification: "regulated",
  logsBucket: centralLogsBucket,
});

customerData.grantReadWrite(applicationRole);
```

This is not magic. It is just normal software engineering.

The construct has a name that matches the domain. It has typed inputs. It chooses safe defaults. It exposes approved integration methods. It can validate itself. It can be unit tested. It can evolve internally without asking every application team to understand the whole S3 API surface.

The important part is not TypeScript. You can write terrible CDK and disciplined Terraform. The important part is the contract.

The application code says "regulated bucket." It does not say "generic bucket module, but from a different registry hostname, with the right compliance subdomain, and hopefully the remaining optional inputs are not used badly."

## Validation should be attached to the model

The construct wrapper is only one mechanism. Keep it, because it is the cleanest way to express the approved path. But CDK gives you other supported hooks around it.

The first hook is an Aspect. AWS's own documentation describes Aspects as a way to validate or modify constructs across a scope. The docs even use a bucket-versioning checker as the example.

A CIS-style S3 baseline can be expressed as an Aspect without replacing every bucket with a custom class:

```ts
import { Annotations, IAspect, Tokenization } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { IConstruct } from "constructs";

export class S3BaselineAspect implements IAspect {
  public visit(node: IConstruct): void {
    if (!(node instanceof s3.CfnBucket)) {
      return;
    }

    const versioning = node.versioningConfiguration;
    if (!versioning || (!Tokenization.isResolvable(versioning) && versioning.status !== "Enabled")) {
      Annotations.of(node).addError("S3 baseline: bucket versioning must be enabled.");
    }

    if (!node.bucketEncryption) {
      Annotations.of(node).addError("S3 baseline: default bucket encryption must be enabled.");
    }

    const publicAccess = node.publicAccessBlockConfiguration;
    if (!publicAccess || !publicAccess.blockPublicAcls || !publicAccess.blockPublicPolicy ||
        !publicAccess.ignorePublicAcls || !publicAccess.restrictPublicBuckets) {
      Annotations.of(node).addError("S3 baseline: all S3 public access block settings must be enabled.");
    }
  }
}
```

Then apply it once:

```ts
Aspects.of(app).add(new S3BaselineAspect());
```

That is much closer to the thing compliance.tf is trying to achieve. The difference is that the rule lives in the infrastructure model. It is not hidden behind the package URL.

The second hook is CDK's `Validations` API. Current CDK supports policy validation plugins at synthesis time. A plugin can inspect the synthesized CloudFormation templates and fail synthesis with a report. The same API can also attach warnings, errors, and acknowledgements to constructs.

With current cdk-nag v3, the shape is:

```ts
import { App, Validations } from "aws-cdk-lib";
import { AwsSolutionsChecks, NIST80053R5Checks } from "cdk-nag";

const app = new App();

Validations.of(app).addPlugins(new AwsSolutionsChecks(app));
Validations.of(app).addPlugins(new NIST80053R5Checks(app));
```

And exceptions are explicit:

```ts
Validations.of(customerData).acknowledge({
  id: "cdknag::AwsSolutions-S1",
  reason: "Access logs are collected by the organization-level CloudTrail data event pipeline.",
});
```

This is a better exception story than changing registries. The exception has a scope, an ID, and a reason. It can be reviewed like code.

There does not appear to be a current first-party cdk-nag pack named "CIS AWS Foundations". The public cdk-nag packs are AWS Solutions, HIPAA Security, NIST 800-53 rev 4, NIST 800-53 rev 5, PCI DSS 3.2.1, and Serverless. That does not weaken the argument. For the S3 baseline, the AWS Solutions pack already covers the same class of failure:

- `AwsSolutions-S1`: S3 bucket has server access logs disabled;
- `AwsSolutions-S2`: S3 bucket does not have public access restricted and blocked;
- `AwsSolutions-S3`: S3 bucket does not have default encryption enabled;
- `AwsSolutions-S10`: S3 bucket does not require SSL.

So the CDK version is not a single trick. It is a stack of supported mechanisms:

1. a `RegulatedBucket` construct for the approved path;
2. an Aspect for broad tree-wide checks or last-mile mutation;
3. `Validations` or cdk-nag for synthesis-time policy reports;
4. runtime enforcement with AWS Config, Security Hub, CloudFormation hooks, SCPs, or Control Tower.

That is the model we should prefer. Put policy in libraries and validation systems that the framework knows about. Do not smuggle policy through a registry hostname.

This is where the AWS CDK story is stronger than the Terraform-registry story. If you choose a properly designed IaC framework, basic compliance does not require a custom registry tax. The framework already gives you places to put the policy: construct libraries for the approved path, Aspects for broad checks, `Validations` for synthesis-time failures and acknowledgements, and cdk-nag packs for existing security rules. For this S3 example, the AWS Solutions pack already checks the important failures: missing access logs, unrestricted public access, missing default encryption, and missing SSL enforcement.

## Why compliance.tf exists

The charitable read is that compliance.tf exists because many organizations are already stuck with broad public Terraform modules.

They use the popular community modules because those modules are maintained, familiar, and feature-complete. Then they discover the cost:

- the module exposes everything for every use case;
- teams can set combinations the platform team would never approve;
- secure defaults are not enough when optional inputs can reopen unsafe paths;
- forking public modules creates maintenance drag;
- wrapping modules creates another interface that still leaks the old one;
- scanning after the fact catches problems late.

So compliance.tf offers a practical escape hatch: stop forking, keep the module source mostly recognizable, and let the registry serve a compliance-ready variant.

That can be useful. If your organization is Terraform-heavy and cannot move, buying down fork pressure may be rational.

But call it what it is: a workaround for a rigid module system.

The strategic answer is not to keep the giant input surface and hide more behavior in the download path. The strategic answer is to build smaller, domain-specific infrastructure libraries with safe defaults, explicit extension points, tests, and policy validation.

## The problem is real inside Terraform-module land

The original claim was that organizations are forced to fork open source modules and lock them down for compliance reasons.

Directionally, yes. That is the pressure compliance.tf is responding to.

But the deeper cause is not that S3 encryption or versioning is hard. The deeper cause is that broad Terraform modules turn platform design into parameter management. Once the module becomes the platform, compliance becomes a game of controlling variables.

That is why the CIS S3 sample is so useful. A small hardening requirement becomes a transformed module artifact with an enforced input and dozens of remaining options. The service can improve the defaults, but it cannot turn the module interface into a domain model.

Proper Infrastructure as Code should not feel like filling out a cloud resource questionnaire with 70 fields. It should feel like using a small library that encodes the organization's approved patterns.

compliance.tf is a clever product for teams living with Terraform's module abstraction.

It is not proof that compliance needs a special registry. It is proof that infrastructure treated as configuration eventually needs someone else to sell you the missing software engineering layer.
