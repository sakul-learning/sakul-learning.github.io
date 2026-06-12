---
layout: post
title: "Friction Is the Roadmap"
summary: "Lessons from turning a small deterministic Hermes cron job into a native Discord-thread PR review system, one observed failure at a time."
tags: [ai-agents, hermes-agent, github, automation, pr-review]
---

## Working thesis

The biggest lesson from building this PR review poller is not that we found the perfect architecture up front. We did not.

The lesson is that a Hermes-based automation loop can be made **small, observable, and self-correcting enough that the architecture can evolve while it is already doing useful work**. The system started as a deterministic, agentless cron wrapper around trusted PR deltas. Within a few days it had split Discord channels, package-manager-aware review environments, workflow-security baseline scans, a weekly garbage collector, and finally a gateway-native Discord-thread runtime.

None of those changes required a rewrite-first pause. They were added because real reviews exposed friction, and the feedback loop was tight enough to fix the friction minutes or hours after observing it.

That is the interesting part.

## How the architecture evolved

Every step in the architecture came from a concrete piece of friction, not a design document. The pattern was always the same: ship the smallest correct thing, watch it fail in production, and let the failure dictate the next move.

**Start boring: a deterministic gate.** The first version was deliberately unglamorous — a script-only Hermes cron job, `no_agent=true`, scheduled to the human awake window. It was **not** an LLM cron job with a prompt saying "check for PRs." If there was no trusted delta, the script printed nothing, and empty stdout meant no Discord message and no model invocation. That gave a simple trust boundary: known repository, known trusted author, non-draft PR, changed head SHA or new trusted comment — only then prepare a worktree and invoke Hermes. Untrusted PRs were listed deterministically but never checked out or reasoned over. The core idea, still the foundation today: **use code to decide whether an agent is allowed to exist for this PR at all.**

**The first production failures were state-machine failures, not AI-quality failures.** Untrusted PR alerts were useful once and noisy every 30 minutes, so the poller learned to suppress repeats. A real review can outlast a polling interval, so the wrapper gained locking to prevent overlapping runs. The default cron script timeout was too short for real code review, so it had to be raised explicitly. The recurring theme: most "agent reliability" work was actually **automation reliability** work.

**The first architecture split was social, not technical.** cdk-terrain and Skillrig reviews should not land in the same Discord thread, and a Hermes cron job has one delivery target. The simplest correct design was not clever routing inside one cron — it was one bucket per cron, each with its own config, state, and lock file. The lesson was the opposite of "always build multi-tenant routing": **a small split was cheaper than inventing a routing abstraction before we needed one.**

**The review environment had to become part of the product.** Some early failures were not PR defects — the reviewer environment was wrong. A cdk-terrain review failed because the worktree did not expose `yarn`/`jest`/`lerna`/`nx` correctly; it looked like a PR problem until the environment was inspected. The fix was to make environment preparation deterministic and visible before invoking the agent — configured `PATH`/`TMPDIR`, prepared dependencies, trusted `mise.toml`, preflight commands, and the preflight result injected into the prompt. When cdk-terrain migrated Yarn → pnpm, a static list of `yarn ...` checks broke, so the poller learned to detect the package manager — and to detect it **at the PR worktree head**, because a migration PR can add and remove lockfiles in the same diff. Assume the base branch's package manager and you review the wrong project.

**Rules and memories became part of the control surface.** Some improvements were code; others were policy. A durable loop emerged: a review makes a mistake or misses context, the human corrects it, the correction becomes a durable rule or memory, and the next review starts with that constraint already present. That is why the system feels self-correcting — the implementation changes quickly, but so does the reviewer's operating policy.

**Advanced checks were cheap because the gate was already clean.** Adding a `zizmor` workflow-security scan — run on merge-base and PR-head, flag new findings, inject the report into the prompt — was surprisingly small. The most important bug found during that work was not in zizmor; it was git freshness. The poller reused worktrees without refreshing `origin/<base_branch>`, and a stale base made merge-base diffs explode: one PR looked like it touched 145 files when the real diff was much smaller. Because the deterministic gate already produced a prepared worktree, a PR number, a base branch, and a review prompt, the scan dropped in as one more preflight note. That is the compounding payoff of the simple architecture.

