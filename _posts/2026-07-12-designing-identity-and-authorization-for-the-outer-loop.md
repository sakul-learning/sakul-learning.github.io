---
layout: post
title: "Designing identity and authorization for the outer loop"
summary: "A production agent needs more than a workload identity. The outer loop must keep the trigger, agent, delegation, execution credential, verdict authority, and accountable owner distinct—and turn approval into a narrow, short-lived authority envelope."
tags:
  - ai-agents
  - identity
  - authorization
  - loop-engineering
  - agentcore
  - step-functions
  - security
  - platform-engineering
  - zero-trust
source_folder: sources/designing-identity-and-authorization-for-the-outer-loop
sources:
  - title: "Own the Outer Loop"
    url: "https://addyo.substack.com/p/own-the-outer-loop"
    note: "Addy Osmani's vocabulary for quality, verdict, answerability, back pressure, and human ownership at the production boundary."
  - title: "The outer loop is an accountability system"
    url: "https://sakul-learning.github.io/2026/07/12/owning-the-outer-loop/"
    note: "The SDLC outer-loop model: durable process truth plus human accountability truth."
  - title: "Security best practices for AgentCore Runtime"
    url: "https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-security-best-practices.html"
    note: "Live AWS guidance on least privilege, user delegation, confused-deputy prevention, and audit correlation."
  - title: "On-behalf-of token exchange"
    url: "https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-behalf-of-token-exchange.html"
    note: "AgentCore Identity's delegated OAuth token-exchange path for scoped downstream access."
  - title: "AI Agent Security Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html"
    note: "OWASP guidance on least-privilege tools, short-lived authorization artifacts, replay protection, and step-up authentication for high-impact actions."
  - title: "Set up execution roles with Workflow Studio"
    url: "https://docs.aws.amazon.com/step-functions/latest/dg/manage-state-machine-permissions.html"
    note: "AWS documentation: every Step Functions state machine uses an IAM execution role to call services and HTTPS APIs."
  - title: "AWS CDK Step Functions construct library"
    url: "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions-readme.html"
    note: "The StateMachine construct creates an execution role by default and automatically adds the permissions required by the configured task constructs."
  - title: "IAM roles for sending events to targets in Amazon EventBridge"
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-iam-roles.html"
    note: "AWS documentation for the EventBridge target role pattern, including Step Functions StartExecution permissions."
  - title: "Wait for a Callback with Task Token"
    url: "https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html"
    note: "AWS documentation for Step Functions callback tasks; the approval-broker pattern adds identity and policy verification before resuming a workflow."
  - title: "Transforming data with JSONata in Step Functions"
    url: "https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html"
    note: "AWS documentation for selecting JSONata as a state-machine query language and using it for data transformation and Choice routing."
  - title: "Strands Agents interventions"
    url: "https://strandsagents.com/docs/user-guide/concepts/agents/interventions"
    note: "Strands hooks can proceed, deny, guide, confirm, or transform agent actions, but are in-process guardrails rather than an identity or authorization service."
---

The incident is active. A monitor sees a sharp rise in errors after a deployment. An agent can correlate the release, inspect traces, find the feature flag, and propose a rollback in seconds.

The tempting next sentence is: *give the agent enough production access to fix it.*

That is the wrong sentence.

The useful question is: **which authority is needed for this exact action, who granted it, how long does it last, and what evidence lets us explain it later?**

The difference is not bureaucratic. It is the difference between an incident-response agent that acts quickly inside a controlled boundary and a confused deputy[^confused-deputy] with a production credential.

This is where the idea of the SDLC **outer loop** becomes more concrete. A durable workflow is not merely a place to remember that a task is in `verify` or `integrate`. It is the place where the system preserves and enforces the relationship between identity, delegated authority, verdicts, and accountability.

## Identity answers only one question

“Give every agent an identity” is correct, but incomplete.

