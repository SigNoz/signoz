/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent } from 'storybook/test';

import {
	type CloudIntegrationArgs,
	connectAwsAccount,
	connectAzureAccount,
	generateGcpAgentCommand,
	offersIntegrateNow,
	openConnectFlow,
	openEditAccount,
	untilLoaded,
} from '../CloudIntegration.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: CloudIntegrationArgs;
}

/** The hero shows the account picker and Edit Account only once accounts have answered. */
const offersAccountActions = (args: CloudIntegrationArgs): boolean =>
	args.dataState === 'loaded' && args.accounts > 0;

const blurActiveElement = (): void => {
	if (document.activeElement instanceof HTMLElement) {
		document.activeElement.blur();
	}
};

export const openConnectDialog = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!offersIntegrateNow(args)) {
		return;
	}
	await openConnectFlow(canvasElement);
	await screen.findByRole('dialog', undefined, untilLoaded);
};

export const openGcpRegionDropdown = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!offersIntegrateNow(args)) {
		return;
	}
	await openConnectFlow(canvasElement);
	if (args.provider !== 'gcp') {
		return;
	}
	await userEvent.click(
		await screen.findByTestId(
			'gcp-deployment-region-select',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByRole('listbox');
};

export const openAccountSelect = async ({
	args,
}: PlayContext): Promise<void> => {
	if (!offersAccountActions(args)) {
		return;
	}
	await userEvent.click(
		await screen.findByRole('combobox', { name: 'Cloud account' }, untilLoaded),
	);
	await screen.findByRole('listbox');
};

export const openAccountSettings = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!offersAccountActions(args)) {
		return;
	}
	await openEditAccount(canvasElement);
	blurActiveElement();
};

export const openDisconnectConfirm = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!offersAccountActions(args)) {
		return;
	}
	await openEditAccount(canvasElement);
	await userEvent.click(
		await screen.findByTestId(
			'cloud-disconnect-account-btn',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByTestId(
		'cloud-remove-account-confirm',
		undefined,
		untilLoaded,
	);
	blurActiveElement();
};

/**
 * Cancel closes the drawer outright until the setup command exists, so the play
 * waits for the command before it asks to leave.
 */
const confirmClosingPendingSetup = async (
	provider: 'aws' | 'azure' | 'gcp',
	args: CloudIntegrationArgs,
): Promise<void> => {
	if (
		args.accountCreate !== 'success' ||
		args.newAccountCheckIn === 'checked-in'
	) {
		return;
	}
	await screen.findByTestId(`${provider}-agent-command`, undefined, untilLoaded);
	await userEvent.click(
		await screen.findByTestId(`${provider}-cancel-btn`, undefined, untilLoaded),
	);
	await screen.findByTestId(
		`${provider}-close-setup-btn`,
		undefined,
		untilLoaded,
	);
};

export const closePendingAwsSetup = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await connectAwsAccount(canvasElement);
	await confirmClosingPendingSetup('aws', args);
};

export const closePendingAzureSetup = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await connectAzureAccount(canvasElement);
	await confirmClosingPendingSetup('azure', args);
};

export const closePendingGcpSetup = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await generateGcpAgentCommand(canvasElement);
	await confirmClosingPendingSetup('gcp', args);
};
