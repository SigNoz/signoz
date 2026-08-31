import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import ServiceTopLevelOperations from '../index';
import { serviceTopLevelOperationsMocks } from './ServiceTopLevelOperations.stories.mocks';

type ServiceTopLevelOperationsArgs = PageStoryArgs<
	typeof serviceTopLevelOperationsMocks
>;

const pageStory = storyMocks(serviceTopLevelOperationsMocks, { layout: 'app' });

/**
 * Top level operations for one service, the list the service detail page reads.
 *
 * Route: `/services/:servicename/top-level-operations`.
 */
const meta = {
	title: 'Pages/Services/Top Level Operations',
	component: ServiceTopLevelOperations,
	// The page reads the service out of the pathname, so it renders under its own
	// route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route
			path={ROUTES.SERVICE_TOP_LEVEL_OPERATIONS}
			component={ServiceTopLevelOperations}
		/>
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ServiceTopLevelOperationsArgs>;

export default meta;

type Story = StoryObj<ServiceTopLevelOperationsArgs>;

/**
 * The entry-point spans SigNoz derived a service's RED metrics from, which is
 * what the warning on the services table links to.
 */
export const Default: Story = {};

/** Instrumentation with enough distinct entry points for the table to paginate. */
export const PaginatedOperations: Story = {
	args: { operations: 120 },
};

/** The documented 2,500-operation threshold is exceeded by one entry point. */
export const ThresholdWarning: Story = {
	args: { operations: 2501 },
};
