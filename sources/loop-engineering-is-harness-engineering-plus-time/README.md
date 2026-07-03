# Sources for “Loop engineering is harness engineering plus time”

Research folder on LAN share:

- `/Volumes/share/courses/aws-agentcore/research/loop-engineering/blog-post-synthesis.md`
- `/Volumes/share/courses/aws-agentcore/research/loop-engineering/oracle-agent-loop-decoded/`
- `/Volumes/share/courses/aws-agentcore/research/loop-engineering/inngest-agent-loop-architecture/`
- `/Volumes/share/courses/aws-agentcore/research/loop-engineering/loop-engineering-ieee/`
- `/Volumes/share/courses/aws-agentcore/research/loop-engineering/cq-memory-management-notes.md`
- `/Volumes/share/courses/aws-agentcore/research/loop-engineering/repos/cq/`

## Primary sources

1. `cobusgreyling/loop-engineering`
   - URL: https://github.com/cobusgreyling/loop-engineering
   - Role: practical pattern catalog and operating checklist.

2. `Loop-Engineering-IEEE.pdf`
   - URL: https://drive.google.com/file/d/1qzKI4DKnyHRpXK1J3ATPqwaqLc0iNu-M/view
   - Role: conceptual frame — loop engineering as replacing yourself as the repeated prompter.

3. Inngest — “The Agent Loop Architecture”
   - URL: https://www.inngest.com/blog/agent-loop-architecture
   - Role: durable orchestration, checkpointing, skills, run history.

4. Oracle — “The Agent Loop Decoded”
   - URL: https://blogs.oracle.com/developers/the-agent-loop-decoded-three-levels-every-agent-engineer-must-know
   - Role: gentle recap of the inner ReAct-style harness loop, memory maturity, stop conditions, semantic tool discovery, feedback loops.

5. mvanhorn — “Loop Engineering”
   - URL: https://x.com/mvanhorn/article/2063865685558903149?lang=en
   - Role: recent loop-engineering ladder from ReAct → AutoGPT → ralph → `/goal` → continuous orchestration.

6. Peter Steinberger / Boris Cherny loop-engineering quotes
   - URL: https://x.com/@steipete
   - Role: current practitioner framing — stop prompting agents directly; design loops that prompt and supervise agents.

7. Amazon Bedrock AgentCore developer guide
   - URL: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
   - Role: production-agent pillar vocabulary for the platform-loop paragraph: Runtime, Memory, Identity, Gateway, built-in tools, Observability, Policy, Evaluations, and Optimization.

8. `mozilla-ai/cq`
   - URL: https://github.com/mozilla-ai/cq
   - Role: future-looking structured memory pattern: knowledge units with summary/detail/action, applicability metadata, confidence, confirmations, timestamps, flags, supersession, tiers, provenance, and promotion rules.

## Notes

The arXiv compiler-loop paper folder was intentionally excluded from this blog-post draft per instruction:

- `/Volumes/share/courses/aws-agentcore/research/loop-engineering/2511.00592-agentic-auto-scheduling/`
