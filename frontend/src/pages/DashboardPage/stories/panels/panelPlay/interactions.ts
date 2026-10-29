import { expect, userEvent, waitFor, within } from 'storybook/test';

import { serviceAt } from '../__story_mockdata__/panelResponses';

import { hasData, PANEL_LOAD, type PanelPlayArgs } from './args';

/** The second series, so narrowing to it leaves one of several. */
const SEARCH_TERM = serviceAt(1);

const narrows = (args: PanelPlayArgs): boolean =>
	hasData(args) && args.series >= 2;

/** Filters the right legend of a line chart down to one series by name. */
export const filterLegend = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const lineChart = ['TimeSeries', 'Bar', 'Area'].includes(args.kind);
	if (!lineChart || args.legend !== 'right' || !narrows(args)) {
		return;
	}

	const search = await within(root).findByTestId(
		'legend-search-input',
		{},
		PANEL_LOAD,
	);
	await userEvent.type(search, SEARCH_TERM);
	await waitFor(async () => {
		const rows = root.querySelectorAll('[data-legend-item-id]');
		await expect(rows).toHaveLength(1);
		await expect(rows[0]).toHaveTextContent(SEARCH_TERM);
	}, PANEL_LOAD);
	await expect(within(root).getByTestId('legend-status')).toHaveTextContent(
		`Showing 1 of ${args.series}`,
	);
};

const tableRows = (root: HTMLElement): NodeListOf<Element> =>
	root.querySelectorAll(
		'[data-testid="table-panel-renderer"] tbody tr.ant-table-row',
	);

/** Opens the Table's header search, narrows it to one service, then clears it. */
export const searchTable = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	if (args.kind !== 'Table' || !narrows(args)) {
		return;
	}

	await userEvent.click(
		await within(root).findByTestId(
			'panel-header-search-trigger',
			{},
			PANEL_LOAD,
		),
	);
	await userEvent.type(
		await within(root).findByTestId('panel-header-search-input'),
		SEARCH_TERM,
	);
	await waitFor(async () => {
		await expect(tableRows(root)).toHaveLength(1);
		await expect(tableRows(root)[0]).toHaveTextContent(SEARCH_TERM);
	}, PANEL_LOAD);

	await userEvent.click(within(root).getByTestId('panel-header-search-clear'));
	await waitFor(
		async () => expect(tableRows(root)).toHaveLength(args.series),
		PANEL_LOAD,
	);
};
