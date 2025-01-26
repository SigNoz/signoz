/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { Axis } from 'uplot';

import getGridColor from './getGridColor';

const getAxes = (isDarkMode: boolean, yAxisUnit?: string): Axis[] => [
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
		values: [
			[3600 * 24 * 365, '{YYYY}', null, null, null, null, null, null, 1],
			[3600 * 24 * 28, '{MMM}', '\n{YYYY}', null, null, null, null, null, 1],
			[3600 * 24, '{M}/{D}', '\n{YYYY}', null, null, null, null, null, 1],
			[
				3600,
				'{HH}:{mm}',
				'\n{M}/{D}/{YY}',
				null,
				'\n{M}/{D}',
				null,
				null,
				null,
				1,
			],
			[60, '{HH}:{mm}', '\n{M}/{D}/{YY}', null, '\n{M}/{D}', null, null, null, 1],
			[
				1,
				':{ss}',
				'\n{M}/{D}/{YY} {HH}:{mm}',
				null,
				'\n{M}/{D} {HH}:{mm}',
				null,
				'\n{HH}:{mm}',
				null,
				1,
			],
			[
				0.001,
				':{ss}.{fff}',
				'\n{M}/{D}/{YY} {HH}:{mm}',
				null,
				'\n{M}/{D} {HH}:{mm}',
				null,
				'\n{HH}:{mm}',
				null,
				1,
			],
		],
		gap: 5,
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
