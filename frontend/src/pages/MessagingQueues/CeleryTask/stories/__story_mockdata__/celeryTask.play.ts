/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { CeleryTaskArgs } from '../CeleryTask.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: CeleryTaskArgs;
}

/** The counters fetch before the tabs settle, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

export const showFailedTasks = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByText('Failed', undefined, untilLoaded),
	);
	// The panel the tab opens carries the same label as the tab itself.
	await waitFor(
		() => expect(canvas.getAllByText('Failed')).toHaveLength(2),
		untilLoaded,
	);
};

export const openStateDrawer = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.dataState !== 'loaded' || args.series === 0) {
		return;
	}

	const plot = await waitFor(() => {
		const drawn = canvasElement.querySelector<HTMLElement>(
			'.celery-task-graph-bar .u-over',
		);
		if (!drawn) {
			throw new Error('The state graph has not drawn yet.');
		}
		return drawn;
	}, untilLoaded);

	// The click plugin picks the series nearest the pointer at that timestamp,
	// so a point just above the x axis lands on the bottom bar.
	const { left, width, bottom } = plot.getBoundingClientRect();
	const coords = { clientX: left + width / 2, clientY: bottom - 5 };
	await userEvent.pointer([
		{ target: plot, coords },
		{ keys: '[MouseLeft]', target: plot, coords },
	]);

	// The drawer renders into the document body, outside the story canvas.
	const page = within(canvasElement.ownerDocument.body);
	await waitFor(
		() => expect(page.getByText('Details - celery.state')).toBeVisible(),
		untilLoaded,
	);
	await waitFor(
		() => expect(page.getByText(/^Total Task: [1-9]/)).toBeVisible(),
		untilLoaded,
	);
};
