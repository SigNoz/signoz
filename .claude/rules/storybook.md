---
paths:
  - "frontend/src/**/*.tsx"
---

# Storybook

Page stories are written with the `signoz-page-story` skill ([`.claude/skills/signoz-page-story/SKILL.md`](../skills/signoz-page-story/SKILL.md)); the API surface is [`frontend/src/storybook/README.md`](../../frontend/src/storybook/README.md).

- **A UI change lands with its story.** Any change that alters what a page renders — a new page, a new state, a new branch, a changed layout — updates the story of every page that renders it, or creates one where the page has none. Go through the `signoz-page-story` skill; never hand-write a page story outside it.
- **New page, new story. New state, new control or variant.** The skill decides which: a control on a response, a variant worth linking to, or a `play` story for a state only a click reaches.
- **A shared component is covered through its pages.** A change under `components/` or `container/` with no story of its own updates the stories of the pages that render it.
- **Already covered, say so.** When the existing story and its controls already reach the changed state, no story edit is needed; state that in the PR description.
- **Opt out only when there is no visual diff.** Skip stories only when the change renders nothing differently: types, api clients, hooks with no UI branch, tests. Deleting a page deletes its stories.
- **Prove it with a visual diff when asked.** Before/after screenshots and "did this touch other screens" go through `sbshot-visual-diff`, which can only show what a story renders.
