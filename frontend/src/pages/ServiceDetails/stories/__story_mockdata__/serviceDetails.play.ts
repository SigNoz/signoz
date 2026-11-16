/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, within } from 'storybook/test';

const PAGE_LOAD = { timeout: 15_000 };

/** Opens the Apdex settings popover from the header. */
export async function openApdexSettings({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> {
	const trigger = await within(canvasElement).findByTestId(
		'service-apdex-settings-trigger',
		{},
		PAGE_LOAD,
	);
	await userEvent.click(trigger);
	await expect(
		await screen.findByTestId('service-apdex-threshold', {}, PAGE_LOAD),
	).toBeInTheDocument();
}
