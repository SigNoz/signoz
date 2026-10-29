import { expect, within } from 'storybook/test';

import { PANEL_NAME } from '../__story_mockdata__/constants';

import { hasData, PANEL_LOAD, type PanelPlayArgs } from './args';
import { expectHeatmap, expectHistogram } from './distributions';
import { expectLineChart } from './lineChart';
import { expectListPage } from './list';
import { findPlot } from './plot';
import { expectNumber, expectPie, expectTable } from './scalars';
import { expectText } from './text';

const expectNoData = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	await within(root).findByTestId(
		args.kind === 'Number' ? 'number-panel-no-data' : 'panel-no-data',
		{},
		PANEL_LOAD,
	);
	await expect(findPlot(root)).toBeUndefined();
};

const KIND_EXPECTATIONS: Record<
	Exclude<PanelPlayArgs['kind'], 'Text'>,
	(root: HTMLElement, args: PanelPlayArgs) => Promise<void>
> = {
	TimeSeries: expectLineChart,
	Bar: expectLineChart,
	Area: expectLineChart,
	Histogram: expectHistogram,
	Heatmap: expectHeatmap,
	Pie: expectPie,
	Number: expectNumber,
	Table: expectTable,
	List: (root, args) => expectListPage(root, args.listRows, 0),
};

/**
 * What the one panel on the page must show for the args it was rendered with.
 * Loading and failed belong to the Data control and are left alone.
 */
export const expectPanel = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	if (args.dataState !== 'loaded') {
		return;
	}

	if (args.kind === 'Text') {
		await expectText(root, args);
		return;
	}

	await within(root).findByText(PANEL_NAME[args.kind], {}, PANEL_LOAD);

	if (!hasData(args)) {
		await expectNoData(root, args);
		return;
	}

	await KIND_EXPECTATIONS[args.kind](root, args);

	// Checked once the data has drawn, so an absent indicator is not one still on its way.
	if (args.result === 'warning') {
		await expect(
			within(root).getByTestId('panel-status-warning'),
		).toBeInTheDocument();
	} else {
		await expect(
			within(root).queryByTestId('panel-status-warning'),
		).not.toBeInTheDocument();
	}
};
