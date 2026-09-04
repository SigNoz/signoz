/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { StatusCodes } from 'http-status-codes';
import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

const VERSION = 'Status · version';

const VERSION_STATES = ['up-to-date', 'outdated', 'unavailable'] as const;

type VersionState = (typeof VERSION_STATES)[number];

const CURRENT = 'v0.104.2';

const LATEST_RELEASE_URL =
	'https://api.github.com/repos/signoz/signoz/releases/latest';

/**
 * The page reads both versions off redux, which the app layout fills from these
 * two calls: seeding the store instead would be overwritten as soon as they
 * answer.
 */
export const statusMocks = defineStoryMocks({
	controls: {
		version: choiceControl<VersionState>('Version', {
			group: VERSION,
			description:
				'How the running build compares to the newest release. `unavailable` fails both calls, which is what the page falls back to N/A for.',
			options: VERSION_STATES,
			value: 'up-to-date',
		}),
	},
	handlers: (values) => {
		const latest = values.version === 'outdated' ? 'v0.110.0' : CURRENT;

		if (values.version === 'unavailable') {
			return [
				rest.get('http://localhost/api/v1/version', (_req, res, ctx) =>
					res(ctx.status(StatusCodes.INTERNAL_SERVER_ERROR)),
				),
				rest.get(LATEST_RELEASE_URL, (_req, res, ctx) =>
					res(ctx.status(StatusCodes.SERVICE_UNAVAILABLE)),
				),
			];
		}

		return [
			rest.get('http://localhost/api/v1/version', (_req, res, ctx) =>
				res(ctx.json({ version: CURRENT, ee: 'Y', setupCompleted: true })),
			),
			rest.get(LATEST_RELEASE_URL, (_req, res, ctx) =>
				res(
					ctx.json({
						tag_name: latest,
						name: latest,
						html_url: `https://github.com/SigNoz/signoz/releases/tag/${latest}`,
					}),
				),
			),
		];
	},
	config: () => ({ route: ROUTES.VERSION }),
});