Amazon Bedrock AgentCore Identity has the right starting vocabulary. A runtime or gateway has a stable **workload identity**. Inbound authentication identifies the caller. Outbound credentials let the workload reach a tool. On-behalf-of token exchange can obtain a scoped downstream token for an authenticated user without exposing client secrets to the agent.

Those are different things. In an SDLC process, at least six principals or facts may be relevant:

| Fact | The question it answers | Example |
| --- | --- | --- |
| **Originating subject** | What verified person, service, or event started this work? | A GitHub webhook, a CI role, a named engineer, or an incident alert. |
| **Workflow execution identity** | Which AWS principal may orchestrate this particular process? | The state machine's IAM execution role, assumed by Step Functions. |
| **Agent workload identity** | Which agent/runtime actually performed the work? | `sdd-implement`, `sdd-verify`, or `incident-diagnose`. |
| **Delegation subject** | Whose rights, if any, may be exercised downstream? | A user who consented to the agent reading their ticket or calendar. |
| **Execution credential** | Which short-lived technical credential will the target accept now? | A scoped OAuth token or narrowly assumed role. |
| **Verdict authority** | Who may allow this process to advance? | A release owner approving a production rollout. |
| **Accountable owner** | Who accepts the consequence and remediation obligation? | The service owner or incident commander. |

Sometimes one human occupies several columns. Often no human is present at the start: a scheduler, a GitHub event, or an alert opens the process. That is precisely why we should not blur the columns.

A webhook that starts an agent is not a release owner. A state-machine role is not a user. An agent workload identity is not a state-machine role. A reviewer’s approval is not a standing production credential. A green CI run is not an accountable verdict.

## The workflow has an identity too

A durable workflow is an AWS workload in its own right. Step Functions assumes the state machine's **execution role** to call the services named by its task states. That IAM role is the workflow's technical identity: it might invoke a named AgentCore runtime, start one named child state machine, put a particular EventBridge event, read a particular artifact prefix, or send a task to a particular approval broker.

### Policy synthesis is not delegation

With raw Amazon States Language, somebody must author that execution-role policy. With the AWS CDK Step Functions constructs, the usual implementation is more mechanical: task constructs bind to the `sfn.StateMachine`, and CDK aggregates the IAM statements required by the component tasks onto the state machine's generated execution role (or the role supplied to the construct). For example, a `tasks.LambdaInvoke` task contributes permission to invoke its function and an `SqsSendMessage` task contributes permission to send to its queue. The CDK documentation describes this as automatic addition of the permissions required for the state machine's tasks.

That is useful policy synthesis, not delegation. It compiles the authority required for the configured workflow graph into **one workflow execution role**; it does not infer a caller's identity, make an EventBridge alarm a release owner, turn an approval into a credential, or grant an AgentCore runtime the role's complete authority. Review the synthesized CloudFormation/IAM policy—especially for dynamic resource ARNs, generic SDK calls, or tasks that require explicitly supplied `iamResources`—then choose where separate state machines, roles, or brokers express a meaningful authority boundary.

### The CDK mechanical detail

```ts
const diagnose = new tasks.LambdaInvoke(this, 'Diagnose incident', {
  lambdaFunction: diagnosisBridge,
  payload: sfn.TaskInput.fromObject({
    incidentId: sfn.JsonPath.stringAt('$.incidentId'),
    authorityEnvelope: sfn.JsonPath.objectAt('$.authorityEnvelope'),
  }),
});

const requestVerdict = new tasks.SqsSendMessage(this, 'Request commander verdict', {
  queue: approvalQueue,
  integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
  messageBody: sfn.TaskInput.fromObject({
    processId: sfn.JsonPath.stringAt('$$.Execution.Id'),
    evidence: sfn.JsonPath.objectAt('$.evidence'),
    taskToken: sfn.JsonPath.taskToken,
  }),
});

const workflow = new sfn.StateMachine(this, 'IncidentOuterLoop', {
  definitionBody: sfn.DefinitionBody.fromChainable(
    diagnose.next(requestVerdict),
  ),
  // No `role` supplied: CDK creates the execution role and aggregates
  // the task permissions above into it.
});
```

