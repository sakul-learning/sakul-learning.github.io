---
layout: post
title: "Friction Is the Roadmap"
summary: "Lessons from turning a small deterministic Hermes cron job into a native Discord-thread PR review system, one observed failure at a time."
tags: [ai-agents, hermes-agent, github, automation, pr-review]
source_folder: sources/pr-review-poller-lessons
sources:
  - title: "hermes-pr-reviewer commit history"
    url: "local:/data/repos/hermes-pr-reviewer"
    note: "Commit timeline from ce17c71 through 33a0bbc on the live gateway-native-reviews branch."
  - title: "Hermes PR reviewer framework README"
    url: "local:/data/repos/hermes-pr-reviewer/README.md"
    note: "Current invariants, split Discord delivery, trust policy, and deterministic state semantics."
  - title: "Gateway-native PR reviews design"
    url: "local:/data/repos/hermes-pr-reviewer/docs/gateway-native-reviews-design.md"
    note: "Design notes for replacing headless cron review sessions with native gateway thread sessions."
  - title: "Operations runbook"
    url: "local:/data/repos/hermes-pr-reviewer/docs/operations.md"
    note: "Current install, smoke-test, cron, rollback, and GC operations."
  - title: "Hermes session history"
    url: "local:session_search"
    note: "Relevant sessions: 20260604_124729_f16ec85a, 20260604_160229_59ef54, 20260605_033506_6e0d0209, 20260606_083916_f77ee56c, 20260608_122926_8ea533f1, 20260611_090357_fd01e311, 20260611_183121_07585cdf."
  - title: "Discord screenshot: persistent PR review threads"
    url: "/assets/images/pr-review-persistent-discord-threads.png"
    note: "Redacted mobile screenshot of #cdk-terrain-reviews showing per-PR Discord thread previews retaining review context."
  - title: "CDK Terrain PR #243"
    url: "https://github.com/open-constructs/cdk-terrain/pull/243"
    note: "Release-please automation review thread where follow-up dry runs, simulated merges, and release-policy experiments turned human questions into concrete verification."
---

## Working thesis

The biggest lesson from building this PR review poller is not that we found the perfect architecture up front. We did not.

The lesson is that a Hermes-based automation loop can be made **small, observable, and self-correcting enough that the architecture can evolve while it is already doing useful work**. The system started as a deterministic, agentless cron wrapper around trusted PR deltas. Within a few days it had split Discord channels, package-manager-aware review environments, workflow-security baseline scans, Kanban breadcrumbs, a weekly garbage collector, and finally a gateway-native Discord-thread runtime.

None of those changes required a rewrite-first pause. They were added because real reviews exposed friction, and the feedback loop was tight enough to fix the friction minutes or hours after observing it.

That is the interesting part.

## Start boring: a deterministic gate before any agent work

The first version was deliberately unglamorous.

It was a script-only Hermes cron job named `trusted-pr-review-poller`. The cron schedule matched the human awake window: every 30 minutes from 06:00 through 23:30 GMT+7, expressed as:

```cron
*/30 0-16,23 * * *
```

The important design choice was that this was **not** an LLM-driven cron job with a prompt saying “check for PRs.” It was `no_agent=true`. If there was no trusted delta, the script printed nothing. Empty stdout meant no Discord message and no model invocation.

That gave us a simple trust boundary:

- known repository,
- known trusted author,
- non-draft PR,
- changed head SHA or new trusted comment,
- only then prepare a worktree and invoke Hermes for review.

Untrusted PRs were handled deterministically. The poller listed them in Discord with a whitelist instruction, but it did not check them out, run tests, or ask the agent to reason over their code. Untrusted comments were fenced with explicit `UNTRUSTED_AUTHOR` markers and treated as inert evidence.

The first shipped commit, `ce17c71 feat: add deterministic Hermes PR review poller`, encoded the core idea: **use code to decide whether an agent is allowed to exist for this PR at all**.

That is still the foundation of the current system.

## The first production lessons were state-machine lessons

Once the poller was live, the first problems were not “AI quality” problems. They were state and scheduling problems.

Untrusted PR alerts were useful once and noisy every 30 minutes. So the poller learned `notified_untrusted_pr` state and stopped re-posting the same warning forever. That became `b42fe97 fix: suppress repeated untrusted PR alerts`.

Cron overlap was another boring-but-real failure mode. A real review can take longer than a polling interval. The wrapper therefore gained locking so a second run would not start while the first was still reviewing. That became `a829a06 fix: prevent overlapping cron poller runs`, followed by ignoring lock files in `39cb49e`.

