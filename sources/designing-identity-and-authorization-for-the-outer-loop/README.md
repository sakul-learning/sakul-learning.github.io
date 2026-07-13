# Source note: Designing identity and authorization for the outer loop

## Primary technical sources

- **Amazon Bedrock AgentCore — Security best practices for AgentCore Runtime**  
  https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-security-best-practices.html
  - Least privilege, resource-scoped IAM, user-delegation restrictions, confused-deputy prevention, and CloudTrail/CloudWatch audit correlation.
- **Amazon Bedrock AgentCore — On-behalf-of token exchange**  
  https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-behalf-of-token-exchange.html
  - User-token subject plus agent credential-provider context to obtain scoped downstream access without exposing client secrets to agent code.
- **IETF RFC 8693 — OAuth 2.0 Token Exchange**  
  https://datatracker.ietf.org/doc/html/rfc8693
  - Standard token-exchange mechanism for delegation and impersonation; it does not itself define enterprise authorization policy.
- **OWASP — AI Agent Security Cheat Sheet**  
  https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html
  - Least privilege, explicit sensitive-action authorization, short-lived authorization artifacts, replay protection, and step-up authentication.
- **AWS Step Functions — Set up execution roles with Workflow Studio**  
  https://docs.aws.amazon.com/step-functions/latest/dg/manage-state-machine-permissions.html
  - Every state machine has an IAM execution role through which it calls integrated AWS services or HTTPS APIs.
- **AWS CDK — Step Functions construct library**  
  https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions-readme.html
  - `sfn.StateMachine` creates an execution role by default and automatically aggregates the permissions its configured task constructs require.
- **AWS EventBridge — IAM roles for sending events to targets**  
  https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-iam-roles.html
  - EventBridge target-role pattern, including an exact-resource `states:StartExecution` grant for Step Functions.
- **AWS Step Functions — Wait for a Callback with Task Token**  
  https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
  - Callback tasks pause a workflow until a worker reports a result; the article's approval broker is the policy and identity layer around that callback.
- **AWS Step Functions — Transforming data with JSONata**  
  https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html
  - Current AWS guidance for choosing JSONata as the state-machine query language and for data transformation/routing.
- **AWS CDK — QueryLanguage**
  https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.QueryLanguage.html
  - A top-level `JSONATA` state-machine setting requires JSONata states; `LambdaInvoke` and `SqsSendMessage` also expose `queryLanguage` for the CDK example.
- **AWS Security Blog — Cedar authorization for multi-agent chains**  
  https://aws.amazon.com/blogs/security/enforce-least-privilege-authorization-in-multi-agent-ai-chains-using-cedar/
  - Reference pattern that separately evaluates agent-to-tool, agent-to-agent delegation, and originating-user authorization.
- **NIST NCCoE concept paper — AI agent identity and authorization**  
  https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd
  - A 2026 concept paper identifying agent identification, authorization, delegation, audit/non-repudiation, and prompt injection as key enterprise implementation areas; not a finalized standard.
- **Strands Agents — Agent interventions**  
  https://strandsagents.com/docs/user-guide/concepts/agents/interventions
  - In-process hooks can proceed, deny, guide, confirm, or transform agent actions; they complement but do not replace platform/target authorization.

## Related Sakul Learning article

- **“The outer loop is an accountability system”**  
  https://sakul-learning.github.io/2026/07/12/owning-the-outer-loop/
  - Supplies the outer-loop concepts of verdict, answerability, back pressure, and accountable ownership.

## Local research brief

Full comparison, corpus-coverage matrix, authority-envelope schema, and source analysis:

`/Volumes/share/courses/aws-agentcore/research/agent-identity-authority-envelopes/research-brief.md`

(Local VM path: `/mnt/share/courses/aws-agentcore/research/agent-identity-authority-envelopes/research-brief.md`.)
