import { expect, within } from 'storybook/test';

import type { PanelPlayArgs } from './args';
import { expectPanel } from './expectPanel';
import { filterLegend, searchTable } from './interactions';
import { walkListPages } from './list';

type PanelPlay = (context: {
	canvasElement: HTMLElement;
	args: PanelPlayArgs;
}) => Promise<void>;

/** Asserts what the panel kind draws. */
export const playPanel: PanelPlay = async ({ canvasElement, args }) => {
	await expectPanel(canvasElement, args);
};

export const playTableSearch: PanelPlay = async ({ canvasElement, args }) => {
	await expectPanel(canvasElement, args);
	await searchTable(canvasElement, args);
};

export const playListJsonBody: PanelPlay = async ({ canvasElement, args }) => {
	await expectPanel(canvasElement, args);
	const [first, , third] = within(canvasElement)
		.getByTestId('list-panel-renderer')
		.querySelectorAll<HTMLElement>('tbody tr.ant-table-row');
	await expect(within(first).getByText(/^log line 1:/)).toBeInTheDocument();
	await expect(
		within(third).getByText(/^\{"message":"log line 3:/),
	).toBeInTheDocument();
};

export const playListPaginated: PanelPlay = async ({ canvasElement, args }) => {
	await expectPanel(canvasElement, args);
	await walkListPages(canvasElement, args);
};

export const playLegendRight: PanelPlay = async ({ canvasElement, args }) => {
	await expectPanel(canvasElement, args);
	await filterLegend(canvasElement, args);
};
