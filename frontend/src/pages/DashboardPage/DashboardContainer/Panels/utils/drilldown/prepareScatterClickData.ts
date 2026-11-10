import { isValidQueryName } from 'container/QueryTable/Drilldown/drilldownUtils';
import type { ScatterPointLabel } from 'lib/uPlotV2/plugins/ScatterPlugin/types';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import type { DrilldownClickPayload } from '../../types/drilldown';

import { getGroupByFilters } from './getGroupByFilters';
import { resolveDrilldownSignal } from './signal';

interface PrepareScatterClickDataArgs {
	labels: ScatterPointLabel[];
	/** Legend label. */
	label: string;
	color: string;
	/** Y's query first: a dot is placed by both, but Y is usually what was measured. */
	axisQueries: { x: string; y: string };
	builderQueries: BuilderQuery[];
	coordinates: { x: number; y: number };
	/** The panel's fetched window; a dot summarises all of it. */
	timeRange?: { startTime: number; endTime: number };
}

/** Drilldown filtered to the dot's group, via Y's builder query else X's; null if neither. */
export function prepareScatterClickData({
	labels,
	label,
	color,
	axisQueries,
	builderQueries,
	coordinates,
	timeRange,
}: PrepareScatterClickDataArgs): DrilldownClickPayload | null {
	const queryName = [axisQueries.y, axisQueries.x].find(
		(name) =>
			isValidQueryName(name) &&
			builderQueries.some((query) => query.name === name),
	);
	const builderQuery = builderQueries.find((query) => query.name === queryName);
	if (!queryName || !builderQuery) {
		return null;
	}

	const groupLabels = Object.fromEntries(
		labels.map((point) => [point.key, point.value]),
	);
	return {
		coordinates,
		context: {
			queryName,
			signal: resolveDrilldownSignal(builderQuery),
			filters: getGroupByFilters(groupLabels, builderQuery),
			timeRange,
			label,
			seriesColor: color,
		},
	};
}
