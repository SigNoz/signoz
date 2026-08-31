/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { StatusCodes } from 'http-status-codes';
import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

const KEY = 'License · key';

const APPLY_RESULTS = ['accepted', 'rejected'] as const;

type ApplyResult = (typeof APPLY_RESULTS)[number];

export const licenseMocks = defineStoryMocks({
	controls: {
		apply: choiceControl('Apply result', {
			group: KEY,
			description:
				'What the backend answers when a key is applied, which is the notification the form raises.',
			options: APPLY_RESULTS,
			value: 'accepted' as ApplyResult,
		}),
	},
	handlers: (values) => [
		rest.post('http://localhost/api/v3/licenses', (_req, res, ctx) =>
			values.apply === 'accepted'
				? res(ctx.json({ status: 'success', data: null }))
				: res(
						ctx.status(StatusCodes.BAD_REQUEST),
						ctx.json({
							error: {
								code: 'invalid_license',
								message: 'That key is not valid for this deployment.',
								url: '',
								errors: [],
							},
						}),
					),
		),
	],
	config: () => ({ route: ROUTES.LIST_LICENSES }),
});
