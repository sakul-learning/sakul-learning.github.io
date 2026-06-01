---
layout: page
title: Draft Workflow
permalink: /workflow/
---

## Source-first workflow

1. Create a topic folder under `sources/<topic-slug>/`.
2. Add source notes as Markdown files, one file per source or cluster of sources.
3. Start an article in `_drafts/<topic-slug>.md` using `templates/draft-post.md`.
4. Keep improving the draft as sources accumulate.
5. Publish only when the source material is sufficient by moving the draft to `_posts/YYYY-MM-DD-<topic-slug>.md`.

## Drafts are not published

Jekyll ignores `_drafts/` during the normal GitHub Pages build. That means draft posts can be committed to the repo without showing up on the public site as blog posts. Since this repository is public, committed draft files are still visible on GitHub; treat `_drafts/` as an unpublished-public staging area, not secret storage.

For local preview, run a Jekyll build/server with drafts enabled:

```bash
bundle exec jekyll serve --drafts
```
