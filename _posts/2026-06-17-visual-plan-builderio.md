---
layout: post
title: "/visual-plan: turning agent plans into reviewable artifacts, not chat essays"
summary: "Steve Sewell's new skill for Claude Code and Codex converts text-heavy planning output into interactive MDX review documents — wireframes, prototypes, diagrams, and comment threads — because a wall of Markdown in your terminal is a terrible way to make architectural decisions."
tags: [ai-agents, tooling, planning, codex, claude-code, mdx, builderio]
---

[Steve Sewell](https://x.com/Steve8708) (Builder.io) shipped something yesterday that solves a problem every coding-agent user knows:

> *"Plan mode in Claude Code is incredible. But I always find my eyes glazing over when it gives me this huge markdown essay in my terminal."* — [@Steve8708](https://x.com/Steve8708/status/2066906454704218337)

The thread hit 1,500 likes and 2,500 bookmarks in under a day, and the reason is obvious: **agents are great at writing plans, but terrible at presenting them for human review.**

### What it does

`/visual-plan` — a slash command for Claude Code and Codex — takes an agent's text plan and converts it into an **interactive MDX review document** with custom components:

- **Architecture diagrams** — spatial layouts for data flow, layers, dependencies
- **Wireframe canvas** — multi-artboard UI mockups with before/after states
- **Interactive prototypes** — clickable functional prototypes in a top visual tab
- **File maps** — grounded in real repo files, not invented paths
- **Annotated code** — code blocks with reviewer callouts
- **API specs & schema maps** — structured endpoint and data-model blocks
- **Open questions** — a single bottom form for unresolved decisions
- **Threaded comments** — with precise anchors (coordinate, node-id, or text-quote)

The whole thing lives at a shareable URL, rendered by the free, open-source [Agent-Native Plans app](https://plan.agent-native.com). Or you can run it in local-files mode where nothing leaves your machine.

### The discipline

What makes this more than a pretty Markdown renderer is the **plan discipline** baked into the skill's 473-line SKILL.md:

- **The plan is the approval gate.** No code edits before sign-off.
- **Research before drafting.** Real files, real symbols, real data shapes. Delegate wide exploration.
- **Decide hard-to-reverse bets first.** Wire format, public IDs, data-model shape, auth boundaries.
- **Never inline.** The deliverable is always the structured MDX document — never chat prose.
- **Standalone plans.** No "unlike the previous version" language. A reader who never saw the chat should understand the plan.

The skill even includes an **adversarial self-review pass**: for high-stakes plans, it spawns a skeptical reviewer whose only job is "find what is weak, missing, or wrong — not to praise."

### Three surfaces, chosen by task

Not every plan needs a prototype. The skill picks the right review surface:

| Surface | When |
|---|---|
| **Document only** | Architecture, backend, data migration, API contracts |
| **Canvas** | Static screens, before/after comparisons, component states |
| **Canvas + prototype** | Multi-step flows, wizards, navigation changes |
| **Prototype-first** | When interaction *is* the question |

### The bigger picture

This is part of [BuilderIO/skills](https://github.com/BuilderIO/skills) — an open-source collection of agent skills that now sits at 764 stars. The pattern is worth paying attention to: **tool-augmented planning surfaces that make agents reviewable, not just executable.**

The insight Steve's landing is simple but powerful: a text plan and a visual plan serve different readers. The agent writes for itself. The visual plan writes for the reviewer. And when you're making architectural decisions that are expensive to undo, the difference between "I skimmed the Markdown" and "I clicked through the prototype and left three comments" is everything.

---

**Install:** `npx @agent-native/skills@latest add --skill visual-plan`

**Repo:** [github.com/BuilderIO/skills](https://github.com/BuilderIO/skills)

**Viewer:** [agent-native.com](https://www.agent-native.com/docs/template-plan) (free, open source)
