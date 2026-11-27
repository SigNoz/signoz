/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	type AlertHistoryArgs,
	deniesRuleRead,
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

/** The page refuses the rule: the full-page denial names `read` on it. */
export const expectRuleDenied = async ({
	args,
}: PlayContext): Promise<void> => {
	if (!deniesRuleRead(args)) {
		return;
	}

	await screen.findByText(
		'Uh-oh! You are not authorized',
		undefined,
		untilLoaded,
	);
	await screen.findByText(/read:rule:/);
};