The cron script timeout also had to be made explicit. The system was script-only in the scheduler, but a trusted delta could legitimately invoke `hermes chat` from inside the script. The default script timeout was too short for real code review, so the operational docs now call out:

```bash
hermes config set cron.script_timeout_seconds 1800
```

That is a recurring theme: most “agent reliability” work was actually **automation reliability** work.

## Channel-per-repo forced the first architecture split

The next request was social, not technical: cdk-terrain reviews and Skillrig reviews should not all land in the same Discord thread.

That exposed a constraint in the first design. A Hermes cron job has one delivery target. If each repository family needs its own Discord channel, the simplest correct design is not clever routing inside one cron; it is one bucket per cron:

- `cdk-terrain-pr-review-poller` → `#cdk-terrain-reviews`
- `skillrig-pr-review-poller` → `#skillrig-reviews`

So the single aggregate config/state split into:

```text
config/cdk-terrain-pr-reviewer.config.json
config/skillrig-pr-reviewer.config.json
state/cdk-terrain-pr-reviewer.state.json
state/skillrig-pr-reviewer.state.json
```

The legacy aggregate cron was paused. Bucket-specific wrappers got bucket-specific lock files. Smoke runs confirmed both wrappers exited cleanly with no output when there was nothing to do.

That was `7f80495 chore: split PR review poller by repo bucket`, followed by `38d8936 chore: update split poller smoke-run state`.

The lesson was not “always build multi-tenant routing.” The lesson was the opposite: **a small split was cheaper than inventing a routing abstraction before we needed one**.

## The review environment had to become part of the product

The first real code-review failures were not always PR defects. Sometimes the reviewer environment was wrong.

One cdk-terrain review failed because the worktree did not have the expected Node tooling. `yarn`, `jest`, `lerna`, and `nx` existed in the prepared workspace, but the review worktree and prompt environment did not expose them correctly. The failure looked like a PR problem until the environment was inspected.

The fix was to make environment preparation deterministic and visible before invoking the agent:

- include configured `PATH` and `TMPDIR`,
- link or prepare dependencies from the trusted workspace when appropriate,
- trust the repo `mise.toml`,
- run preflight commands,
- inject the preflight result into the review prompt.

That immediately changed review quality. Instead of the agent guessing whether `yarn: command not found` was a project failure, the poller made the environment state explicit.

Then cdk-terrain started migrating from Yarn to pnpm. A static list of `yarn ...` checks was no longer enough. The poller learned to detect the package manager from `package.json#packageManager` first, then lockfiles, and translate configured check templates accordingly:

- `pnpm exec ...` for pnpm,
- `yarn ...` for Yarn,
- `npm ci` / `npx --no-install ...` for npm,
- Bun support where applicable.

That shipped as `a48038b fix: use detected package manager in PR reviewer`.

The key implementation detail was not just package-manager detection. It was **package-manager detection at the PR worktree head**. A migration PR can add and remove lockfiles in the same diff. If the reviewer assumes the base branch’s package manager, it reviews the wrong project.

## Draft PRs taught us not to confuse “open” with “ready”

GitHub’s `gh pr list --state open` includes draft PRs.

The poller already requested the `isDraft` field, but an early version did not skip drafts before trust checks and review-job creation. That caused a draft package-manager migration PR to be reviewed before it was ready.

The fix was simple and correct: skip drafts before any of this happens:

- trust checks,
- untrusted PR alerts,
- comment scanning,
- worktree preparation,
- agent review job creation.

That became `1b692bc fix: skip draft PRs in reviewer poller`.

The lesson was subtle: **a trust allowlist is not a readiness signal**. A trusted author can still have a draft PR.

## Avoiding self-trigger loops required explicit semantics

Another early rule was that self-authored PRs should not trigger review just because the bot’s own branch moved.

For example, `sakul-learning` may push a PR that is part of the automation workflow itself. Reviewing every self-authored head change can create a noisy loop. But if a different trusted maintainer comments and asks for attention, the system should respond.

So state semantics became more precise:

- `last_seen_head_sha` tracks what the poller observed,
- `last_reviewed_head_sha` tracks what Hermes reviewed,
- `seen_comment_ids` tracks comment deltas,
- `self_pr_authors` suppress head-SHA-only triggers,
- a new comment from another trusted author can still trigger a review.

That difference between “seen,” “reviewed,” and “human-requested” made the automation much easier to reason about.

The same concern later showed up in review comments: assistant/reviewer comments must not trigger a fresh review run. The framework gained tests for that in `769f039 test: prevent reviewer comments from retriggering reviews`.

