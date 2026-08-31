import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { integrationsMocks } from './IntegrationsModulePage.stories.mocks';
import IntegrationsModulePage from './IntegrationsModulePage';

type IntegrationsArgs = PageStoryArgs<typeof integrationsMocks>;

const pageStory = storyMocks(integrationsMocks, { route: ROUTES.INTEGRATIONS });

/**
 * The integrations catalogue, installed ones first.
 *
 * Route: `/integrations`.
 */
const meta = {
	title: 'Pages/Integrations/List',
	tags: ['play'],
	component: IntegrationsModulePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<IntegrationsArgs>;

export default meta;

type Story = StoryObj<IntegrationsArgs>;

/** The list fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const search = async (
	canvasElement: HTMLElement,
	query: string,
): Promise<void> => {
	const input = await within(canvasElement).findByPlaceholderText(
		/search for an integration/i,
		undefined,
		untilLoaded,
	);

	await userEvent.type(input, query);
};

/**
 * The integrations a workspace can install: the three cloud providers SigNoz
 * sets up in one click, then every built-in integration with who published it
 * and whether it is installed.
 */
export const Default: Story = {};

/**
 * A search that matches nothing, which both sections answer for themselves.
 * The search filters what is already loaded, so no request goes out for it.
 */
export const NoSearchMatches: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await search(canvasElement, 'kafka');
		await within(canvasElement).findAllByText(/no integrations found/i);
	},
};

/**
 * The form for an integration SigNoz does not publish yet. Submitting it is a
 * telemetry event, not an endpoint.
 */
export const RequestIntegration: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/request integration/i,
				undefined,
				untilLoaded,
			),
		);
		await userEvent.type(
			await screen.findByPlaceholderText(/enter integration name/i),
			'Kafka',
		);
	},
};
