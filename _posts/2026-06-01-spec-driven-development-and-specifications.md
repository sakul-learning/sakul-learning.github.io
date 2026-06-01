---
layout: post
title: "Spec-Driven Development and Specifications"
summary: "Specifications turn research into development by making the definition of good explicit, inspectable, and testable before code is written."
tags: [spec-driven-development, specifications, ai-development, software-engineering, quality]
source_folder: sources/spec-driven-development-and-specifications
sources:
  - title: "R&D Is Two Jobs, and Research Doesn’t Run on Autopilot"
    url: "https://joe.dev/posts/research-vs-development/"
    note: "Joe.dev essay distinguishing research from development, and explaining why autonomous software factories need a clear target."
  - title: "The Feedback Principle"
    url: "https://specdriven.com/first-principles/feedback-principle"
    note: "Spec-Driven first-principles article arguing that software quality improves when feedback is provoked and detected as early as possible."
---

## Short summary

Software teams often talk about speed as if the main bottleneck is typing code. If code can be generated faster, reviewed faster, merged faster, and deployed faster, then it seems like better software should arrive sooner.

But that misses the deeper constraint.

A lot of software work does not fail because the code was typed too slowly. It fails because the team did not yet know what **good** meant.

That is the useful distinction in Joe's essay, **["R&D Is Two Jobs, and Research Doesn't Run on Autopilot"](https://joe.dev/posts/research-vs-development/)**. Research and development are often compressed into one phrase, but they are different types of work. Research discovers the target. Development executes against a target.

Spec-driven development sits exactly at that boundary.

A specification is not just a document. It is the artifact that turns research into development. It captures the current definition of good well enough that humans, tests, tools, and AI agents can all work against it.

## Research finds the target

Research is the phase where the team is still asking questions such as:

- What problem are we solving?
- Who is it for?
- What does success look like?
- What tradeoffs matter?
- Which assumptions are risky?
- Is this even the right thing to build?

The output of research is not primarily code. The output is knowledge.

Sometimes that knowledge comes from prototypes. Sometimes it comes from customer conversations. Sometimes it comes from technical spikes. Sometimes it comes from writing down a model and realizing the model does not make sense.

This is why autonomous coding agents struggle when pointed at vague work. They are powerful at producing plausible software, but plausibility is not the same as correctness. If the goal is unclear, an agent can generate something coherent while still missing the actual question.

Joe's essay describes the software factory as a machine for converging on a target. But it cannot invent the target. Someone still has to define what good means.

That definition is research work.

## Development executes against the target

Development begins when the work becomes legible enough to check.

A development-ready task has some combination of:

- a clear interface
- a scenario
- an acceptance criterion
- a test
- an example
- a constraint
- a definition of done

This is the terrain where agents, automation, CI, test suites, and parallel execution become much more effective.

Once the target is known, the work can be decomposed. A team can say: implement this behavior, satisfy this contract, preserve this invariant, make this failing test pass, or refactor without changing these observable outcomes.

In other words, development scales when the specification is good enough.

## Specifications are feedback devices

