/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

/**
 * The form holds the channel type in component state and posts on save, so the
 * page has no response for a control to turn: the types are stories with a
 * `play` that picks one. The write endpoints are here so Save and Test answer
 * instead of falling through to the catch-all.
 */
export const channelsNewMocks = defineStoryMocks({
	controls: {},
	handlers: () => [
		rest.post('http://localhost/api/v1/channels', (_req, res, ctx) =>
			res(ctx.status(201), ctx.json({ status: 'success', data: null })),
		),

		rest.post('http://localhost/api/v1/testChannel', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),
	],
	config: () => ({ route: '/alerts/channels/new' }),
});
