# Source notes: Spec-driven development and specifications

Working post: `_posts/2026-06-01-spec-driven-development-and-specifications.md`

## Primary sources

### R&D Is Two Jobs, and Research Doesn’t Run on Autopilot

- URL: https://joe.dev/posts/research-vs-development/
- Core idea: research and development are different jobs. Research discovers what "good" looks like; development executes once that target is clear and checkable.
- Useful framing:
  - Research output is knowledge, not shipped code.
  - Development work is legible, decomposable, and checkable.
  - Autonomous coding-agent factories converge on a target, but they do not reliably invent the target.
  - The better the team knows what good looks like, the longer the leash it can give an agent.
- Blog use: supports the claim that specifications convert research into development by making the target explicit.

### The Feedback Principle

- URL: https://specdriven.com/first-principles/feedback-principle
- Core idea: the sooner feedback is detected, the cheaper it is to deal with.
- Useful framing:
  - A quality function is any activity that provokes feedback.
  - Shifting left means moving quality functions earlier in the lifecycle.
  - Specifications can provoke feedback before code exists.
  - Verification asks whether the system is built right; validation asks whether the team is building the right system.
- Blog use: supports the claim that specifications are not static documents; they are early feedback devices.

## Draft thesis

Research discovers what good looks like. Specifications make that definition inspectable. Development executes against it. Feedback keeps the system honest.

## Follow-up questions

- What would a minimal useful spec template look like for AI-agent implementation?
- How much uncertainty should remain in a spec before a task is safe to hand to an agent?
- How can teams distinguish research-stage work from development-stage work in day-to-day planning?