In this shape, CDK synthesizes the workflow role's `lambda:InvokeFunction` permission for `diagnosisBridge` and `sqs:SendMessage` permission for `approvalQueue`. That is exactly the desired aggregation **within the workflow's execution identity**. The next boundary is still separate: `diagnosisBridge` has its own Lambda execution role and, if it invokes AgentCore, AgentCore has its own runtime/workload identity and execution role. The approval application and JIT deployment broker likewise keep their distinct identities and policies.

A better decomposition looks like this:

| Workload | Its identity | Narrow authority |
| --- | --- | --- |
| EventBridge rule | EventBridge target invocation role | `states:StartExecution` on one state-machine ARN. |
| Parent outer-loop workflow | Step Functions execution role | Start named child workflows; invoke only named AgentCore stages; read/write its artifact and decision records; send approval requests. |
| `implement` child workflow | Its own execution role | Invoke the implementation runtime and create its narrow work request—never deploy or approve. |
| AgentCore implementation runtime | AgentCore workload identity plus runtime execution role | Read the named repository, write a constrained branch, run approved tests, obtain only its own credential-provider tokens. |
| Approval broker | Broker service role | Validate a human's identity and authorization, then return a permitted callback outcome. |
| Deployment/elevation broker | Separate broker role | Exchange one approved, bounded request for a short-lived action credential; never accept an agent's request alone. |

The effective authority is therefore **the intersection of the workflow role, the stage's role, the agent's capability, the envelope, and the target's own policy**. A state machine provides process continuity; IAM and the target system decide whether each actual API call is permitted.

## Delegation is not impersonation

There are cases where a downstream system must apply a user’s own rights. A support agent may need to read only the customer case that the authenticated support engineer is allowed to see. A development agent may need to create a draft issue under a user-approved integration. In those cases, a shared agent service account hides too much.

The better pattern is **delegation**: preserve the originating subject and ask an authorization server for a new token that is deliberately narrower in audience, scope, and lifetime.

AgentCore Identity supports an on-behalf-of path for this. It uses the validated inbound user token as the subject for a downstream OAuth exchange; the authorization server, not the model, makes the final decision about scopes and whether the delegation is permitted. The underlying OAuth 2.0 Token Exchange standard, [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693), is useful here because it describes token exchange for impersonation and delegation. It does not decide whether the agent ought to have the authority. That remains a policy and product decision.

This distinction matters because an agent is often both more capable and less predictable than a conventional API client. Passing a user’s broad token through a chain of tools turns every prompt-injection path into a possible use of that person’s authority. Delegation should reduce power as it moves outward, not preserve it by default.

## The authority envelope

The missing artifact is an **authority envelope**: a durable, signed, policy-evaluated description of what one agent stage may do, for whom, against which resources, until when, and when it must stop or escalate.

This is a design term, not an AWS product. It is the bridge between an outer-loop process record and the lower-level controls that actually enforce it.

```text
origin
  → agent workload identity
  → delegated subject, if there is one
  → permitted capability and resource scope
  → budget / expiration / delegation depth
  → required evidence and approval policy
  → verdict authority and escalation path
```

For a bounded implementation stage, the envelope might say:

```text
The GitHub pull-request event for ORG/payments#1842 may invoke sdd-implement.
It may read ORG/payments, create a branch matching agent/payments-1842/*,
run the approved test commands, and open a draft PR. It may not merge, deploy,
change acceptance criteria, modify policy, or invoke another agent. It expires
in 45 minutes or after 12 changed files. Production authority requires a new,
separate grant after independent verification.
```

This is more useful than a broad role called `AgentDeveloper`. It lets a state machine, a gateway policy, IAM, a target service, and a reviewer all reason about the same boundary without pretending they are the same control.

## Approval is a decision, not a credential

The outer-loop article argued that **quality** produces evidence, a human makes a **verdict**, and the system preserves **answerability**. There is an important refinement:

