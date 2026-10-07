import type { PanelStatusDetail } from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelStatus/types';

import { MAX_PLOTTED_GROUPS } from './prepareData';
import {
	ScatterDimension,
	type ScatterPlotData,
	ScatterPlotDataStatus,
	type StaleDimension,
} from './types';

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

const STALE_FALLBACK: Record<ScatterDimension, string> = {
	[ScatterDimension.X]: 'X falls back to Auto',
	[ScatterDimension.Y]: 'Y falls back to Auto',
	[ScatterDimension.Size]: 'every dot is one size',
	[ScatterDimension.Colour]: "it's left out of the colour",
};

function staleNote({ dimension, key }: StaleDimension): string {
	return `${dimension} uses ${key}, which isn't in the results, so ${STALE_FALLBACK[dimension]}.`;
}

function formatCount(count: number): string {
	return count.toLocaleString('en-US');
}

/**
 * Groups the plot left out (the cap, a missing X or Y, a value a log axis
 * can't place) and dimensions bound to a column the result lacks. Null when
 * nothing needs saying, or nothing plots (the empty state explains that).
 */
export function getScatterPlotWarning(
	data: ScatterPlotData,
): PanelStatusDetail | null {
	if (data.status !== ScatterPlotDataStatus.Ready || data.drawnGroups === 0) {
		return null;
	}
	const atCap = data.totalGroups >= MAX_PLOTTED_GROUPS;
	const groupsLeftOut = atCap || data.drawnGroups < data.totalGroups;
	const messages = [
		...data.staleDimensions.map(staleNote),
		atCap && 'Add a filter or narrow the group by to see the rest.',
		data.missingValueGroups > 0 &&
			`${formatCount(data.missingValueGroups)} ${pluralizeGroups(data.missingValueGroups)} missing an X or Y value.`,
		data.nonPositiveOnLogGroups > 0 &&
			`${logAxisNote(data.nonPositiveOnLogGroups)}. Switch the axis to symlog to show them.`,
	].filter((message): message is string => Boolean(message));
	if (messages.length === 0) {
		return null;
	}
	return {
		message: atCap
			? `Showing the first ${formatCount(data.drawnGroups)} groups.`
			: groupsLeftOut
				? `Showing ${formatCount(data.drawnGroups)} of ${formatCount(data.totalGroups)} groups.`
				: "Some dimensions aren't in the results.",
		messages,
	};
}
