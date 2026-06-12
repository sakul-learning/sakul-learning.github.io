# Sources — PR review poller lessons

This source folder tracks local evidence used for `_drafts/pr-review-poller-lessons.md`.

## Local repositories

- `/data/repos/hermes-pr-reviewer`
  - Branch inspected: `gateway-native-reviews`
  - Commit timeline referenced: `ce17c71` through `33a0bbc`
  - Key files:
    - `README.md`
    - `docs/gateway-native-reviews-design.md`
    - `docs/operations.md`
    - `docs/security-model.md`
    - `bin/pr_review_poller.py`
    - `gateway-hook/handler.py`
    - `config/gateway-hook.config.json`

## Session history references

Relevant sessions were found with `session_search`, especially:

- `20260604_124729_f16ec85a` — initial PR reviewer design: trusted repos/authors, script-only cron, awake-window schedule, no LLM on no-op.
- `20260604_160229_59ef54` — split Discord channels and bucket-specific cron/state setup.
- `20260605_033506_6e0d0209` — review-environment fixes after missing package-manager executables.
- `20260606_083916_f77ee56c` — draft PRs being reviewed and subsequent draft filtering fix.
- `20260608_122926_8ea533f1` — zizmor baseline-vs-head workflow scan, stale merge-base fix, and trusted comment-thread memory.
- `20260611_090357_fd01e311` — gateway startup hook monitoring cdk-terrain and skillrig repositories.
- `20260611_183121_07585cdf` — gateway logs / PR 268 pickup verification.

## PR #243 asynchronous verification example

Live GitHub source: https://github.com/open-constructs/cdk-terrain/pull/243

Data captured with `gh pr view 243 --repo open-constructs/cdk-terrain` plus issue/review comment API calls on 2026-06-12:

- PR title: `chore(release): add release-please automation for versioning`
- State: merged
- Files: 4
- Commits: 7
- Issue comments: 11
- Review comments: 0
- Key comment URLs:
  - `https://github.com/open-constructs/cdk-terrain/pull/243#issuecomment-4629307466` — `zizmor` suggested pinned action SHAs for the new privileged release-please workflow.
  - `https://github.com/open-constructs/cdk-terrain/pull/243#issuecomment-4636689716` — reviewer noticed potential double ownership between release-please and existing `release.yml` release creation.
  - `https://github.com/open-constructs/cdk-terrain/pull/243#issuecomment-4637155521` — dry-run/main-merge simulation found release-please would generate `chore: release main`, likely failing the repo PR-title lint.
  - `https://github.com/open-constructs/cdk-terrain/pull/243#issuecomment-4637295116` — rerun after fix verified `chore(release): release v0.23.4` and explained that `updates: 7` did not mean optional missing files would be created.
  - `https://github.com/open-constructs/cdk-terrain/pull/243#issuecomment-4640837588` — follow-up simulations with synthetic `feat` / `feat!` commits verified skip labels and exposed the need for explicit pre-v1 bump policy.
  - `https://github.com/open-constructs/cdk-terrain/pull/243#issuecomment-4640853243` — user applied both pre-major release-please flags and documented the resulting policy.

Session history references for this example:

- `20260607_003143_2ba30f` — PR #243 review after pre-v1 policy update; checks passed and APPROVE verdict.
- `20260606_230527_4e165e` — earlier PR #243 review and release-please automation inspection.
- `20260608_025754_9c7b62` — compacted history noting PR #243 version simulations, temporary main-based workspaces, and comment URLs.
- Editorial refinement on 2026-06-12 — so0k clarified that the key value was not merely asynchronous work at a desk, but being able to leave a mobile note while on the road/shopping/travelling and later return to a fully played-out scenario with tests, commands, and observations.

## Trust-before-public-commenting note

A later editorial note from so0k added an important social lesson: the reviewer should not comment publicly too early. A few low-quality or premature PR comments can cause maintainers to mistrust the whole system. The trusted path was to keep most iteration in Discord/back-channel threads while the system improved, then surface only selected, grounded, actionable findings to GitHub. This preserves maintainer attention in an environment already saturated with low-effort AI output.

## Meta-review / dynamic workflow note

The article also reflects a broader pattern from the Hermes evolution work: Claude Code was used as a dynamic workflow engine to review batches of several days of sessions, identify recurring failure modes, and propose improvements across:

- Discord gateway integration,
- memory/rules behavior,
- review prompt design,
- LLM API-call reliability and failure handling,
- agent behavior fit for the tasks Hermes was actually receiving.

This meta-loop is distinct from one-off PR-review bug fixes: it let the system improve from aggregate usage patterns, not only from individual failures.

## Screenshot asset

- Source screenshot: `/home/vincent/.hermes/image_cache/img_32a2627784b6.jpeg`
- Published draft asset: `/assets/images/pr-review-persistent-discord-threads.png`
- Redactions applied:
  - top-left unread badge / personal notification count
  - internal Kanban task id in the Discord thread preview

The screenshot illustrates the final user-visible behavior: `#cdk-terrain-reviews` receives compact PR thread announcements, and each PR has a persistent Discord thread where review results, verification notes, and later human replies accumulate.