> An approval should change process state. It should not automatically become a long-lived technical credential.

Suppose a release owner approves a limited canary for a billing change. That verdict should allow a workflow to request one narrow rollout action: this service, this version, this environment, this rollout plan, this time window. It should not give the implementation agent a broad production role because the agent has already crossed an approval screen once.

For irreversible or high-impact actions, OWASP’s agent-security guidance recommends short-lived authorization artifacts, replay protection, and step-up authentication. That is a good description of **just-in-time elevation** in an agentic system.

A JIT grant should be bound to:

- a process and stage;
- a specific action and resource;
- the verified approving authority;
- an audience or target service;
- a short expiry and one-time-use nonce where appropriate;
- the evidence and policy version used to make the decision;
- an explicit revocation and denial path.

The workflow stores the verdict. A credential broker issues the narrow capability only after that verdict. The target independently checks it. Those separations are back pressure, not latency for its own sake.

## A worked path: event, workflow, agent, verdict, and JIT action

Consider a production incident that begins with a CloudWatch alarm. There is no authenticated end user to inherit from—only a verified AWS event and a named service that owns the alarm.

```text
CloudWatch alarm
  → EventBridge rule
  → StartExecution on incident outer-loop state machine
  → read-only AgentCore diagnosis runtime
  → evidence + proposed, preapproved rollback
  → human incident-commander verdict
  → JIT deployment broker
  → one rollback or feature-flag action
  → recovery observation and post-incident artifact
```

### 1. Verify the trigger, then record its provenance

EventBridge invokes `StartExecution` by assuming an **EventBridge target role** whose policy permits `states:StartExecution` only for the incident state machine. Its trust policy should constrain the EventBridge service with `aws:SourceAccount` and the specific rule ARN where possible. That proves an AWS-authorized EventBridge rule started the workflow; it does **not** make the alarm a human or grant it production permission.

The first state validates the expected event schema, tenant/account, alarm source, service mapping, and idempotency key. It writes an origin record containing the EventBridge rule, event ID, alarm ARN, account, observed time, and correlation ID. Treat the event `detail` as input data, not as authority. An external webhook follows the same pattern, except a trusted ingress service verifies the provider signature before it emits an internal event.

The state-machine example uses **JSONata**—not JSONPath—for data selection and routing. The validation task has already normalized the incoming event into `origin`; this abbreviated Amazon States Language fragment makes the subsequent policy decision visible. It is deliberately not an authentication mechanism: EventBridge/IAM and the validation stage establish that boundary first.

{% raw %}
```json
{
  "QueryLanguage": "JSONata",
  "StartAt": "ClassifyVerifiedOrigin",
  "States": {
    "ClassifyVerifiedOrigin": {
      "Type": "Pass",
      "Assign": {
        "isExpectedAlarm": "{% $states.input.origin.verified and $states.input.origin.source = 'aws.cloudwatch' and $states.input.origin.account = $states.input.expectedAccount %}",
        "mayUsePreapprovedRollback": "{% $states.input.policy.preapprovedRollback and $states.input.riskClass = 'contained' %}"
      },
      "Next": "RouteAuthority"
    },
    "RouteAuthority": {
      "Type": "Choice",
      "Choices": [
        {
          "Condition": "{% $isExpectedAlarm and $mayUsePreapprovedRollback %}",
          "Next": "RunReadOnlyDiagnosis"
        },
        {
          "Condition": "{% $isExpectedAlarm %}",
          "Next": "RequestHumanVerdict"
        }
      ],
      "Default": "EscalateUnexpectedOrigin"
    }
  }
}
```
{% endraw %}

### 2. Let the workflow identity orchestrate—not inherit all rights

Step Functions assumes its own execution role. That role may invoke only the named `incident-diagnose` AgentCore runtime and send a request to the approval broker. It does not have a broad `AdministratorAccess` policy and does not automatically receive the incident commander's future authority.

