/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { getToolTipValue } from 'components/Graph/yAxisConfig';

import getGridColor from './getGridColor';

function format24HourTime(ts, includeDate = false): string {
	const date = new Date(ts * 1000);
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const timeStr = `${hours}:${minutes}`;

	if (includeDate) {
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		const dateStr = `${month}/${day}/${year}`;
		return `${timeStr}\n${dateStr}`;
	}

	return timeStr;
}

const getAxes = (
	isDarkMode: boolean,
	yAxisUnit?: string,
	timeFormat?: '24H' | '12H',
): any => [
	{
		stroke: isDarkMode ? 'white' : 'black', // Color of the axis line
		grid: {
			stroke: getGridColor(isDarkMode), // Color of the grid lines
			width: 0.2, // Width of the grid lines,
			show: true,
		},
		ticks: {
			// stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
			width: 0.3, // Width of the tick lines,
			show: true,
		},
		gap: 5,
		...(timeFormat === '24H'
			? {
					values: (_self, ticks): any =>
						ticks.map((ts, i) => format24HourTime(ts, i % 5 === 0)), // Include date every 5th tick
			  }
			: {}),
	},
	{
		stroke: isDarkMode ? 'white' : 'black', // Color of the axis line
		grid: {
			stroke: getGridColor(isDarkMode), // Color of the grid lines
			width: 0.2, // Width of the grid lines
		},
		ticks: {
			// stroke: isDarkMode ? 'white' : 'black', // Color of the tick lines
			width: 0.3, // Width of the tick lines
			show: true,
		},
		values: (_, t): string[] =>
			t.map((v) => {
				const value = getToolTipValue(v.toString(), yAxisUnit);

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
