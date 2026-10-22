import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import { screen, userEvent, within } from 'storybook/test';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	cloudIntegrationMocks,
	connectAwsAccount,
	connectAzureAccount,
	connectGcpAccount,
	expectToast,
	openConnectFlow,
	untilLoaded,
	updateAwsAccount,
	updateTaggedAccount,
} from './CloudIntegration.stories.mocks';

import IntegrationsDetailsPage from '../../index';

type CloudIntegrationArgs = PageStoryArgs<typeof cloudIntegrationMocks>;

const pageStory = storyMocks(cloudIntegrationMocks, { layout: 'app' });

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
	// The built-in-integration lookup is expected to 404 for a cloud provider.
	parameters: { ...pageStory.parameters, allowConsoleErrors: true },
} satisfies Meta<CloudIntegrationArgs>;

export default meta;

type Story = StoryObj<CloudIntegrationArgs>;

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
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByText(/^data collected$/i, undefined, untilLoaded),
		);
		await canvas.findByRole(
			'tab',
			{ name: 'Data Collected', selected: true },
			untilLoaded,
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
		await screen.findByText(
			'Which regions do you want to monitor?',
			undefined,
			untilLoaded,
		);
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
		await screen.findByRole('dialog', undefined, untilLoaded);
	},
};

/**
 * The GCP connect flow with the catalogue behind it: the help beside every field
 * the drawer asks for, and the dashboard card on the service underneath saying
 * why it cannot be opened.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true, provider: 'gcp', accounts: 0 },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/integrate now/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByTestId('gcp-ingestion-key-input', undefined, untilLoaded);
	},
};

/**
 * The Data Collected tab of a GCP service, where the Metrics heading explains
 * that the list is what the collector config suggests rather than what arrives.
 * The tabs unmount each other, so this is the one tooltip the Overview tab
 * cannot show alongside its own.
 */
export const TooltipsInDataCollected: Story = {
	args: { tooltipsOpen: true, provider: 'gcp' },
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByText(/^data collected$/i, undefined, untilLoaded),
		);
		await canvas.findByRole(
			'tab',
			{ name: 'Data Collected', selected: true },
			untilLoaded,
		);
	},
};

/**
 * Connecting an AWS account: region and monitored regions picked, the template
 * launched, and the first poll finds the account connected. Set Account
 * connection to `error` for the failure toast.
 */
export const AwsAccountConnectedToast: Story = {
	args: { accounts: 0 },
	play: async ({ canvasElement, args }): Promise<void> => {
		await connectAwsAccount(canvasElement);
		if (args.accountCreate === 'success') {
			await expectToast(/aws account connected successfully/i);
		}
	},
};

/** The AWS connect flow when the account cannot be created. */
export const AwsAccountConnectionErrorToast: Story = {
	args: { accounts: 0, accountCreate: 'error' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await connectAwsAccount(canvasElement);
		if (args.accountCreate === 'error') {
			await expectToast(/failed to create account connection/i);
		}
	},
};

/** Connecting an Azure subscription through the generated setup commands. */
export const AzureAccountConnectedToast: Story = {
	args: { provider: 'azure', accounts: 0 },
	play: async ({ canvasElement, args }): Promise<void> => {
		await connectAzureAccount(canvasElement);
		if (args.accountCreate === 'success') {
			await expectToast(/azure account connected successfully/i);
		}
	},
};

/** The Azure connect flow when the account cannot be created. */
export const AzureAccountConnectionErrorToast: Story = {
	args: { provider: 'azure', accounts: 0, accountCreate: 'error' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await connectAzureAccount(canvasElement);
		if (args.accountCreate === 'error') {
			await expectToast(/failed to create account connection/i);
		}
	},
};

/**
 * Connecting a GCP account manually: the account is created and the story's
 * check-in stands in for the agent. A failure at either step shows inline in the
 * drawer rather than as a toast.
 */
