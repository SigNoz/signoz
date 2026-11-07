/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { dashboardDurationError } from '../../DashboardContainer/utils/dashboardDuration';
import {
	type dashboardMocks,
	openJsonEditor,
	openSettings,
	PAGE_LOAD,
} from '../DashboardPage.stories.mocks';

interface DashboardPlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof dashboardMocks>;
}

const findDefaultTimeRange = async (
	canvasElement: HTMLElement,
): Promise<HTMLElement> => {
	const panel = await openSettings(canvasElement);

	return within(panel).findByTestId(
		'dashboard-default-time-range',
		{},
		PAGE_LOAD,
	);
};

export const showDefaultTimeRange = async ({
	canvasElement,
}: DashboardPlayContext): Promise<void> => {
	await findDefaultTimeRange(canvasElement);
};

const isSliding = (element: HTMLElement): boolean => {
	for (let node = element.parentElement; node; node = node.parentElement) {
		if (getComputedStyle(node).transform !== 'none') {
			return true;
		}
	}

	return false;
};

export const openDefaultTimeRange = async ({
	canvasElement,
}: DashboardPlayContext): Promise<void> => {
	const select = await findDefaultTimeRange(canvasElement);

	await waitFor(() => expect(isSliding(select)).toBe(false), PAGE_LOAD);
	await userEvent.click(select);
	await screen.findByRole('listbox');
};

export const hoverJsonValidation = async ({
	canvasElement,
	args,
}: DashboardPlayContext): Promise<void> => {
	await openJsonEditor(canvasElement);
	const validation = await screen.findByTestId('json-editor-validation');

	if (args.duration === 'unset' || !dashboardDurationError(args.duration)) {
		return;
	}
	await waitFor(() =>
		expect(validation).toHaveTextContent('"spec.duration" must be'),
	);
	await userEvent.hover(validation);
	await screen.findByRole('tooltip', {}, PAGE_LOAD);
};
