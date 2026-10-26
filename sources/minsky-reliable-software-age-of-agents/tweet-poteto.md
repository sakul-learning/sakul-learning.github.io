---
source_url: https://x.com/poteto/status/2114626630429913383
title: "lauren (@poteto) — five bullets on improving a codebase for agents"
author: "@poteto (lauren)"
published: 2026-10-26
retrieved: 2026-10-26
metrics_at_retrieval: "~154k views, ~1.7k likes, ~2.7k bookmarks, ~104 replies"
---

# Post text

> so many gems and great tips in this talk from @yminsky about how to improve your codebase for agents
>
> • agents thrive on feedback, and types are one of the best kinds
> • make illegal states unrepresentable with types, and it enforces global rules across your codebase
> • property based tests, fuzzing, and even full-system deterministic simulation testing
> • expect tests: just print stuff out and capture it in the test. makes behavior legible. it's very similar to how compilers have fixture tests, it reduces the review surface area
> • formal methods used to be very expensive: seL4 is about 8,700 lines of C and took around 25 person-years, with 23 lines of proof for every line of C code, but agents change the roi
>
> https://www.youtube.com/watch?v=rUYP4C29yCw

# Notes

- This is how the talk surfaced for us: the tweet links the YouTube video, which is how we found it.
- The recap covers the talk's tooling half (types, tests, formal methods). It does not cover the code-review half, which is where Minsky spends 33:46–45:35 and argues review is the most important human job in the loop.
- "full-system deterministic simulation testing" flattens Minsky's actual emphasis: the differentiated claim is *library-level* deterministic simulation (millisecond feedback, composable fake services). Antithesis-style full-system is something they also do, listed among the ordinary arsenal.
- "reduces the review surface area" is the right instinct; the talk's argument is sharper: the agent's diff arrives as a change to the logic *plus* the induced change to the traces, so the reviewer reads both at once.
