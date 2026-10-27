import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { expect, waitFor, within } from 'storybook/test';

import {
	NUMBER_VALUE,
	TABLE_THRESHOLD_VALUE,
} from '../__story_mockdata__/constants';
import {
	serviceIndex,
	TABLE_VALUES,
} from '../__story_mockdata__/panelResponses';

import { PANEL_LOAD, type PanelPlayArgs } from './args';

export const expectPie = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const chart = await within(root).findByTestId('pie-chart', {}, PANEL_LOAD);
	// The legend's icons are SVGs too; the donut is the first one.
	const donut = chart.querySelector('svg');
	await expect(donut?.querySelectorAll('g > path')).toHaveLength(args.series);
	// The centre shows the slices' sum, formatted as the panel formats values.
	const total = TABLE_VALUES(args.series).reduce((sum, value) => sum + value, 0);
	await expect(
		donut?.querySelector('text[text-anchor="middle"]')?.textContent,
	).toBe(getYAxisFormattedValue(String(total), args.unit).replace(/\s+/g, ''));
};

export const expectNumber = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const value = await within(root).findByTestId(
		'number-panel-value',
		{},
		PANEL_LOAD,
	);
	await expect(value).toHaveTextContent(String(NUMBER_VALUE));

	const renderer = within(root).getByTestId('number-panel-renderer');
	if (args.unit === 'ms') {
		await expect(renderer).toHaveTextContent('ms');
	}

	const filled = [...renderer.querySelectorAll<HTMLElement>('div')].some(
		(node) => node.style.backgroundColor !== '',
	);
	await expect(filled).toBe(args.thresholds);
};

const isPainted = (cell: HTMLElement): boolean =>
	cell.style.backgroundColor !== '';

/**
 * Per row: group cell, the `A` column the threshold targets, then `B`. Only an
 * `A` cell above the threshold is painted, whatever `B` holds.
 */
const expectTableThresholds = async (
	rows: HTMLElement[],
	args: PanelPlayArgs,
): Promise<void> => {
	const values = TABLE_VALUES(args.series);
	for (const row of rows) {
		const cells = [...row.querySelectorAll<HTMLElement>('td')];
		const value = values[serviceIndex(cells[0].textContent ?? '')];
		await expect(cells.map(isPainted)).toEqual([
			false,
			args.thresholds && value > TABLE_THRESHOLD_VALUE,
			false,
		]);
	}
};

export const expectTable = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const renderer = await within(root).findByTestId(
		'table-panel-renderer',
		{},
		PANEL_LOAD,
	);
	await waitFor(
		() =>
			expect(renderer.querySelectorAll('tbody tr.ant-table-row')).toHaveLength(
				args.series,
			),
		PANEL_LOAD,
	);
	await expect(within(renderer).getByText('service.name')).toBeInTheDocument();

	const rows = [
		...renderer.querySelectorAll<HTMLElement>('tbody tr.ant-table-row'),
	];
	const [, firstValue] = rows[0].querySelectorAll('td');
	// A unit suffixes the cell (`3.8 s`, `3.71 KiB`); without one it is the bare count.
	if (args.columnUnits && args.unit !== 'none') {
		await expect(firstValue).toHaveTextContent(/\d\s?[a-z]+$/i);
	} else {
		await expect(firstValue).toHaveTextContent(/^[\d,.]+$/);
	}

	await expectTableThresholds(rows, args);
};
