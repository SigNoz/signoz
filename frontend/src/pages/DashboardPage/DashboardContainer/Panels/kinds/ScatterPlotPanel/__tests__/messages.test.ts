import { getScatterPlotEmptyMessage, getScatterPlotWarning } from '../messages';
import {
	ScatterDimension,
	type ScatterPlotData,
	ScatterPlotDataStatus,
	type StaleDimension,
} from '../types';

function ready(counts: {
	totalGroups: number;
	drawnGroups: number;
	missingValueGroups?: number;
	nonPositiveOnLogGroups?: number;
	cappedGroups?: number;
	staleDimensions?: StaleDimension[];
}): ScatterPlotData {
	return {
		status: ScatterPlotDataStatus.Ready,
		series: [],
		pointLabels: [],
		channels: { x: { label: 'x' }, y: { label: 'y' } },
		axisQueries: { x: 'A', y: 'A' },
		missingValueGroups: 0,
		nonPositiveOnLogGroups: 0,
		cappedGroups: 0,
		staleDimensions: [],
		...counts,
	};
}

describe('getScatterPlotEmptyMessage', () => {
	it('leaves an empty result to the plain no-data state', () => {
		expect(
			getScatterPlotEmptyMessage({
				status: ScatterPlotDataStatus.NeedsSecondValue,
				totalGroups: 0,
			}),
		).toBeUndefined();
		expect(
			getScatterPlotEmptyMessage(ready({ totalGroups: 0, drawnGroups: 0 })),
		).toBeUndefined();
	});

	it('asks for a second value', () => {
		expect(
			getScatterPlotEmptyMessage({
				status: ScatterPlotDataStatus.NeedsSecondValue,
				totalGroups: 3,
			})?.title,
		).toBe('Add a second aggregation or query');
	});

	it('says nothing once a group plots', () => {
		expect(
			getScatterPlotEmptyMessage(
				ready({ totalGroups: 3, drawnGroups: 1, missingValueGroups: 2 }),
			),
		).toBeUndefined();
	});

	it('points at the group by when no group has both values', () => {
		expect(
			getScatterPlotEmptyMessage(
				ready({ totalGroups: 52, drawnGroups: 0, missingValueGroups: 52 }),
			),
		).toStrictEqual({
			title: '0 of 52 groups plotted',
			description:
				'No group has both an X and a Y value. Group every query by exactly the same labels; a group missing from one query has no dot.',
		});
	});

	it('points at symlog when a log axis hid every group', () => {
		expect(
			getScatterPlotEmptyMessage(
				ready({ totalGroups: 1, drawnGroups: 0, nonPositiveOnLogGroups: 1 }),
			),
		).toStrictEqual({
			title: '0 of 1 group plotted',
			description:
				"1 group with a value ≤ 0 can't go on a log axis. Switch the axis to symlog to show them.",
		});
	});
});

describe('getScatterPlotWarning', () => {
	it('is null when every group plots', () => {
		expect(
			getScatterPlotWarning(ready({ totalGroups: 4, drawnGroups: 4 })),
		).toBeNull();
	});

	it('leaves a plot with no dots to the empty state', () => {
		expect(
			getScatterPlotWarning(
				ready({ totalGroups: 4, drawnGroups: 0, missingValueGroups: 4 }),
			),
		).toBeNull();
	});

	it('counts the groups shown and why the rest are missing', () => {
		expect(
			getScatterPlotWarning(
				ready({
					totalGroups: 52,
					drawnGroups: 37,
					missingValueGroups: 12,
					nonPositiveOnLogGroups: 3,
				}),
			),
		).toStrictEqual({
			message: 'Showing 37 of 52 groups.',
			messages: [
				'12 groups missing an X or Y value.',
				"3 groups with a value ≤ 0 can't go on a log axis. Switch the axis to symlog to show them.",
			],
		});
	});

	it('flags a result at the cap', () => {
		expect(
			getScatterPlotWarning(
				ready({
					totalGroups: 584393,
					drawnGroups: 10000,
					cappedGroups: 574393,
				}),
			),
		).toStrictEqual({
			message: 'Showing the first 10,000 groups.',
			messages: ['Add a filter or narrow the group by to see the rest.'],
		});
	});

	it('treats a result at the server limit as capped', () => {
		expect(
			getScatterPlotWarning(ready({ totalGroups: 10000, drawnGroups: 10000 }))
				?.message,
		).toBe('Showing the first 10,000 groups.');
	});

	it('names dimensions bound to columns the result lacks', () => {
		expect(
			getScatterPlotWarning(
				ready({
					totalGroups: 4,
					drawnGroups: 4,
					staleDimensions: [
						{ dimension: ScatterDimension.X, key: 'A.count()' },
						{ dimension: ScatterDimension.Colour, key: 'host.name' },
					],
				}),
			),
		).toStrictEqual({
			message: "Some dimensions aren't in the results.",
			messages: [
				"X uses A.count(), which isn't in the results, so X falls back to Auto.",
				"Colour uses host.name, which isn't in the results, so it's left out of the colour.",
			],
		});
	});
});
