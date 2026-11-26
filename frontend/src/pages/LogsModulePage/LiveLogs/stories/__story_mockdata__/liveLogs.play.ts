/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { LiveLogsArgs } from '../LiveLogs.stories.mocks';

interface PlayContext {
	mount: () => Promise<unknown>;
	canvasElement: HTMLElement;
	args: LiveLogsArgs;
}

/** The page connects before it renders a line, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const LINE_TEXT = /order 8412 placed/;

/** Each streamed line takes a severity, so no severity means no line. */
const streamsLines = (args: LiveLogsArgs): boolean =>
	args.liveLogs > 0 && args.severities.length > 0;

/** Live tail is reached through the time picker, which owns the `Live` option. */
const goLive = async (canvasElement: HTMLElement): Promise<void> => {
	const timePicker = await waitFor(() => {
		const input = canvasElement.querySelector<HTMLElement>(
			'.timeSelection-input',
		);

		if (!input) {
			throw new Error('Time picker did not render');
		}

		return input;
	}, untilLoaded);

	await userEvent.click(timePicker);
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Live' },
			untilLoaded,
		),
	);
};

const firstLine = async (canvasElement: HTMLElement): Promise<HTMLElement> => {
	const [line] = await within(canvasElement).findAllByText(
		LINE_TEXT,
		undefined,
		untilLoaded,
	);

	return line;
};

/**
 * The stream answers after a connect delay, so without waiting on a line the
 * story is captured on `Fetching live logs...` rather than on the lines it names.
 */
export const tailLive = async ({
	mount,
	args,
	canvasElement,
}: PlayContext): Promise<void> => {
	await mount();
	await goLive(canvasElement);

	if (streamsLines(args)) {
		await firstLine(canvasElement);
	}
};

/** Row actions render on hover, so a streamed line is hovered first. */
export const copyLiveLogLink = async ({
	mount,
	args,
	canvasElement,
}: PlayContext): Promise<void> => {
	await mount();
	await goLive(canvasElement);

	if (!streamsLines(args)) {
		return;
	}

	await userEvent.hover(await firstLine(canvasElement));
	await userEvent.click(
		await waitFor(() => {
			const button = canvasElement.querySelector<HTMLElement>('.copy-log-btn');

			if (!button) {
				throw new Error('Row actions did not render');
			}

			return button;
		}, untilLoaded),
	);
	await waitFor(() =>
		expect(screen.getByText('Copied to clipboard')).toBeVisible(),
	);
};

export const openLiveLogDetails = async ({
	mount,
	args,
	canvasElement,
}: PlayContext): Promise<void> => {
	await mount();
	await goLive(canvasElement);

	if (!streamsLines(args)) {
		return;
	}

	await userEvent.click(await firstLine(canvasElement));
	await screen.findByTestId('log-detail-drawer', undefined, untilLoaded);
};
