import { MAX_PLOTTED_GROUPS } from './prepareData';
import { type ScatterPlotData, ScatterPlotDataStatus } from './types';

export interface ScatterPlotMessage {
	title: string;
	description: string;
}

function pluralizeGroups(count: number): string {
	return count === 1 ? 'group' : 'groups';
}

function logAxisNote(count: number): string {
	return `${count} ${pluralizeGroups(count)} with a value ≤ 0 can't go on a log axis`;
}

/**
 * Why a query that returned groups still plots nothing. Undefined when the
 * query returned no groups (the plain no-data state) or something plots.
 */
export function getScatterPlotEmptyMessage(
	data: ScatterPlotData,
): ScatterPlotMessage | undefined {
	if (data.totalGroups === 0) {
		return undefined;
	}
	if (data.status === ScatterPlotDataStatus.NeedsSecondValue) {
		return {
			title: 'Add a second aggregation or query',
			description:
				'Each dot needs two values, one for X and one for Y. Add an aggregation to this query, or another query grouped by the same labels.',
		};
	}
	if (data.drawnGroups > 0) {
		return undefined;
	}
	const title = `0 of ${data.totalGroups} ${pluralizeGroups(data.totalGroups)} plotted`;
	if (data.missingValueGroups === 0) {
		return {
			title,
			description: `${logAxisNote(data.nonPositiveOnLogGroups)}. Switch the axis to symlog to show them.`,
		};
	}
	return {
		title,
		description:
			'No group has both an X and a Y value. Group every query by exactly the same labels; a group missing from one query has no dot.',
	};
}

function formatCount(count: number): string {
	return count.toLocaleString('en-US');
}

/**
 * "Showing N of M groups", with the cap and the log-axis share called out.
 * Undefined when every group plots.
 */
export function getScatterPlotFooterText(
	data: ScatterPlotData,
): string | undefined {
	if (
		data.status !== ScatterPlotDataStatus.Ready ||
		data.drawnGroups === data.totalGroups
	) {
		return undefined;
	}
	return [
		`Showing ${formatCount(data.drawnGroups)} of ${formatCount(data.totalGroups)} groups`,
		data.cappedGroups > 0 &&
			`Plots the first ${formatCount(MAX_PLOTTED_GROUPS)}; filter or narrow the group by to see the rest`,
		data.nonPositiveOnLogGroups > 0 && logAxisNote(data.nonPositiveOnLogGroups),
	]
		.filter(Boolean)
		.join(' · ');
}
