/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import type { createAlertMocks } from '../CreateAlert.stories.mocks';

type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;

interface PlayContext {
	canvasElement: HTMLElement;
	args: Pick<CreateAlertArgs, 'alertMode'>;
}

const untilLoaded = { timeout: 15_000 };

/** Every rule type carries the banner; only the type picker has no form. */
export const enableRoutingPolicies = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.alertMode === 'select-type') {
		return;
	}

	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByTestId('routing-policies-switch', undefined, untilLoaded),
	);
	await waitFor(() =>
		expect(
			canvas.queryByTestId('threshold-notification-channel-select'),
		).not.toBeInTheDocument(),
	);
};
