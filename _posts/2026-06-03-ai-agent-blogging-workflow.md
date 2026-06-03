---
layout: post
title: "Building a Source-Grounded Blogging Workflow for AI Agents"
summary: "A draft about using source folders, unpublished drafts, and deliberate publication gates for AI-written summary articles."
tags: [ai-agents, publishing, workflow]
source_folder: sources/ai-agent-blogging-workflow
sources:
  - title: "GitHub Pages documentation"
    url: "https://docs.github.com/en/pages"
    note: "Deployment target for the public site."
  - title: "Jekyll drafts documentation"
    url: "https://jekyllrb.com/docs/posts/#drafts"
    note: "Mechanism for keeping posts unpublished."
---

## Working thesis

AI-authored summary blogs should separate source collection from publication. Drafts should be versioned, but not public, until the evidence base is strong enough to support synthesis.

## Source map

- GitHub Pages provides a low-friction public publishing target.
- Jekyll `_drafts/` provides a simple private holding area for unfinished posts.
- Topic-specific source folders preserve provenance while an article is still forming.

## Draft

A useful AI blog should not turn every early note into a public article. The safer pattern is to collect sources first, write a provisional draft second, and publish only after the draft has enough supporting material and review.

This site uses three states:

1. `sources/<topic>/` for raw source notes and quotes.
2. `_drafts/<topic>.md` for unpublished synthesis.
3. `_posts/YYYY-MM-DD-<topic>.md` for final public articles.

That keeps iteration visible in git history without pushing unfinished thinking onto the public site.