## The real power showed up in asynchronous engineering loops

One of the nicest surprises was not just that the reviewer could catch bugs. It was that it fit the way software engineering actually happens, especially when you are away from the machine.

Engineering work does not only happen while you are sitting at the desk, deliberately "working on the problem." A lot of it happens after you walk away — on the road, shopping, travelling, waiting in line. Your mind keeps processing the tradeoffs in the background, and a sharper question appears at exactly the moment when opening the laptop would be friction. The useful system is the one that is still at your fingertips in that moment.

Instead of rebuilding context, finding the repo, checking out the PR, and writing a reproduction plan, you leave a short note in the persistent review thread from your phone: "Can we simulate this?" or "What would happen if this merged?" Then you put the phone away. When you come back, the reviewer has not merely acknowledged the note — it has played out the scenario: what it tested, what it changed temporarily, which commands it ran, what failed, what passed, and what it observed.

A `release-please` automation PR was a good live example. The static review mattered, but the real value came from a mobile, asynchronous follow-up loop: simulating the release dry run as if the PR had already landed on `main`, catching a release title that would fail the repo's semantic PR-title gate, spotting a possible double-owner conflict between the new automation and the existing release workflow, and testing the pre-v1 versioning policy in a throwaway workspace. The human never had to turn each concern into a full local reproduction before asking — the reviewer already had the repository, the PR, the prior comments, the worktree, and the rule context.

> The result was a better understanding of the change than either a one-shot review or green CI alone would have provided.

The lessons that generalize from examples like this:

- **The reviewer's standing context is the leverage.** Because it already holds the worktree and prior thread, a one-line question expands into real verification instead of a request for more setup.
- **Asking is cheaper than reproducing.** "Does this theory hold?" becomes a simulated merge, a dry run, and a policy comparison — work the human would otherwise have deferred until back at a desk.
- **Async follow-up changes the design, not just the review.** That PR evolved from "add release automation" into a precise release-process design: one owner for releases, lint-passing release titles, explicit skip labels, and a deliberate pre-v1 policy.

## Spend trust slowly, especially in public

Another important lesson was social rather than technical: **do not let an automated reviewer comment publicly too early.**

A few bad PR comments are enough to label the whole system as low quality. Maintainers are already flooded with low-effort AI output, generated summaries, bot comments, and noisy CI. People learn to filter that noise the way they filter ads on a website: quickly, almost subconsciously, and with very few second chances.

So the trust model has two layers. The main development loop stays in the back channel — Discord review threads, maintainer discussion, dry runs, failed experiments, and rule changes — where the system is allowed to be wrong while it is still learning. GitHub PR comments became the *selected* output surface, not the raw workbench: post only the subset that is actionable, grounded, and worth a maintainer's attention. The useful observations — release-process hazards, workflow-security findings, package-manager mismatches, title-lint failures — landed better precisely because the messy work happened privately first.

This is also why the Discord-thread migration mattered. It did not merely improve UX; it created a safe place for the reviewer to develop judgment before spending public maintainer attention on GitHub.

## Headless cron hit a real UX ceiling

The cron design worked, but it had a ceiling. A trusted delta invoked `hermes chat` headlessly from inside a script. That produced a final Discord message, but it did not feel like a native review session: no streamed progress, no interactive approval cards, and no natural way for a human reply in the thread to continue the same session. Output cleanup and a scoped `yolo` toggle helped, but they were clearly workarounds.

So the design shifted: keep the deterministic poller, but run the review turn inside the Hermes gateway as a native Discord-thread session. A full plugin was considered; the smaller diff won. The poll loop now runs as a `gateway:startup` hook that reuses the same deterministic scan and prep code, opens or reuses a per-PR Discord thread, and injects the review prompt as an internal event. That is YAGNI applied correctly — do not build the plugin abstraction until the hook becomes the bottleneck.

