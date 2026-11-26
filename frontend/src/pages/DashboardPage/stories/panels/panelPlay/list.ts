import { expect, userEvent, waitFor, within } from 'storybook/test';

import { panelRequests } from '../__story_mockdata__/panelResponses';

import { hasData, PANEL_LOAD, type PanelPlayArgs } from './args';

/** Rows a List page holds. */
const LIST_PAGE_SIZE = 25;

const listRowsOnPage = (listRows: number, page: number): number =>
	Math.max(0, Math.min(LIST_PAGE_SIZE, listRows - page * LIST_PAGE_SIZE));

/**
 * The page's rows, its first log line and the request that fetched it. With no
 * total count the app offers Next after any full page, the last one included.
 */
export const expectListPage = async (
	root: HTMLElement,
	listRows: number,
	page: number,
): Promise<void> => {
	const renderer = await within(root).findByTestId(
		'list-panel-renderer',
		{},
		PANEL_LOAD,
	);
	await waitFor(async () => {
		await expect(
			within(renderer).getByTestId('list-panel-page'),
		).toHaveTextContent(`Page ${page + 1}`);
		// Skeleton rows stand in while the next page loads.
		await expect(
			renderer.querySelectorAll(
				'tbody tr.ant-table-row:not([data-row-key^="skeleton"])',
			),
		).toHaveLength(listRowsOnPage(listRows, page));
	}, PANEL_LOAD);
	await expect(
		renderer.querySelector('tbody tr.ant-table-row'),
	).toHaveTextContent(`log line ${page * LIST_PAGE_SIZE + 1}:`);
	await expect(within(renderer).getByTestId('list-panel-next')).toHaveAttribute(
		'aria-disabled',
		String(listRowsOnPage(listRows, page) < LIST_PAGE_SIZE),
	);
	await expect(panelRequests().at(-1)).toMatchObject({
		offset: page * LIST_PAGE_SIZE,
		limit: LIST_PAGE_SIZE,
	});
};

/** Walks Next through every page that has rows, checking each one. */
export const walkListPages = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	if (args.kind !== 'List' || !hasData(args)) {
		return;
	}

	for (let page = 1; listRowsOnPage(args.listRows, page) > 0; page++) {
		await userEvent.click(within(root).getByTestId('list-panel-next'));
		await expectListPage(root, args.listRows, page);
	}
};
