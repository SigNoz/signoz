/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { getToolTipValue, PrecisionOption } from 'components/Graph/yAxisConfig';
import { PANEL_TYPES } from 'constants/queryBuilder';

import { uPlotXAxisValuesFormat } from './constants';
import getGridColor from './getGridColor';

const PANEL_TYPES_WITH_X_AXIS_DATETIME_FORMAT = [
	PANEL_TYPES.TIME_SERIES,
	PANEL_TYPES.BAR,
	PANEL_TYPES.PIE,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAxes = ({
	isDarkMode,
	yAxisUnit,
	panelType,
	isLogScale,
	decimalPrecision,
}: {
	isDarkMode: boolean;
	yAxisUnit?: string;
	panelType?: PANEL_TYPES;
	isLogScale?: boolean;
	decimalPrecision?: PrecisionOption;
	// eslint-disable-next-line sonarjs/cognitive-complexity
}): any => [
	{
		stroke: isDarkMode ? 'white' : 'black', // Color of the axis line
		grid: {
			stroke: getGridColor(isDarkMode), // Color of the grid lines
			width: isLogScale ? 0.1 : 0.2, // Width of the grid lines,
			show: true,
		},
		ticks: {
			// stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
			width: 0.3, // Width of the tick lines,
			show: true,
		},
		...(PANEL_TYPES_WITH_X_AXIS_DATETIME_FORMAT.includes(panelType)
			? {
					values: uPlotXAxisValuesFormat,
			  }
			: {}),
		gap: 5,
	},
	{
		stroke: isDarkMode ? 'white' : 'black', // Color of the axis line
		grid: {
			stroke: getGridColor(isDarkMode), // Color of the grid lines
			width: isLogScale ? 0.1 : 0.2, // Width of the grid lines
		},
		ticks: {
			// stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
			width: 0.3, // Width of the tick lines
			show: true,
		},
		...(isLogScale ? { space: 20 } : {}),
		values: (_, t): string[] =>
			t.map((v) => {
				if (v === null || v === undefined || Number.isNaN(v)) {
					return '';
				}
				const value = getToolTipValue(v.toString(), yAxisUnit, decimalPrecision);
				return `${value}`;
			}),
		gap: 5,
		size: (self, values, axisIdx, cycleNum): number => {
			const axis = self.axes[axisIdx];

			// bail out, force convergence
			if (cycleNum > 1) return axis._size;

			let axisSize = axis.ticks.size + axis.gap;

			// find longest value
			const longestVal = (values ?? []).reduce(
				(acc, val) => (val.length > acc.length ? val : acc),
				'',
			);

			if (longestVal !== '' && self) {
				// eslint-disable-next-line prefer-destructuring, no-param-reassign
				self.ctx.font = axis.font[0];
				axisSize += self.ctx.measureText(longestVal).width / devicePixelRatio;
			}

			return Math.ceil(axisSize);
		},
	},
];
export default getAxes;
