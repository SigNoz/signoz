/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { userEvent, within } from 'storybook/test';

interface PlayContext {
	canvasElement: HTMLElement;
}

/** Both views render the large tool-call JSON tall enough to clamp. */
export const clickShowMore = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const toggles =
		await within(canvasElement).findAllByTestId('ai-json-show-more');
	await toggles.reduce(
		(previous, toggle) => previous.then(() => userEvent.click(toggle)),
		Promise.resolve(),
	);
};
