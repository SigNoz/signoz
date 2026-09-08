import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { rest } from 'msw';

import { globalConfigResponse } from '@/storybook/msw/__story_mockdata__/appShell';

import type { GlobalMockArgs } from '../globals';
import TooltipsFixture from './TooltipsFixture';

type TooltipsArgs = ComponentProps<typeof TooltipsFixture> & GlobalMockArgs;

const meta = {
	title: 'Foundations/Tooltips',
	component: TooltipsFixture,
	args: { tooltipsOpen: true },
} satisfies Meta<TooltipsArgs>;

export default meta;

type Story = StoryObj<TooltipsArgs>;

/**
 * The refusal an `AuthZButton` or `AuthZTooltip` puts on a control the grant
 * does not cover. Nothing bounds the list, so the button is checked against
 * five permissions and denied all of them.
 */
export const DeniedPermissions: Story = {
	args: { access: 'deny-all', site: 'authz-denied' },
};

/**
 * The full series name behind a clipped chart legend entry. A metric series
 * carries every label it was grouped by, so the legend is given a real one.
 */
export const ChartLegendSeries: Story = {
	args: { site: 'chart-legend' },
};

/**
 * The preview a long cell value opens over itself: the value in a `pre`, which
 * does not wrap, above the button that opens it full size.
 */
export const ExpandedValuePreview: Story = {
	args: { site: 'expandable-value' },
};

/** The one-word label on the export control, the shortest tooltip the app has. */
export const ExportDownload: Story = {
	args: { site: 'export-menu' },
};

/**
 * The label on the Noz entry point in the top nav. The AI assistant is off until
 * the backend ships a URL for it, so the story answers the global config with
 * one.
 */
export const NozEntryPoint: Story = {
	args: { site: 'noz' },
	parameters: {
		msw: {
			handlers: [
				rest.get('http://localhost/api/v1/global/config', (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							...globalConfigResponse,
							data: {
								...globalConfigResponse.data,
								ai_assistant_url: 'https://ai.storybook.signoz.local',
							},
						}),
					),
				),
			],
		},
	},
};