When Step Functions invokes an AgentCore runtime with IAM/SigV4, AgentCore sees the direct AWS caller—the workflow or a narrow invocation broker—not the original alarm. The authority envelope therefore carries the verified **origin record** separately for business policy and audit. The diagnosis runtime's own workload identity and runtime role are read-only: query the incident's logs and metrics, read a known runbook, and produce evidence. It cannot roll back production.

### 3. Use AgentCore incoming and outgoing identity deliberately

There are two different paths:

- **System/event work** such as this incident uses the workflow and agent workload identities. There is no user token to pass through. If a downstream target needs access, it receives a narrowly scoped service/JIT credential appropriate to the agent and stage.
- **User-delegated work** begins with a gateway or application that validates an end-user JWT. AgentCore Runtime or Gateway can validate that inbound JWT and AgentCore Identity can use it in an OBO[^obo] exchange for a scoped downstream token. The token must not be copied into Step Functions execution input or history. The workflow persists an identity reference, claims needed for policy, and a correlation ID; the trusted identity layer handles the live credential exchange.

That distinction prevents a dangerous fiction: a state machine started by an EventBridge alarm cannot claim to be “on behalf of” the engineer who later approves an action. An approval is a new authority decision, not retroactive user delegation.

### 4. Verify the verdict outside the task token

The workflow sends an evidence brief to an approval application and waits using a callback task token. The human signs in through the application's normal IdP path; the **approval broker** verifies the JWT/IAM identity, maps it to a release or incident-commander role, checks separation-of-duties and policy conditions, and records the named verdict.

Only after those checks does the broker use its own narrowly scoped IAM role to call `SendTaskSuccess` or `SendTaskFailure`. The task token is a workflow-resumption capability, not proof that the holder is an authorized approver. Keep it server-side and out of browser clients, chat messages, and logs. Step Functions then evaluates the structured callback result with `Choice` states: identity and policy verification happen in the broker; deterministic state transition happens in the workflow.

### 5. Mint a bounded action, not a standing role

For an approved rollback, a separate deployment broker verifies the process ID, envelope version, verdict record, requested action, target, expiry, and one-time nonce. It can then obtain a short-lived role session or target-specific credential constrained to *this* rollback or flag change. The target applies its own policy again. If any check fails—or if the grant expires—the workflow goes to `escalate` or `deny`, not to a more privileged retry.

This is JIT access as a durable outer-loop transition: **event provenance → evidence → named verdict → one limited action → observed result**.

### Where is verification actually performed?

| Question | Enforcement point |
| --- | --- |
| Was this AWS event allowed to start this workflow? | EventBridge target role, its trust policy, and `states:StartExecution` resource scope. |
| Is the event payload expected and deduplicated? | The workflow's first validation stage or a dedicated ingress validator. |
| May this workflow call this stage/tool? | Step Functions execution role, child-workflow role, AgentCore Gateway/Policy, and the AgentCore runtime's own role. |
| Is an end user real, and can the agent act for them? | AgentCore inbound JWT validation plus the IdP/authorization server's OBO decision. |
| May this person approve this consequence? | Approval application/broker, backed by its IdP, role/attribute policy, and separation-of-duties rules. |
| May this specific action happen now? | JIT broker, IAM/target policy, action/resource/time constraints, and the target's independent authorization. |
| Did the agent choose a permitted tool invocation? | Application tool wrapper plus external policy; Strands can interrupt a call but should not be the sole trust boundary. |

**Strands SDK is not an identity provider or an authorization server.** Its `BeforeToolCall` / intervention hooks and custom tool wrappers are useful in-process guardrails: they can validate an authority-envelope reference, deny an unapproved call, or require confirmation before execution. But the SDK runs in the agent application. A compromised runtime or an alternate client must still be denied by IAM, AgentCore Gateway/Policy, the broker, and the target service. Use Strands for local enforcement and ergonomics; use platform and target controls for verification that must survive a compromised agent process.


