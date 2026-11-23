import { expect, waitFor, within } from 'storybook/test';

import {
	TABLE_THRESHOLD_VALUE,
	THRESHOLD_COLOR,
} from '../__story_mockdata__/constants';
import { serviceAt, TABLE_VALUES } from '../__story_mockdata__/panelResponses';

import { PANEL_LOAD, type PanelPlayArgs } from './args';

/** Rows ranked highest first; rank and share only when toggled; rows above the threshold recoloured. */
export const expectTopList = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const list = await within(root).findByTestId('top-list', {}, PANEL_LOAD);
	await waitFor(
		() =>
			expect(within(list).getAllByTestId('top-list-row')).toHaveLength(
				args.series,
			),
		PANEL_LOAD,
	);

	const rows = within(list).getAllByTestId('top-list-row');
	const values = TABLE_VALUES(args.series);
	for (const [index, row] of rows.entries()) {
		const cells = within(row);
		await expect(cells.getByTestId('top-list-row-label')).toHaveTextContent(
			serviceAt(index),
		);
		await expect(Boolean(cells.queryByTestId('top-list-row-rank'))).toBe(
			args.showRank,
		);
		await expect(Boolean(cells.queryByTestId('top-list-row-share'))).toBe(
			args.showShare,
		);
		const fill = cells
			.getByTestId('top-list-row-fill')
			.style.getPropertyValue('--fill-color');
		await expect(fill.toLowerCase() === THRESHOLD_COLOR).toBe(
			args.thresholds && values[index] > TABLE_THRESHOLD_VALUE,
		);
	}
};

/** Shares of a value that does not add up across rows are flagged in the panel header. */
export const expectsTopListWarning = (args: PanelPlayArgs): boolean =>
	args.kind === 'TopList' && args.showShare && args.topListAggregation === 'p99';