## Rules and memories became part of the control surface

Some improvements were code. Others were policy.

As the system reviewed real PRs, review rules accumulated on top of the deterministic gate:

- read the PR body and the full trusted comment thread before verdicts,
- distinguish reviewer-environment failures from PR defects,
- do not expose irrelevant local paths/tooling in public PR comments,
- prefer small, targeted cdk-terrain PRs sized for reviewability,
- flag excessive SpecLedger or Markdown churn for cleanup or splitting,
- do not manually edit generated changelog files,
- use `/data` temp dirs for cdk-terrain tests,
- use the repo’s package manager instead of `npx` in pnpm-managed repos.

These rules live partly in repo-specific review files and partly in durable memory. They are not a substitute for code, but they are part of the automation’s behavior.

A useful pattern emerged:

1. A review makes a mistake or misses context.
2. The human corrects the behavior.
3. The correction becomes a durable rule or memory.
4. The next review starts with that constraint already present.

That is why the system feels self-correcting. The implementation changes quickly, but so does the reviewer’s operating policy.

## The real power showed up in asynchronous engineering loops

One of the nicest surprises was not just that the reviewer could catch bugs. It was that it fit the way software engineering actually happens, especially when you are away from the machine.

Engineering work does not only happen while you are sitting at the desk, deliberately “working on the problem.” A lot of it happens after you walk away. You are on the road, shopping, travelling, waiting in line, or doing something completely unrelated. Your mind keeps processing the tradeoffs in the background. A sharper question appears at exactly the moment when opening the laptop would be friction.

The useful system is the one that is still at your fingertips in that moment.

Instead of waiting until you are back at a workstation, rebuilding the context, finding the repo, checking out the PR, and writing a reproduction plan, you can leave a short note in the persistent review thread from your phone: “Can we simulate this?” or “What would happen if this merged?” or “Does this theory hold?” Then you can put the phone away and continue shopping, travelling, or living your life.

When you come back, the reviewer has not merely acknowledged the note. It has played out the scenario: what it tested, what it changed temporarily, which commands it ran, what failed, what passed, and what it observed.

