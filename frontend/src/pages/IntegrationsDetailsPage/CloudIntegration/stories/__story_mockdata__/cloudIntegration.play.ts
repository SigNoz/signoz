/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent } from 'storybook/test';

import {
	type CloudIntegrationArgs,
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
