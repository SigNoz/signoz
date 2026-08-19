import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { renderAtRoute } from '../../../storybook/renderAtRoute';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import MetricsApplication from '../MetricsApplication';
import { metricsApplicationMocks } from './MetricsApplication.stories.mocks';

type MetricsApplicationArgs = PageStoryArgs<typeof metricsApplicationMocks>;

const pageStory = storyMocks(metricsApplicationMocks, { layout: 'app' });

/**
 * One service: its latency, rate and error panels, its top and entry point
 * operations, and the apdex setting the panels read.
 *
 * Route: `/services/:servicename`.
 */
const meta = {
	title: 'Pages/Services/Detail',
	tags: ['play'],
	component: MetricsApplication,
	// The page reads the service out of the pathname, so it renders under its own
	// route rather than being mounted on its own.
	render: renderAtRoute(ROUTES.SERVICE_METRICS, MetricsApplication),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<MetricsApplicationArgs>;

export default meta;

type Story = StoryObj<MetricsApplicationArgs>;

/**
 * A service's overview: latency, rate, apdex and error percentage over the
 * selected range, with the key operations behind them.
 */
export const Default: Story = {};

/** The database calls the service makes, by system and by upstream. */
export const DatabaseCalls: Story = {
	args: { tab: 'DB_CALL_METRICS' },
};

/** The calls the service makes out of the mesh, by address. */
export const ExternalCalls: Story = {
	args: { tab: 'EXTERNAL_METRICS' },
};

/** Every available operation and graph series, for the page's densest layout. */
export const DenseOperations: Story = {
	args: { operations: 10, series: 6 },
};

/** The real empty table branch when this service has no top or entry-point operations. */
export const NoOperations: Story = {
	args: { operations: 0 },
};

/**
 * The Download menu on the top operations table, open: the formats the rows can
 * be taken away in.
 */
export const DownloadMenu: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'download-menu-trigger',
				{},
				{ timeout: 15000 },
			),
		);
		await screen.findByRole('menu');
	},
};
