import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import Services from '../index';
import { servicesMocks } from './Services.stories.mocks';

type ServicesArgs = PageStoryArgs<typeof servicesMocks>;

const pageStory = storyMocks(servicesMocks, {
	route: ROUTES.APPLICATION,
	layout: 'app',
});

/**
 * Every instrumented service with its p99, error rate and throughput, read from
 * either span metrics or the traces themselves.
 *
 * Route: `/services`.
 */
const meta = {
	title: 'Pages/Services/List',
	component: Services,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ServicesArgs>;

export default meta;

type Story = StoryObj<ServicesArgs>;

/**
 * Every instrumented service with its p99, error rate and operations per
 * second, over the resource attribute filter the page scopes them with.
 */
export const Default: Story = {};

/** The same list read from span metrics instead of traces, so p99 is in ns. */
export const SpanMetrics: Story = {
	args: { mode: 'span-metrics' },
};

/** A workspace with nothing instrumented yet: the table has no services. */
export const NoServices: Story = {
	args: { services: 0 },
};

/** All rows are failing, making the error-rate and latency columns visibly severe. */
export const UnhealthyServices: Story = {
	args: { health: 'degraded' },
};

/** Fourteen services exercise the table's second-page pagination controls. */
export const Pagination: Story = {
	args: { services: 14 },
};

/** Cloud trial pushed past 100 rps, which is what the warning above the table reads. */
export const OverTrialLimit: Story = {
	args: { traffic: 'over-trial-limit', banner: 'trial-expiry' },
};
