import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import { homeMocks } from './HomePage.stories.mocks';

import HomePage from './HomePage';

type HomeArgs = PageStoryArgs<typeof homeMocks>;

const pageStory = storyMocks(homeMocks, { route: ROUTES.HOME });

/**
 * The workspace landing page: ingestion state per signal, the welcome checklist
 * while a signal is missing, then alert rules, dashboards, saved views and the
 * services table.
 *
 * Route: `/home`.
 */
const meta = {
	title: 'Pages/Home',
	tags: ['role-gated'],
	component: HomePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<HomeArgs>;

export default meta;

type Story = StoryObj<HomeArgs>;

/**
 * Every widget carrying data: all three signals ingesting, alert rules across
 * severities, recent dashboards, saved views on each explorer tab and a
 * services table with failing services.
 */
export const Default: Story = {};

/** Fresh workspace: nothing ingested yet, so the welcome checklist takes over. */
export const NoIngestion: Story = {
	args: {
		logsIngestion: false,
		tracesIngestion: false,
		metricsIngestion: false,
		alertRules: 0,
		dashboards: 0,
		savedViews: 0,
		services: 0,
	},
};

/**
 * Telemetry reads only: no permission to manage anything, so the create actions
 * and the legacy editor role are both gone.
 */
export const ViewerAccess: Story = {
	args: { access: 'viewer' },
};

/** Widgets stuck in their loading state, shell included. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};
