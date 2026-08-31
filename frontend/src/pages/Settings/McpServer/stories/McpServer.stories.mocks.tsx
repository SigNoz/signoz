/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { toggleControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

const SERVER = 'MCP server · server';

const INSTANCE_URL = 'https://nightswatch.us.signoz.cloud';

/**
 * The tab is a set of client snippets built from the config, so nothing on it
 * renders until the config has answered: both endpoints take a plain resolver.
 */
export const mcpServerMocks = defineStoryMocks({
	controls: {
		mcpEnabled: toggleControl('MCP endpoint', {
			group: SERVER,
			description:
				'Whether the deployment publishes an MCP URL. Without one the tab is the docs pointer instead of the setup steps.',
			value: true,
		}),
	},
	handlers: ({ mcpEnabled }) => [
		rest.get('http://localhost/api/v1/global/config', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						ai_assistant_url: null,
						external_url: INSTANCE_URL,
						ingestion_url: 'https://ingest.us.signoz.cloud:443',
						mcp_url: mcpEnabled ? `${INSTANCE_URL}/mcp` : null,
					},
				}),
			),
		),

		rest.get('http://localhost/api/v2/zeus/hosts', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						name: 'nightswatch',
						state: 'HEALTHY',
						tier: 'production',
						hosts: [{ name: 'nightswatch', url: INSTANCE_URL, is_default: true }],
					},
				}),
			),
		),
	],
	config: () => ({ route: ROUTES.MCP_SERVER }),
});