export const GcpAccountConnectedToast: Story = {
	args: { provider: 'gcp', accounts: 0 },
	play: async ({ canvasElement, args }): Promise<void> => {
		await connectGcpAccount(canvasElement);
		if (args.accountCreate === 'success') {
			await expectToast(/gcp account connected successfully/i);
		}
	},
};

/** Interaction: the deployment region menu of the GCP setup drawer. */
export const GcpRegionOpen: Story = {
	args: { provider: 'gcp', accounts: 0 },
	play: async ({ canvasElement }): Promise<void> => {
		await openConnectFlow(canvasElement);
		await userEvent.click(
			await screen.findByTestId(
				'gcp-deployment-region-select',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByRole('listbox');
	},
};

/**
 * Saving the regions of a connected AWS account. Set Account settings update
 * to `error` for the failure toast.
 */
export const AwsAccountSettingsUpdatedToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await updateAwsAccount(canvasElement);
		if (args.accountUpdate === 'success') {
			await expectToast(/account settings updated successfully/i);
		}
	},
};

/** The AWS settings drawer when the update is rejected. */
export const AwsAccountSettingsUpdateErrorToast: Story = {
	args: { accountUpdate: 'error' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await updateAwsAccount(canvasElement);
		if (args.accountUpdate === 'error') {
			await expectToast(/failed to update account settings/i);
		}
	},
};

/** Adding a resource group to a connected Azure subscription. */
export const AzureAccountSettingsUpdatedToast: Story = {
	args: { provider: 'azure' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await updateTaggedAccount(canvasElement, 'extra-rg');
		if (args.accountUpdate === 'success') {
			await expectToast(/account settings updated successfully/i);
		}
	},
};

/** The Azure settings drawer when the update is rejected. */
export const AzureAccountSettingsUpdateErrorToast: Story = {
	args: { provider: 'azure', accountUpdate: 'error' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await updateTaggedAccount(canvasElement, 'extra-rg');
		if (args.accountUpdate === 'error') {
			await expectToast(/failed to update account settings/i);
		}
	},
};

/** Adding a project to a connected GCP account. */
export const GcpAccountSettingsUpdatedToast: Story = {
	args: { provider: 'gcp' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await updateTaggedAccount(canvasElement, 'extra-project');
		if (args.accountUpdate === 'success') {
			await expectToast(/account settings updated successfully/i);
		}
	},
};

/** The GCP settings drawer when the update is rejected. */
export const GcpAccountSettingsUpdateErrorToast: Story = {
	args: { provider: 'gcp', accountUpdate: 'error' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await updateTaggedAccount(canvasElement, 'extra-project');
		if (args.accountUpdate === 'error') {
			await expectToast(/failed to update account settings/i);
		}
	},
};

/**
 * Saving a service's collection switches. The page opens on the first enabled
 * service; flipping a switch brings up Save, and Service config update picks
 * how the PUT answers.
 */
export const ServiceConfigUpdateErrorToast: Story = {
	args: { serviceUpdate: 'error' },
	play: async ({ canvasElement, args }): Promise<void> => {
		const [firstSwitch] = await within(canvasElement).findAllByRole(
			'switch',
			undefined,
			untilLoaded,
		);

		await userEvent.click(firstSwitch);
		await userEvent.click(
			await within(canvasElement).findByRole('button', { name: /^save$/i }),
		);
		if (args.serviceUpdate === 'error') {
			await expectToast(/failed to update service config/i);
		}
	},
};

/**
 * Copying a backend-provided credential in the GCP connect drawer, which raises
 * a toast naming the field.
 */
export const GcpCredentialCopiedToast: Story = {
	args: { provider: 'gcp', accounts: 0 },
	play: async ({ canvasElement }): Promise<void> => {
		await openConnectFlow(canvasElement);
		await userEvent.click(
			await screen.findByRole(
				'button',
				{ name: /copy ingestion key/i },
				untilLoaded,
			),
		);
		await expectToast(/ingestion key copied to clipboard/i);
	},
};
