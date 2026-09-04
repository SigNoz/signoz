import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import { screen, userEvent, within } from 'storybook/test';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { cloudIntegrationMocks } from './CloudIntegration.stories.mocks';

import IntegrationsDetailsPage from '../index';

type CloudIntegrationArgs = PageStoryArgs<typeof cloudIntegrationMocks>;

const pageStory = storyMocks(cloudIntegrationMocks);

/**
 * A cloud provider account: the credential flow, the services it can collect from,
 * and which of them are enabled.
 *
 * Route: `/integrations/:provider`.
 */
const meta = {
	title: 'Pages/Integrations/Cloud Account',
	tags: ['play'],
	component: IntegrationsDetailsPage,
	decorators: [withAppLayout],
	// `aws`, `azure` and `gcp` are integration ids like any other, and the detail
	// page renders the cloud page instead of the built-in one for those three, so
	// the story runs on the detail route and its `route` picks the provider.
	render: (): JSX.Element => (
		<Route
			path={ROUTES.INTEGRATIONS_DETAIL}
			component={IntegrationsDetailsPage}
		/>
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<CloudIntegrationArgs>;

export default meta;

type Story = StoryObj<CloudIntegrationArgs>;

/** The page picks its first service before it can render it. */
const untilLoaded = { timeout: 20_000 };

/**
 * An AWS account SigNoz collects from: the services it can watch split by
 * whether a signal is switched on, and the first enabled one open on its
 * collection switches, its dashboards and what it collects.
 */
export const Default: Story = {};

/**
 * The page before any account is connected, which is what the Integrations list
 * opens for a provider: the catalogue is browsable, the switches are not.
 */
export const NoAccountConnected: Story = {
	args: { accounts: 0 },
};

/** An account whose services are all still off. */
export const NothingEnabled: Story = {
	args: { enabledServices: 0 },
};

/** The Azure catalogue, which is the same page over a subscription. */
export const MicrosoftAzure: Story = {
	args: { provider: 'azure' },
};

/** The GCP catalogue, which is the same page over a project. */
export const GoogleCloudPlatform: Story = {
	args: { provider: 'gcp' },
};

/** Every log attribute and metric a service collects, as the agent names them. */
export const DataCollected: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/^data collected$/i,
				undefined,
				untilLoaded,
			),
		);
	},
};

/** The regions and buckets a new AWS account is connected over. */
export const ConnectAccount: Story = {
	args: { accounts: 0 },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/integrate now/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/region/i, undefined, untilLoaded);
	},
};

/** The regions an already-connected account collects from. */
export const EditAccount: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/edit account/i,
				undefined,
				untilLoaded,
			),
		);
	},
};
