# Turning the inventory into controls

Every row of the inventory becomes a control, a global control that already
exists, or a documented reason it cannot be one.

## Imports

Paths written as `src/storybook/...` in prose are repo paths, not import
specifiers. Stories import through the `@/` alias (`@/*` → `./src/*`); modules
inside `src/storybook/` import each other relatively.

| Import | From |
| --- | --- |
| `toggleControl`, `countControl`, `choiceControl`, `multiChoiceControl` | `../controls/controls` |
| `defineStoryMocks`, `storyMocks` | `../controls/defineStoryMocks` |
| `PageStoryArgs` | `../controls/resolveStoryMocks` |
| `MockRequest`, `MockResponse` | `../controls/types` |
| `withAppLayout` | `@/storybook/decorators/withAppLayout` |
| the page's mocks, from the story | `./<Page>.stories.mocks` |
| `queryRangeV5ScalarResponse`, `queryRangeV5RawResponse`, etc. | `@/storybook/msw/__story_mockdata__/queryRange` |

## Which builder

`src/storybook/controls/controls.ts`:

| The state is | Builder |
| --- | --- |
| on or off (a signal ingesting, a feature present) | `toggleControl` |
| how many rows a list has | `countControl` |
| one of several modes (tab, visibility, plan, severity filter) | `choiceControl` |
| a subset (steps skipped, columns shown, signals selected) | `multiChoiceControl` |

Rules that come with them:

- `countControl` `max` goes past what the page renders, so a story can show the
  cap being hit. `0` is the empty state, which is why an empty list rarely needs
  its own story. When the cap is in the *request* (`?limit=5`) rather than the
  renderer, stop `max` at the limit: a longer response is a body the backend
  cannot send.
- `choiceControl` options come from a `const` array typed with
  `(typeof X)[number]`, not from string literals scattered in the handlers.
- Defaults describe the fully-populated page. The panel starts where `Default`
  starts.
- `group` is `'<Page> · <facet>'`, such as `'Services · lists'` or
  `'Alerts · rules'`. Keep a page's knobs in two or three groups, not one per
  control.
- `description` only when the name does not carry the effect (what dismissing
  does, what the cap is, which widget it feeds).

## Which hook

`defineStoryMocks` takes three, all optional:

- `handlers(values, response)`: the page's endpoints. Everything the page owns
  goes through `response.json`, so the global Data control turns the whole page
  into loading or failed without a second declaration. An endpoint the page
  cannot render at all without (ingestion detection, preferences, license
  payloads) takes a plain `rest.get(...)` resolver instead, so the shell stays
  visible while the rest hangs or fails.
- `config(values)`: `SignozStoryConfig` for knobs no endpoint covers: `route`,
  `appContext`, `reduxState`, `queryBuilder`, `theme`.
- `effect(values)`: module-level state no provider exposes.

One endpoint feeding several widgets stays one handler that reads the request.
`response.json` hands the request to the builder and awaits it, so reading a
query param, or a POST body, does not cost the Data control:

```ts
rest.get(
	'http://localhost/api/v1/explorer/views',
	response.json((req) =>
		savedViews(values.savedViews, req.url.searchParams.get('sourcePage') ?? 'logs'),
	),
),
```

```ts
rest.post(
	'http://localhost/api/v5/query_range',
	response.json(async (req) => {
		const body = (await req.json()) as QueryRangeRequestV5;
		const signal = body.compositeQuery?.queries?.[0]?.spec?.signal;

		return countResponse(values[`${signal}Ingestion`] ? 4213 : 0);
	}),
),
```

Reach for a plain `rest.post(url, async (req, res, ctx) => …)` only when the
endpoint has to keep answering while the Data control is on `loading` or
`error`: detection calls the page cannot render without.

## Mutations

A control drives the response, so a write the page makes against state a control
owns does not stick: the refetch answers with the control's value and the button
appears to do nothing. Two honest options: leave it declarative and say so in
the PR, or move the state into `effect` so the handler can read what the page
wrote. Never fake the write by mutating a builder's module state without saying
where the state lives.

