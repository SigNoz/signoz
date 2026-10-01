import {
	getScatterPlotEmptyMessage,
	getScatterPlotFooterText,
} from '../messages';
import { type ScatterPlotData, ScatterPlotDataStatus } from '../types';

function ready(counts: {
	totalGroups: number;
	drawnGroups: number;
	missingValueGroups?: number;
	nonPositiveOnLogGroups?: number;
}): ScatterPlotData {
	return {
		status: ScatterPlotDataStatus.Ready,
		series: [],
		pointLabels: [],
		channels: { x: { label: 'x' }, y: { label: 'y' } },
		missingValueGroups: 0,
		nonPositiveOnLogGroups: 0,
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

describe('getScatterPlotFooterText', () => {
	it('is absent when every group plots', () => {
		expect(
			getScatterPlotFooterText(ready({ totalGroups: 4, drawnGroups: 4 })),
		).toBeUndefined();
	});

	it('counts the groups shown', () => {
		expect(
			getScatterPlotFooterText(
				ready({ totalGroups: 52, drawnGroups: 37, missingValueGroups: 15 }),
			),
		).toBe('Showing 37 of 52 groups');
	});

	it('calls out the groups a log axis hid', () => {
		expect(
			getScatterPlotFooterText(
				ready({
					totalGroups: 52,
					drawnGroups: 37,
					missingValueGroups: 12,
					nonPositiveOnLogGroups: 3,
				}),
			),
		).toBe(
			"Showing 37 of 52 groups · 3 groups with a value ≤ 0 can't go on a log axis",
		);
	});
});
