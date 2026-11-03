import type { DashboardtypesScatterPlotPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { getJoinedScalarTable } from '../../../utils/getJoinedScalarTable';
import type { ScatterPlotData } from '../types';
import { prepareScatterPlotData } from './prepareData';

type ScatterPlotDataSpec = Pick<
	DashboardtypesScatterPlotPanelSpecDTO,
	'dimensions' | 'axes' | 'formatting'
>;

interface CachedScatterPlotData {
	dimensions: ScatterPlotDataSpec['dimensions'];
	axes: ScatterPlotDataSpec['axes'];
	columnUnits: NonNullable<ScatterPlotDataSpec['formatting']>['columnUnits'];
	result: ScatterPlotData;
}

const cache = new WeakMap<PanelQueryData, CachedScatterPlotData>();

/** Prepares a response once per spec, so the renderer and the header warning share it. */
export function getScatterPlotData(
	data: PanelQueryData,
	{ dimensions, axes, formatting }: ScatterPlotDataSpec,
): ScatterPlotData {
	const columnUnits = formatting?.columnUnits;
	const cached = cache.get(data);
	if (
		cached &&
		cached.dimensions === dimensions &&
		cached.axes === axes &&
		cached.columnUnits === columnUnits
	) {
		return cached.result;
	}
	const result = prepareScatterPlotData({
		table: getJoinedScalarTable(data),
		dimensions,
		axes,
		columnUnits: columnUnits ?? {},
	});
	cache.set(data, { dimensions, axes, columnUnits, result });
	return result;
}
