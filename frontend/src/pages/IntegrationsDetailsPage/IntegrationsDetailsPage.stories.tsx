import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import { screen, userEvent, within } from 'storybook/test';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { integrationDetailMocks } from './IntegrationsDetailsPage.stories.mocks';
import IntegrationsDetailsPage from './index';

type IntegrationDetailArgs = PageStoryArgs<typeof integrationDetailMocks>;

const pageStory = storyMocks(integrationDetailMocks);

/**
 * One integration: what it collects, its install state, and the connection status
 * the agent reports back.
 *
 * Route: `/integrations/:integrationId`.
 */
const meta = {
	title: 'Pages/Integrations/Details',
	tags: ['play'],
	component: IntegrationsDetailsPage,
	decorators: [withAppLayout],
	// The page reads the integration id out of the pathname, so it renders under
	// its own route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route
			path={ROUTES.INTEGRATIONS_DETAIL}
			component={IntegrationsDetailsPage}
		/>
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<IntegrationDetailArgs>;

export default meta;

type Story = StoryObj<IntegrationDetailArgs>;

/** The page fetches before it renders a tab, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const clickTab = async (
	canvasElement: HTMLElement,
	label: RegExp,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(label, undefined, untilLoaded),
	);
};

/**
 * An installed integration that is receiving data: what it collects, the
 * dashboard it ships, and when the last record arrived.
 */
export const Default: Story = {};

/**
 * An integration the workspace has not connected yet, which is the page a row
 * in the list opens for everything it has not installed: no connection banner,
 * no removal bar, and Connect in place of Test Connection.
 */
export const NotInstalled: Story = {
	args: { connection: 'not-installed' },
};

/**
 * Installed and quiet for eleven days, which the page reports rather than
 * leaving the banner on the last good state.
 */
export const NoDataSinceLong: Story = {
	args: { connection: 'stale' },
};

/** The steps for pointing a collector at the instance, one section at a time. */
export const Configure: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickTab(canvasElement, /^configure$/i);
		await within(canvasElement).findByText(/prerequisites/i);
	},
};

/** Every log field and metric the integration collects, as it is named. */
export const DataCollected: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickTab(canvasElement, /^data collected$/i);
	},
};

/**
 * The connection check on an integration that is already installed: where the
 * last record came from and when.
 */
export const TestConnection: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/test connection/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/last recieved from/i);
	},
};

/** What removing the integration warns is left to do by hand. */
export const RemoveIntegration: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/remove from signoz/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/you would still have to manually remove/i);
	},
};