The takeaway is that the theory was the easy part; practice is where the lessons actually lived. The architecture sketch said "run the session in a thread." Reality said otherwise, and only live traffic surfaced it: the helper path created *private* threads only the bot could see, so threads had to be seeded from a parent-channel message to come out public; and human replies in hook-created threads were silently dropped unless the bot was mentioned, because the Discord adapter only processes bare messages in threads it has explicitly marked as participated. Those are the kinds of details that never appear in a design doc and only show up when the system is live.

![Mobile Discord screenshot of persistent PR review threads in the cdk-terrain review channel. The unread badge and internal task id are redacted.](/assets/images/pr-review-persistent-discord-threads.png)

The screenshot captures what the rewrite was aiming for: the review channel stays clean, while each PR gets a persistent thread holding prior review results, verification notes, and later human follow-up.

## The current state is intentionally still evolving

The live branch is not the end of the story. It is a major rewrite in progress. The old split crons are paused for repos owned by the hook, but the same bucket configs and state files remain useful, and the hook and cron wrappers share flock paths so they cannot race if both are accidentally enabled.

This is a good intermediate shape:

- deterministic gates remain scriptable and testable,
- review execution moves into native Discord sessions,
- repo-specific rollout can happen one bucket at a time,
- rollback is still simple: remove the hook symlink, restart the gateway, resume the cron.

## What made iteration fast

Several properties made the system easy to evolve.

First, the core was deterministic. Trust classification, draft filtering, delta detection, and state updates were ordinary Python code with tests. The agent was only invoked after those checks passed.

Second, no-op was silent. A healthy system produced no Discord noise when nothing changed, which made real alerts meaningful.

Third, the state was explicit. PR entries recorded seen heads, reviewed heads, comments, untrusted notifications, Discord thread IDs, and dispatch mode. When something looked wrong, we could inspect and patch a small JSON state machine instead of guessing.

Fourth, every observed failure became either a test, a runbook note, a memory, or a rule. Reviewer comment retriggered a review? Add a test. Merge-base stale? Fetch base before worktree prep. Discord thread private? Change the creation path.

Fifth, the system used the human feedback channel as part of development. A bad review, a missing preflight, or a noisy alert was not just a bug report — it was a concrete example that could be turned into code while the context was fresh.

Sixth, the evolution was not only reactive one-PR-at-a-time debugging. Claude Code was used as a dynamic workflow engine to review batches of several days of Hermes sessions, looking for recurring failure modes and leverage points. Those batch reviews produced architectural direction — move review turns into gateway-native Discord threads, make memory and rules more explicit, reduce wasted LLM calls — rather than just tactical fixes. The agent was not only improving the PR poller; it was continuously studying the work it received and adapting Hermes itself to fit that workload.

## The practical lesson

The architecture that worked was not "agent does everything." It was:

```text
deterministic poller
  -> explicit trust and readiness gate
  -> prepared, observable review environment
  -> repo-specific rules and memory
  -> agent review only when useful
  -> native human feedback loop
```

That division is the whole point. Deterministic code decides whether a review is allowed and prepares the evidence; the agent spends its reasoning budget on the code review itself, not on discovering whether it should have been invoked. Everything that made the system good followed from keeping that boundary clean and the loop short:

- **Friction was the roadmap.** Dedicated Discord channels, package-manager migration support, zizmor baseline scans, and gateway-native thread sessions all arrived *after* the initial cron was already useful, each one prompted by an observed failure rather than a forecast.
- **Visible state made evolution cheap.** Because the core was deterministic and its state was a small, inspectable JSON machine, advanced checks dropped in as one more preflight note instead of a rewrite.
- **The async loop was the real product.** The reviewer's standing context turned a one-line question from your phone into real verification, and that often improved the design of the change, not just its review.
- **Trust is spent slowly.** Let the system be wrong in the back channel; surface to the public only what is actionable, grounded, and worth a maintainer's attention.
- **Theory is nice, practice is better.** The design doc is the easy part. The Discord edge cases, the stale-base diff explosion, the package-manager-at-head detail — those only showed up live, and catching them fast is what made the loop trustworthy.

That is the real lesson: **build the smallest safe automation loop, make its state visible, and keep the loop short enough that production observations can become improvements before they become process debt.**
