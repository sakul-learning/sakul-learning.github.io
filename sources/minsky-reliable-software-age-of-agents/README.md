---
source_url: https://www.youtube.com/watch?v=rUYP4C29yCw
title: "Now more than ever: building reliable software in the age of agents"
author: "Ron Minsky (Jane Street, @yminsky)"
venue: "Bug Bash 2026 (Antithesis)"
published: 2026-10-26
duration: "1:06:18"
retrieved: 2026-10-26
discovered_via: https://x.com/poteto/status/2114626630429913383
---

# Section map with timestamps

| Time | Section | Core claim |
| --- | --- | --- |
| 00:00 | Framing | "Now more than ever" — the old-timer cliché, owned deliberately. |
| 01:03 | What Jane Street is | Weird, PL-pilled, AI-pilled; calibrated rigor rather than uniform rigor. |
| 07:07 | Types: the baseline | Type systems delete whole bug classes for free; the level-up is types as design material. |
| 10:08 | XSS example | Make the mistake a type error, not a discipline problem. "Spooky action at a distance." |
| 12:39 | Illegal states unrepresentable | Network-config `command.t` list → record with optional/list fields. |
| 16:00 | Types + agents | Just-in-time context, speed, consistency for stochastic models, human legibility. |
| 18:41 | Testing arsenal | Unit, QuickCheck, AFL, Antithesis, prod/dev side-by-side, historical replay. |
| 19:53 | Expect tests | Print output, capture it in source, review the diff. Drives human understanding. |
| 24:00 | Library-level deterministic simulation | Milliseconds instead of hours; compose fake distributed systems. |
| 26:03 | Defense of example-based tests | Software is brittle; brittleness makes few examples cover a lot. |
| 29:16 | Expect tests + agents | Loop closing; text is the cognitive surface; the Excel duality. |
| 33:46 | Code review: what it's for | Not mainly correctness: best practices, bus factor, simplicity, cross terms, joy. |
| 36:59 | Review with agents | Anthropic C-compiler stunt stalled; agents win the local game, erode non-functional properties. |
| 40:40 | Why review is hard now | Social contract, no learning, attention, reward hacking, quality signals decoupled. |
| 43:54 | Review upsides of agents | Cheaper quality improvements, feature stacks, clarifying tests, oracle, guided walkthrough. |
| 45:35 | Formal methods | seL4 cost anchor; what changed is the ROI, not the love of proofs. |
| 47:46 | Agents in math | Not smarter than experts — "memorized the internet"; pairing specialisations. |
| 49:43 | Directions + risk | Refinement types, differential verification, correct-by-construction, Verus/Rust. |
| 52:27 | Person-oriented frame | Human attention is the scarce resource; maximise leverage and understanding. |
| 54:29 | Q&A | AI code review vs human understanding; dependent types; verifiability constrains design; code vs prose style. |

# Quotable lines (paraphrased from transcript)

- "We're all AI assistants now" — dev tooling without the agent overlay is not doing the job.
- Building AI tooling was "like building a sailboat when the wind's not blowing" — then last November it started blowing.
- Agents "super want to win the video game" — they turn the red light green and don't mind what else they break.
- "It's hard to prove things that are false" — verified code usually has to be fixed while being proved.
- The Anthropic C compiler "did not produce the next LLVM": no type system at all.

# Numbers used

- seL4: 8,700 lines of C, ~25 person-years, ~23 lines of proof per line of C (≈ half a person-day per line).
- Jane Street: ~3,500 people, ~2,000 writing code daily, 200+ trading venues, 45+ countries, ~10% of US equity volume, ~8% of US options, ~20% of European ETFs.
- Memory-safety bugs: ~70% of Google/Microsoft security vulnerabilities.

# Open questions / things to verify before quoting publicly

- The video is billed "Ron Minsky"; the tweet credits @yminsky (Yaron Minsky, Jane Street CTO). Same person, addressed as "Ron" in the room ("Thank you very much Ron").
- The talk was given ~8 weeks after Jane Street started thinking seriously about formal methods.