## Wiring it up

```ts
// src/pages/Services/Services.stories.mocks.tsx
/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */
export const servicesMocks = defineStoryMocks({
	controls: {
		services: countControl('Services', { group: LISTS, value: 8, max: 12 }),
		apdex: choiceControl<ApdexState>('Apdex', {
			group: HEALTH,
			options: APDEX_STATES,
			value: 'mixed',
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v2/services',
			response.json(() => buildServices(values.services, values.apdex)),
		),
	],
});
```

```tsx
// src/pages/Services/Services.stories.tsx
type ServicesArgs = PageStoryArgs<typeof servicesMocks>;

const pageStory = storyMocks(servicesMocks, { route: ROUTES.APPLICATION });

/**
 * Every instrumented service with its p99, error rate and throughput.
 *
 * Route: `/services`.
 */
const meta = {
	title: 'Pages/Services/List',
	component: Services,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ServicesArgs>;
```

`PageStoryArgs` folds in the global controls, so a story's `args` can set
`access`, `dataState` or `banner` next to the page's own knobs and stay typed.

## A step the page keeps in component state

A wizard's step, a questionnaire's page, a picker's next question: the page holds
it in `useState` and nothing in the URL says which one is open. It is still a
control. Declare the steps in the mocks module and drive them from a `play` on
the **meta**, so every story of the page inherits the walk and only sets `args`:

```tsx
// <Page>.stories.mocks.tsx
export const SETUP_STEPS = ['pick-source', 'pick-framework', 'configure'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

controls: {
	step: choiceControl<SetupStep>('Setup step', { group: SETUP, options: SETUP_STEPS, value: 'pick-source' }),
},
```

```tsx
// <Page>.stories.tsx
const meta = {
	play: async ({ mount, args, canvasElement }): Promise<void> => {
		await mount();
		await advanceToSetupStep(canvasElement, args.step);
	},
	...storyMocks(pageMocks),
} satisfies Meta<PageArgs>;

export const Configure: Story = { args: { step: 'configure' } };
```

**Destructuring `mount` is what makes it a control.** Storybook re-runs a play
function on an arg change only for a story whose play asks to be remounted
(`usesMount`); otherwise it re-renders the tree the previous walk left behind and
the panel looks broken. With `mount` destructured, the story renders when `play`
calls it, and every arg change replays the walk from a fresh mount.

The walk itself:

- one `answer` function per step, in an array indexed the same as the step list,
  so reaching step *n* is `answers.slice(0, STEPS.indexOf(step))`;
- answer each step with the least its Next button accepts, and prefer a "do this
  later" over filling a slider;
- run them sequentially (`reduce` over a promise), since each answer is what
  renders the step the next one reads;
- bail out when the page did not start where the walk expects, such as a source
  deep-linked past the questions. Check for the first step's own text rather than
  reading another control's value.

An endpoint that only settles the transition between two steps (the profile a
questionnaire saves before its last page) takes a plain resolver, or the Data
control on `loading` strands the walk halfway.

## Not a control

- Anything the global controls already cover: banner, side nav, data state,
  access preset, permissions, check state.
- A knob whose effect nobody can see on the page. Delete it or find the widget it
  was supposed to drive.
- A raw payload as an object control. Controls carry intent (`5 dashboards`,
  `viewer`), and the builder turns intent into the payload.
- Anything that needs a module mock or a component prop to work. If the state
  cannot be produced from a response, config or module state, say so in the PR
  instead of faking it.

## Control or story

Default to a control. Write a story when the state is worth a link:

- the fresh workspace, because that is what a new user sees
- the restricted user, when permissions visibly change the page
- a page-defining mode (a tab, a category) that has its own layout

Combinations of controls do not need stories, which is what the panel is for.

Each story gets one prose doc comment: what it shows, in the page's own terms.
Everywhere else the comment rule in SKILL.md applies: write one only for what
the code cannot show.