`open-constructs/cdk-terrain` PR [#243](https://github.com/open-constructs/cdk-terrain/pull/243) was a good live example. The PR added `release-please` automation for versioning and release PR generation. The static review mattered, but the more interesting value came from this mobile, asynchronous follow-up loop in the PR thread:

- run `zizmor` against the new privileged workflow and suggest pinned action SHAs,
- notice a possible double-owner problem between `release-please` and the existing `release.yml` tag/GitHub-release path,
- simulate `release-please release-pr --dry-run` as if the PR had already landed on `main`,
- discover that manifest mode was generating `chore: release main`, which would likely fail the repo’s semantic PR-title gate,
- rerun the dry run after the fix and verify `chore(release): release v0.23.4`,
- inspect the scary-looking `updates: 7` output and show that missing optional files were skipped rather than newly created,
- add synthetic conventional commits in a temporary main-based workspace to test the pre-`1.0.0` policy,
- confirm the configured skip labels appeared on the generated release PR object.

That pattern is real usefulness. The human did not have to turn every concern into a full local reproduction plan before asking. The reviewer already had the repository, the PR, the prior comments, the worktree, and the rule context. It could make a temporary clone, simulate the merge, run the dry run, compare the result to the repo’s policy, and report back in the same persistent thread.

> The result was a better understanding of the change than either a one-shot review or green CI alone would have provided.

PR #243 evolved from “add release automation” into a much more precise release-process design: one owner for GitHub releases, release PR titles that satisfy existing lint gates, explicit skip labels, and a deliberate pre-v1 versioning policy.

## Spend trust slowly, especially in public

Another important lesson was social rather than technical: **do not let an automated reviewer comment publicly too early**.

A few bad PR comments are enough to label the whole system as low quality. Maintainers are already flooded with low-effort AI output, generated summaries, bot comments, noisy CI, and notifications that look useful until they are not. People learn to filter that noise the way they filter ads on a website: quickly, almost subconsciously, and with very few second chances.

That changed how the system should earn trust. The main development loop stayed in the back channel: Discord review threads, maintainer discussion, dry runs, failed experiments, and rule changes. GitHub PR comments became the selected output surface, not the raw workbench.

That distinction mattered. Some observations were genuinely useful and were well received: release-process hazards, workflow-security findings, package-manager mismatches, title-lint failures, or concrete simulation results. But they landed better because the system had already done the messy work privately. The public comment could be concise, specific, and backed by verification instead of being the first place the reviewer tried to think out loud.

The trust model therefore has two layers:

- **Back-channel iteration:** run the reviewer, inspect its output, ask follow-up questions, fix rules, improve prompts, rerun checks, and let the system be wrong while it is still learning.
- **Public surfacing:** post only the subset that is actionable, grounded, and worth a maintainer’s attention.

This is also why the Discord-thread migration mattered. It did not merely improve UX for us. It created a safe place for the reviewer to develop judgment before spending public maintainer attention on GitHub.

## Advanced checks were easy because the gate was already clean

Once the trust/delta/worktree pipeline existed, adding a workflow-security scan was surprisingly small.

The desired behavior was:

- if a PR changes `.github/workflows/**`, run `zizmor` on the merge-base version and the PR-head version,
- compare baseline findings against head findings,
- flag findings that are new or on touched workflow lines,
- inject the report into the review prompt,
- do not auto-post a separate zizmor comment unless explicitly configured.

That became `a8a0e65 feat(poller): zizmor workflow security scan + base-branch refresh fix`.

The most important bug found during that work was not in zizmor. It was in git freshness. The poller was creating or reusing worktrees without first refreshing `origin/<base_branch>` in the base workspace. A stale base made merge-base diffs explode: one PR looked like it touched 145 files when the real current diff was much smaller.

The fix was to fetch the base branch before worktree prep and before diffing. The scan also needed stable fingerprints: absolute temp/worktree paths had to normalize down to `.github/workflows/foo.yml`, otherwise the same baseline finding looked different between scans.

Because the deterministic gate already produced a prepared worktree, a PR number, a base branch, and a review prompt, the security scan could be inserted as one more preflight note. This is the compounding payoff of the simple architecture.

## Kanban helped, but not as the restart mechanism

Kanban was added as optional structured tracking for review tasks in `c071ffc feat: opt-in kanban task tracking for PR reviews`.

The initial intuition was that Kanban might help with restart durability. The gateway-native design clarified the boundary: Hermes sessions and transcripts already provide the native restart and continuity mechanism. Kanban is better used as compressed, structured ground truth:

- PR key,
- verdict,
- checks,
- decisions,
- outstanding blockers,
- links to posted comments.

That is valuable because long review threads get compressed. The original SQLite transcript remains searchable, but the active context may only retain summaries. A Kanban task gives the agent a compact, reset-proof seed when a later round needs to resume the same PR without carrying every old token forward.

Even here, real usage found bugs: `--board` was a global Kanban flag and had to precede the subcommand. The wrong ordering silently operated on the active board and left tasks stuck. That got fixed with tests.

## The headless cron design hit a real UX ceiling

The cron design worked, but it had a ceiling.

A trusted delta invoked `hermes chat` headlessly from inside a script. That produced a final Discord message, but it did not feel like a native Discord review session. There were no streamed progress bubbles, no interactive approval cards, and no natural way for a human reply in the review thread to continue the same session.

The stopgap was to clean the output with `hermes chat -Q`, add a scoped `yolo` toggle to avoid approval stalls for known-safe review subprocesses, and keep hardline-destructive commands blocked.

That was useful, but it was clearly a workaround.

So the design shifted: keep the deterministic poller, but run the review turn inside the Hermes gateway as a native Discord-thread session.

## The gateway rewrite was deliberately not a plugin

A Hermes plugin was considered. The smaller diff won.

The current branch, `gateway-native-reviews`, hosts the poll loop as a `gateway:startup` filesystem hook:

```text
gateway-hook/HOOK.yaml
gateway-hook/handler.py
```

The hook starts a background poll task when the gateway starts. Each tick:

1. reuses the same deterministic scan and heavy prep code from `bin/pr_review_poller.py`,
2. opens or reuses a per-PR Discord thread under the repo’s review channel,
3. marks the delta dispatched before running the session,
4. saves state under the same flock the cron wrappers use,
5. injects the review prompt as an internal `MessageEvent`.

This shipped in `124674d feat(gateway): host the PR-review poller as a gateway:startup hook`.

The choice not to write a full plugin is important. The hook is not the final possible architecture. It is the smallest architecture that removed the actual friction:

- reviews now run as native Discord-thread sessions,
- progress can stream in the thread,
- approval cards can be handled by the gateway,
- later human replies can continue the same session,
- the deterministic poller code did not need to be reimplemented.

![Mobile Discord screenshot of persistent PR review threads in the cdk-terrain review channel. The unread badge and internal task id are redacted.](/assets/images/pr-review-persistent-discord-threads.png)

The screenshot captures the behavior the rewrite was aiming for: the review channel stays clean, while each PR gets a persistent thread that holds prior review results, verification notes, task updates, and later human follow-up. New PRs still announce themselves in the channel, but the working context accumulates in the per-PR thread instead of being scattered across cron outputs.

That is YAGNI applied correctly: do not build the plugin abstraction until the hook becomes the bottleneck.

## The gateway migration found Discord-specific edge cases immediately

The first gateway implementation worked in principle, then Discord reality arrived.

First, the helper path for creating a handoff thread produced a private thread. The smoke-test thread existed, but only the bot could see it. The fix was to seed a message in the parent channel and create the thread from that message, which creates a public Discord thread. That became `d5285cb fix(gateway-hook): create PUBLIC per-PR threads via seed message`.

Second, human replies in hook-created threads were silently dropped unless the bot was mentioned. The Discord adapter only processes bare thread messages in threads recorded by its persisted participation tracker. Threads created by the hook bypassed the adapter’s normal marking path. The fix was to explicitly mark created threads as participated. That became `b9e493c fix(gateway-hook): mark created threads as participated`.

Those are the kinds of details that do not show up in an architecture sketch. They show up only when the system is live.

## The current state is intentionally still evolving

The live branch is not the end of the story. It is a major rewrite in progress:

```text
33a0bbc feat(gateway-hook): onboard skillrig/cli reviews
b9e493c fix(gateway-hook): mark created threads as participated
d5285cb fix(gateway-hook): create PUBLIC per-PR threads via seed message
124674d feat(gateway): host the PR-review poller as a gateway:startup hook
```

The old split crons are paused for repos owned by the hook. The same bucket configs and state files remain useful. The hook and cron wrappers share flock paths so they cannot race if both are accidentally enabled.

This is a good intermediate shape:

- deterministic gates remain scriptable and testable,
- review execution moves into native Discord sessions,
- repo-specific rollout can happen one bucket at a time,
- rollback is still simple: remove the hook symlink, restart the gateway, resume the cron.

## What made iteration fast

Several properties made the system easy to evolve.

First, the core was deterministic. Trust classification, draft filtering, delta detection, and state updates were ordinary Python code with tests. The agent was only invoked after those checks passed.

Second, no-op was silent. A healthy system produced no Discord noise when nothing changed. That made real alerts meaningful.

Third, the state was explicit. PR entries recorded seen heads, reviewed heads, comments, untrusted notifications, Discord thread IDs, and dispatch mode. When something looked wrong, we could inspect and patch a small JSON state machine instead of guessing.

Fourth, every observed failure became either a test, a runbook note, a memory, or a rule. Draft PR reviewed? Add a test. Reviewer comment retriggered review? Add a test. Merge-base stale? Fetch base before worktree prep. Discord thread private? Change the creation path. Trusted comments changed the review verdict? Store a durable reminder to read full comment threads.

Fifth, the system used the human feedback channel as part of development. A bad review, a missing preflight, or a noisy alert was not just a bug report. It was a concrete example that could be turned into code while the context was fresh.

Sixth, the evolution was not only reactive one-PR-at-a-time debugging. Claude Code was used as a dynamic workflow engine to review batches of several days of Hermes sessions, looking for recurring failure modes and leverage points. Those batch reviews surfaced improvement themes across the Discord gateway integration, memory system, review prompt/rules layer, and LLM API-call reliability. In other words, the agent was not just improving the PR poller; it was continuously studying the work it had been receiving and adapting Hermes itself to fit that workload.

That meta-loop mattered. Individual incidents produced tactical fixes, but multi-day session reviews produced architectural direction: move review turns into gateway-native Discord threads, make memory/rules more explicit, reduce failed or wasted LLM calls, and keep tightening the boundary between deterministic automation and model reasoning.

## The practical lesson

The architecture that worked was not “agent does everything.” It was:

```text
deterministic poller
  -> explicit trust and readiness gate
  -> prepared, observable review environment
  -> repo-specific rules and memory
  -> agent review only when useful
  -> native human feedback loop
```

That division matters. Deterministic code should decide whether a review is allowed and prepare the evidence. The agent should spend its reasoning budget on the code review itself, not on discovering whether it should have been invoked.

The most encouraging result is how quickly the system absorbed new requirements. Dedicated Discord channels, package-manager migration support, zizmor baseline scans, Kanban breadcrumbs, and gateway-native thread sessions all arrived after the initial cron was already useful.

That is the real lesson: **build the smallest safe automation loop, make its state visible, and keep the loop short enough that production observations can become improvements before they become process debt**.
