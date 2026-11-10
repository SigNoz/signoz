/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { rest } from 'msw';

import { fieldKeysResponse } from '@/storybook/msw/__story_mockdata__/fields';

export const fieldSuggestionsHandlers = [
	rest.get('http://localhost/api/v1/fields/keys', (_req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json(
				fieldKeysResponse(['service.name', 'body'], {
					signal: TelemetrytypesSignalDTO.logs,
				}),
			),
		),
	),
];

export const noFieldSuggestionsHandlers = [
	rest.get('http://localhost/api/v1/fields/keys', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(fieldKeysResponse([]))),
	),
];
