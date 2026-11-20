/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import type { servicesMocks } from '../Services.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof servicesMocks>;
}

const TABLE_TIMEOUT = 10000;

export const openColumnFilter = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	// The failed state renders no table, and the loading one keeps its header
	// under a spinner that takes no clicks.
	if (args.dataState !== 'loaded') {
		return;
	}

	const header = await within(canvasElement).findByRole(
		'columnheader',
		{ name: /Application/ },
		{ timeout: TABLE_TIMEOUT },
	);
	await waitFor(
		() =>
			expect(
				header.closest('.ant-table-wrapper')?.querySelector('.ant-spin-spinning'),
			).toBeNull(),
		{ timeout: TABLE_TIMEOUT },
	);
	const trigger = within(header).getByRole('button');

	await userEvent.click(trigger);
	const search = await screen.findByPlaceholderText('Search by service');
	await waitFor(() => expect(search).toBeVisible());

	await userEvent.unhover(trigger);
	if (document.activeElement instanceof HTMLElement) {
		document.activeElement.blur();
	}
};
