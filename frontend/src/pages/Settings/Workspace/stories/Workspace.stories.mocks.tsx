/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import type { TStatus } from 'types/api/settings/getRetention';

import { choiceControl, toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	disksResponse,
	hostsResponse,
	logsRetentionResponse,
	metricsRetentionResponse,
	RETENTION_STATUSES,
	tracesRetentionResponse,
	WORKSPACE_URLS,
	type WorkspaceUrl,
} from './__story_mockdata__/workspace';

const RETENTION = 'Workspace · retention';
const DOMAIN = 'Workspace · domain';

export const workspaceMocks = defineStoryMocks({
	controls: {
		coldStorage: toggleControl('Cold storage', {
			group: RETENTION,
			description:
				'Whether the instance reports an s3 disk. Without one the "Move to S3" field is hidden on all three signals.',
			value: true,
		}),
		retentionStatus: choiceControl<TStatus>('Retention change', {
			group: RETENTION,
			description:
				'State of the last retention change. Anything other than the empty value adds the status row and, while pending, blocks the save button. Self-hosted only: cloud has no retention controls to report on, so nothing moves while License is `cloud`.',
			options: RETENTION_STATUSES,
			value: '',
		}),
		workspaceUrl: choiceControl<WorkspaceUrl>('Workspace URL', {
			group: DOMAIN,
			description:
				'Whether a custom subdomain is set. Cloud admins only: self-hosted has no domain card.',
			options: WORKSPACE_URLS,
			value: 'custom',
		}),
	},
	handlers: (values, response) => [
		// One path, two signals: the type the page asks for is a query param.
		rest.get(
			'http://localhost/api/v1/settings/ttl',
			response.json((req) =>
				req.url.searchParams.get('type') === 'traces'
					? tracesRetentionResponse(values.retentionStatus, values.coldStorage)
					: metricsRetentionResponse(values.retentionStatus, values.coldStorage),
			),
		),

		rest.get(
			'http://localhost/api/v2/settings/ttl',
			response.json(() =>
				logsRetentionResponse(values.retentionStatus, values.coldStorage),
			),
		),

		rest.get(
			'http://localhost/api/v1/disks',
			response.json(() => disksResponse(values.coldStorage)),
		),

		// The domain card is the shell of the page rather than its data, so it keeps
		// answering while the retention endpoints hang or fail.
		rest.get('http://localhost/api/v2/zeus/hosts', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(hostsResponse(values.workspaceUrl))),
		),
	],
	config: () => ({ route: ROUTES.SETTINGS }),
});
