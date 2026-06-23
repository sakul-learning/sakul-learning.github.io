# compliance.tf and IaC compliance

## Purpose

Grounding notes for an unpublished draft arguing that the problem compliance.tf monetizes is largely a Terraform module abstraction problem, not an inherent infrastructure compliance problem. The article should compare registry-level module transformation with normal software-engineering approaches to Infrastructure as Code: typed constructs, library contracts, validations, tests, and policy checks.

## compliance.tf public docs

- Homepage: https://compliance.tf/
  - Positions the product as compliant Terraform modules without forking.
  - Core user action is changing module sources to compliance-specific registry domains.
- Docs: https://compliance.tf/docs/
- Endpoints docs: https://compliance.tf/docs/features/endpoints/
  - Registry hosts include framework-specific endpoints such as `cis.compliance.tf`, `soc2.compliance.tf`, `hipaa.compliance.tf`, `pci-dss.compliance.tf`, and `registry.compliance.tf`.
  - The module source hostname becomes a policy/compliance selector.
- Controls docs: https://compliance.tf/docs/features/controls/
- Pricing: https://compliance.tf/pricing/
  - Public pricing page presents Enterprise as the commercial plan.
  - CIS registry pages are public and usable for research without a free-plan token.
- Security: https://compliance.tf/security/
- AWS Marketplace listing: https://aws.amazon.com/marketplace/pp/prodview-piljg56ndgr2c
  - Enterprise offering is available through AWS Marketplace billing.

## CIS public registry sample

- CIS v6.0.0 overview: https://compliance.tf/docs/frameworks/aws/cis_v600/
  - Public page describes 79 controls across 6 modules.
  - Covered areas include CloudTrail, EBS encryption, EC2 IMDSv2, AWS Config, IAM password policy, KMS rotation, RDS encryption, and S3 controls.
- S3 module: https://cis.compliance.tf/terraform-aws-modules/s3-bucket/aws
- S3 diff: https://cis.compliance.tf/terraform-aws-modules/s3-bucket/aws/diff
- S3 inputs: https://cis.compliance.tf/terraform-aws-modules/s3-bucket/aws/inputs

Observed from the public CIS S3 pages:

- The module is based on `terraform-aws-modules/s3-bucket/aws`.
- The CIS page lists 2 controls for the S3 module:
  - `s3_bucket_mfa_delete_enabled`
  - `s3_bucket_versioning_enabled`
- The diff page shows the CIS variant changing the `versioning` default from `{}` to `{ "mfa_delete": "Enabled" }` for the inspected version.
- The inputs page shows 1 enforced input and 72 optional inputs.

Interpretation for the article:

- compliance.tf can reduce some unsafe defaults or enforce specific inputs.
- It does not remove the broad module surface. The public S3 sample still exposes many optional inputs.
- The framework works around Terraform's module abstraction by moving compliance policy into the registry/download layer.

## GitHub repositories

Public organization: https://github.com/compliancetf

Repos cloned locally for inspection under `/data/repos/research/compliancetf/repos/`:

- `.github`
  - Org profile README says: "Transform your Terraform modules into compliance-ready modules."
- `starter-kit-saas-soc2`
  - Example usage of `soc2.compliance.tf/...` module sources.
- `starter-kit-healthtech-hipaa`
  - Example usage of `hipaa.compliance.tf/...` module sources.
- `starter-kit-fintech-pcidss`
  - Example usage of `pci-dss.compliance.tf/...` module sources.

Local research directory:

- `/data/repos/research/compliancetf/repos.tsv`
- `/data/repos/research/compliancetf/endpoints.txt`
- `/data/repos/research/compliancetf/pricing.html`
- `/data/repos/research/compliancetf/sitemap-web.xml`

## Endpoint checks

Terraform registry protocol endpoints were tested with `curl` against `.well-known/terraform.json` on compliance.tf registry hosts. The public registry endpoints respond like Terraform registry hosts. Private app/auth endpoints returned private-app style responses such as 401/404 depending on URL.

Use cautious language: public evidence confirms registry protocol behavior and public module metadata/diff pages. It does not prove every commercial transformation implementation detail.

## Higher-level IaC comparison

AWS CDK references:

- Aspects: https://docs.aws.amazon.com/cdk/v2/guide/aspects.html
  - AWS docs describe Aspects as a way to apply operations to constructs in a scope, including validation and modification.
  - The docs include a bucket-versioning validator example using `IAspect`, `CfnBucket`, and `Annotations.of(node).addError(...)`.
- Policy validation at synthesis: https://docs.aws.amazon.com/cdk/v2/guide/policy-validation-synthesis.html
  - CDK supports policy validation plugins at app/stage level using `Validations.of(app).addPlugins(...)`.
  - Violations fail synthesis and produce reports.
- S3 Bucket construct: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html
  - Relevant props include `blockPublicAccess`, `encryption`, `enforceSSL`, `versioned`, `serverAccessLogsBucket`, `removalPolicy`, and others.
- cdk-nag GitHub: https://github.com/cdklabs/cdk-nag
  - cdk-nag v3 integrates with CDK's native policy validation framework.
  - Publicly listed packs: AWS Solutions, HIPAA Security, NIST 800-53 rev 4, NIST 800-53 rev 5, PCI DSS 3.2.1, and Serverless.
  - No first-party/current cdk-nag CIS AWS Foundations pack was found in the public cdk-nag docs/search results. The available packs still cover many S3 hardening checks relevant to CIS-style baselines.
  - v3 suppressions/acknowledgements use `Validations.of(construct).acknowledge(...)`.
- cdk-nag RULES: https://github.com/cdklabs/cdk-nag/blob/main/RULES.md
  - `AwsSolutions-S1`: S3 Bucket has server access logs disabled.
  - `AwsSolutions-S2`: S3 Bucket does not have public access restricted and blocked.
  - `AwsSolutions-S3`: S3 Bucket does not have default encryption enabled.
  - `AwsSolutions-S10`: S3 Bucket does not require requests to use SSL.
- AWS cdk-nag blog: https://aws.amazon.com/blogs/devops/manage-application-security-and-compliance-with-the-aws-cloud-development-kit-and-cdk-nag/
  - Demonstrates applying nag packs to CDK apps and detecting issues such as missing S3 access logs, public access restrictions, encryption, and SSL enforcement.
  - The older blog uses `Aspects.of(app).add(new AwsSolutionsChecks(...))`; current cdk-nag v3 examples use `Validations.of(app).addPlugins(new AwsSolutionsChecks(app))`.
- Archived CIS/GDPR CDK component library found in search: https://github.com/SSHcom/c3
  - `@ssh.com/c3` provided compliant AWS CDK components for CIS/GDPR style controls, but the repo is archived/read-only as of 2025. Useful as historical evidence that compliant CDK component libraries are a natural alternative shape, not as a recommended dependency.

## Core thesis

compliance.tf is tactically useful for organizations already trapped in broad Terraform modules. It can reduce fork pressure and enforce some controls. But the product exists because Terraform modules are weak as enterprise platform abstractions. A better platform should express compliant infrastructure as a supported library contract with typed inputs, safe defaults, validation, tests, and scoped exceptions instead of using the registry hostname as the policy mechanism.

## Caveats

- Do not overclaim that compliance.tf performs unsupported mutation in the sense of corrupting module internals. Public docs describe a custom registry that serves compliance-ready variants and exposes diffs/inputs.
- The fair claim is that it works around the module system at the registry/download layer because Terraform modules do not provide rich policy extension points.
- The framework may be useful as a bridge for Terraform-heavy organizations.
- The article's argument should be about strategic architecture, not pretending the tool has no tactical value.
