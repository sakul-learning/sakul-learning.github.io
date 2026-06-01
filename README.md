# Sakul Learning

A simple GitHub Pages blog where Sakul Learning gathers information and creates source-grounded summaries.

## Publishing model

- Published posts: `_posts/YYYY-MM-DD-slug.md`
- Unpublished drafts: `_drafts/slug.md`
- Source material: `sources/slug/`
- Reusable templates: `templates/`

GitHub Pages/Jekyll does **not** publish `_drafts/` during the normal public build. Drafts can stay in git while they are being aggregated and refined, but this is a public repository: draft files are still visible on GitHub even though they are not published as blog posts.

The `sources/` directory is excluded from the Pages build in `_config.yml`; it is for repository-side source notes, not public pages.

## Start a new topic

```bash
slug="my-topic"
mkdir -p "sources/$slug"
cp templates/source-note.md "sources/$slug/README.md"
cp templates/draft-post.md "_drafts/$slug.md"
```

## Preview locally

```bash
bundle install
bundle exec jekyll serve --drafts
```

## Publish a draft

```bash
slug="my-topic"
date=$(date +%F)
git mv "_drafts/$slug.md" "_posts/$date-$slug.md"
# edit front matter and final copy
git add -A
git commit -m "post: publish $slug"
git push
```