The second article, **["The Feedback Principle"](https://specdriven.com/first-principles/feedback-principle)**, gives another way to understand specifications.

Its central claim is simple: the earlier feedback is detected, the cheaper it is to handle.

A quality function is any activity that provokes feedback. Testing is a quality function. Code review is a quality function. Pair programming, user interviews, architecture review, mockups, BDD scenarios, CI pipelines, and retrospectives are all quality functions because they expose information while there is still time to act on it.

A specification is also a quality function.

A good spec is not valuable because it satisfies process theater. It is valuable because it provokes feedback before code exists.

When a stakeholder reads a scenario and says, "That is not how the workflow actually works," the spec has done its job. When QA asks, "What happens if this field is missing?" the spec has done its job. When an engineer notices that two requirements contradict each other, the spec has done its job.

The cheapest bug is the one found while it is still a sentence.

## Shift feedback left into the specification

The Feedback Principle reframes "shift left" as moving quality functions earlier, where feedback is cheaper.

Spec-driven development is one of the strongest forms of shifting left because it moves verification and validation into the design stage.

Before writing production code, the team can ask:

- Is this the right behavior?
- Is this behavior complete?
- Can we test it?
- Can an implementer understand it?
- Can an agent execute against it?
- Are the edge cases explicit?
- Are the tradeoffs visible?
- Would a user recognize this as solving their problem?

This matters because late feedback is expensive. A missing requirement caught in production may require incident response, rollback, customer communication, and a rewrite. The same missing requirement caught in a specification may require a five-minute conversation and an edited paragraph.

Spec-driven development is not about writing more documentation. It is about making the specification the earliest executable surface for feedback.

## Verification and validation

The Feedback Principle also separates verification from validation:

- **Verification:** Did we build the system right?
- **Validation:** Did we build the right system?

Specs connect these two.

A weak specification only supports verification. It lets us check whether the system conforms to what was written, but it does not help us know whether what was written is worth building.

A strong specification supports both. It captures enough product intent to validate the direction, and enough technical precision to verify the implementation.

This is especially important in AI-assisted development. Agents are increasingly good at verification-oriented work: making tests pass, implementing interfaces, following examples, and resolving mechanical issues. But validation still requires context, judgment, and taste.

So the human role does not disappear. It moves upstream.

The human becomes responsible for shaping the target, testing the assumptions, and maintaining the quality of the specification.

## The agent era makes specs more important, not less

There is a tempting but wrong conclusion to draw from coding agents: if code becomes cheap, specs become less important.

The opposite is true.

As code generation becomes cheaper, the cost of unclear intent goes up. A human developer given a vague task might stop and ask questions. An agent may confidently produce a large amount of coherent but misdirected code.

The bottleneck shifts from implementation capacity to target quality.

In an agentic workflow, a specification is not merely a communication artifact between humans. It becomes the control surface for the whole system.

The spec tells the agent:

- what to build
- what not to build
- how success will be checked
- which examples matter
- which constraints are non-negotiable
- when the task is complete

Without that, the agent is not a factory. It is a high-throughput ambiguity amplifier.

## Spec-driven development as a loop

Spec-driven development should not be imagined as a waterfall process where a perfect document is written upfront and then handed to implementation.

That would misunderstand both research and feedback.

A better model is a loop:

1. Explore the problem space.
2. Write the current understanding as a specification.
3. Provoke feedback from users, QA, engineers, stakeholders, tests, and prototypes.
4. Revise the specification.
5. Execute against the parts that are now clear.
6. Learn from implementation and production.
7. Update the specification again.

The spec is not the end of thinking. It is the medium through which thinking becomes inspectable.

## What makes a specification useful?

A useful specification should make feedback easier and cheaper.

That means it should include things like:

- concrete scenarios
- examples of expected behavior
- non-goals
- edge cases
- acceptance criteria
- domain language
- constraints
- open questions
- risks and assumptions
- validation notes
- testable outcomes

The most important part may be the open questions. A spec that pretends uncertainty does not exist is dangerous. It makes research look like development. It invites the team to execute before the target is known.

A good spec separates what is known from what is assumed.

That distinction determines how much autonomy is safe.

## The leash length depends on spec quality

Joe's essay makes an important point about agent autonomy: the better you know what good looks like, the longer the leash you can give the agent.

This is a useful principle for spec-driven development generally.

When the spec is vague, keep the loop tight:

- shorter tasks
- more human review
- more prototypes
- more stakeholder feedback
- more validation

When the spec is clear, the loop can widen:

- more automation
- more parallel work
- more autonomous implementation
- more reliance on tests and acceptance criteria

The danger is not using agents. The danger is giving development-level autonomy to research-stage work.

Spec quality determines safe autonomy.

## Conclusion

Spec-driven development is not bureaucracy. It is a way of making software work cheaper, faster, and safer by moving the discovery of mistakes earlier.

Joe's research-versus-development distinction explains why specifications matter: they define the target that development needs in order to execute well.

The Feedback Principle explains why specifications are economically powerful: they provoke feedback while change is still cheap.

Together, they suggest a simple theory:

> Research discovers what good looks like.  
> Specifications make that definition inspectable.  
> Development executes against it.  
> Feedback keeps the whole system honest.

In the age of AI coding agents, this becomes even more important. The future of software development may involve more autonomous implementation, but autonomy only works when the target is clear.

The spec is where that clarity lives.

