/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent } from 'storybook/test';

import {
	type CloudIntegrationArgs,
	offersIntegrateNow,
	openConnectFlow,
	untilLoaded,
} from '../CloudIntegration.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: CloudIntegrationArgs;
}

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