Now return to the incident.

```text
verified alert or incident commander starts process
  → diagnosis agent uses read-only workload identity
  → process records incident ID, severity, allowed runbooks, and evidence
  → policy decides whether a mitigation needs a human verdict
  → commander performs step-up approval for one bounded mitigation
  → broker issues a short-lived, action-specific grant
  → target executes rollback / disables flag / applies preapproved change
  → workflow records recovery evidence and creates follow-up learning
```

A system can choose different policies for different situations. An already-approved feature-flag disable with a known runbook may be automated within strict blast-radius conditions. A database migration rollback or a customer-data operation should require an identified human authority.

The key is that the incident agent never silently becomes the incident commander. Its workload identity is stable and narrowly privileged. The emergency authority is explicit, temporary, observable, and tied to one policy decision.

## Authorization must survive delegation

Multi-agent systems add a second temptation: the coordinator has authority, so it gives the same authority to every specialist it calls.

That is scope expansion disguised as orchestration.

AWS’s reference implementation for multi-agent authorization with Cedar makes the right structure visible. It checks agent-to-tool permissions, agent-to-agent delegation, and originating-user authorization separately. It limits delegation depth and requires a delegated capability set to be a subset rather than an invitation to invent new rights.

The exact technology is less important than the rule:

```text
effective permission
  = agent capability
  ∩ origin/delegation entitlement
  ∩ task and resource scope
  ∩ risk policy
  ∩ current verdict / elevation grant
  ∩ time and budget limit
```

Each `∩` is an opportunity for the outer loop to say no. A coordinator that calls a verifier should not pass write permission merely because it has it. A verifier should not be able to merge merely because it can read the PR. An incident agent should not receive a global administrator credential because a monitor fired.

## Where AgentCore and a durable workflow divide the work

AgentCore has strong primitives for the identity and credential side:

- workload identities give agents stable, distinct identities;
- inbound IAM or JWT authentication identifies callers;
- AgentCore Identity stores and retrieves credentials without placing secrets in agent code;
- OBO exchange gives a downstream service a scoped, user-aware token when that is required;
- Gateway and policy controls can govern tool access;
- CloudTrail and CloudWatch traces help connect caller, action, and result.

The durable outer-loop workflow owns a different truth:

- why this process exists and its verified origin;
- which stage can run next;
- the authority envelope for that stage;
- evidence requirements and independent verifier results;
- who may render a verdict;
- when a JIT grant must be requested, narrowed, revoked, or escalated;
- the durable record that lets a person answer for the consequence.

Neither layer is sufficient alone. Identity without a process can issue a valid credential for the wrong moment. A workflow without identity can record an approval but have no trustworthy way to constrain the action that follows.

## The final boundary

The outer loop is sometimes described as “the human loop.” That is incomplete. Much of it is a **machine-enforced authority loop** built around the points where human judgment is required.

The state machine is not the accountable owner. It cannot decide what the organization should value or bear the consequence of a bad trade-off. But it can make ownership enforceable by refusing to advance when the wrong identity asks, when authority is too broad, when evidence is missing, when a grant has expired, or when the required verdict has not been rendered.

Identity tells us who is present.

Delegation tells us whose rights are in play.

Approval tells us which next state is allowed.

Accountability tells us who must answer when that state changes the world.

An authority envelope keeps those facts separate long enough for the outer loop to do its job.

[^obo]: **On-behalf-of (OBO)** is delegated access: after a trusted system validates a user's token, it exchanges that subject token for a new downstream token with a deliberate audience, scope, and lifetime. The agent is an actor using constrained delegated authority; OBO is not a way to turn an event, an approval, or an arbitrary `user_id` field into a user's identity.

[^confused-deputy]: A **confused deputy** is a more-privileged service that is tricked or insufficiently constrained into using its authority for a less-privileged caller. In an agentic workflow, it appears when an event, user, or sub-agent can cause the workflow or agent runtime to spend privileges that the origin was never authorized to use.
