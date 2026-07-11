# Sources for “The specification is not the batch”

## Thesis

Spec-driven development, Agile, trunk-based development, and loop engineering govern complementary feedback cycles rather than representing competing alternatives:

- **SDD:** inspectable intent and evidence of done;
- **Agile:** product learning and revision of hypotheses;
- **trunk-based development:** frequent integration against shared reality;
- **loop engineering:** governed, repeatable autonomous execution with durable state, verification, budgets, and stopping rules.

The article argues that the valid critique of AI-era SDD is not the presence of a spec. It is the use of a large, frozen specification as a container for a large, delayed batch of implementation and review.

## Primary external sources

1. **Claes Adamsson — “Spec-Driven Development and the Return of Big Batch Thinking”**
   - URL: https://cladam.github.io/2026/06/22/spec-driven-development/
   - Role: Direct critique of large AI-generated feature batches; connects small vertical slices, continuous integration, trunk-based development, review comprehension, telemetry, and feedback.

2. **Claes Adamsson — `tbdflow`**
   - URL: https://cladam.github.io/projects/tbdflow/
   - Repository: https://github.com/cladam/tbdflow
   - Role: Concrete workflow tool supporting a trunk-first default, short-lived exception branches, Definition-of-Done checks, stale-branch surfacing, and completion/cleanup.

3. **Addy Osmani — “Loop Engineering”**
   - URL: https://addyosmani.com/blog/loop-engineering/
   - Role: Canonical mechanical account of loop engineering: automations, worktrees, skills, connectors, sub-agents, and durable external state compose a repeatable agent system rather than a one-off run.

4. **Sau Sheong — “Loop is the new Agile”**
   - URL: https://sausheong.com/loop-is-the-new-agile-0c3f426e469b
   - Local capture: `/Volumes/share/courses/aws-agentcore/research/loop-engineering/loop-is-new-agile-sau-sheong/article.md`
   - Role: Makes the explicit analogy: loop engineering compresses the Agile feedback cycle from team/sprint scale to agent/code/test scale.

5. **Manifesto for Agile Software Development**
   - URL: https://agilemanifesto.org/
   - Role: Original formulation that working software and responding to change are preferred over exhaustive documentation and rigid plan-following.

6. **Trunk Based Development**
   - URL: https://trunkbaseddevelopment.com/
   - Role: Reference for frequent shared-trunk integration and supporting techniques such as feature flags, branch by abstraction, and short-lived branches.

## Related published articles

- [Spec-Driven Development and Specifications](https://sakul-learning.github.io/2026/06/01/spec-driven-development-and-specifications/)
- [Evolving Spec-Driven Development](https://sakul-learning.github.io/2026/06/03/evolving-spec-driven-development/)
- [Loop engineering is harness engineering plus time](https://sakul-learning.github.io/2026/07/02/loop-engineering-is-harness-engineering-plus-time/)

## Publication artifact

- Post: `_posts/2026-07-11-specs-slices-trunk-and-loops.md`
- URL: `/2026/07/11/specs-slices-trunk-and-loops/`
