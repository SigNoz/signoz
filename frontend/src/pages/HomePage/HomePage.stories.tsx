import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import { homeMocks } from './HomePage.stories.mocks';

import HomePage from './HomePage';

type HomeArgs = PageStoryArgs<typeof homeMocks>;

const meta = {
	title: 'Pages/Home',
	component: HomePage,
	decorators: [withAppLayout],
	...storyMocks(homeMocks, { route: ROUTES.HOME }),
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
