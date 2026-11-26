/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	type AlertHistoryArgs,
	listsTimelineRows,
	rowActionLinkTestId,
	untilLoaded,
} from '../AlertHistory.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: AlertHistoryArgs;
}

export const openRowActions = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsTimelineRows(args)) {
		return;
	}

	const [actions] = await within(canvasElement).findAllByTestId(
		'timeline-row-actions',
		undefined,
		untilLoaded,
	);
	const linkTestId = rowActionLinkTestId(args);
	if (!linkTestId) {
		await expect(actions).toHaveAttribute('disabled');
		return;
	}

	await userEvent.click(actions);
	const link = await screen.findByTestId(linkTestId);
	await waitFor(() => expect(link).toBeVisible());
};
