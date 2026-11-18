import type {
	DashboardtypesPanelSpecDTO,
	DashboardtypesScatterPlotPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

import { getQueryColumnKeys } from '../../../utils/getQueryColumnKeys';

/**
 * Clears bindings to columns the queries no longer produce, so a query edit
 * saves what the preview drew (its fallback columns) instead of a binding the
 * API rejects. ClickHouse SQL and PromQL columns are only known at run time.
 */
export function pruneStaleDimensions(
	spec: DashboardtypesPanelSpecDTO,
): DashboardtypesPanelSpecDTO {
	const { plugin, queries } = spec;
	if (plugin.kind !== 'signoz/ScatterPlotPanel') {
		return spec;
	}
	const columnKeys = getQueryColumnKeys(queries);
	if (!columnKeys) {
		return spec;
	}
	const { valueKeys, groupKeys } = columnKeys;

	const pluginSpec = plugin.spec as DashboardtypesScatterPlotPanelSpecDTO;
	const dimensions = pluginSpec.dimensions ?? {};
	const keepValue = (key: string | undefined): string | undefined =>
		key && !valueKeys.has(key) ? '' : key;

	const next = {
		...dimensions,
		x: keepValue(dimensions.x),
		y: keepValue(dimensions.y),
		sizeBy: keepValue(dimensions.sizeBy),
		colorBy: dimensions.colorBy?.filter((label) => groupKeys.has(label)),
	};
	const isUnchanged =
		next.x === dimensions.x &&
		next.y === dimensions.y &&
		next.sizeBy === dimensions.sizeBy &&
		next.colorBy?.length === dimensions.colorBy?.length;
	if (isUnchanged) {
		return spec;
	}
	return {
		...spec,
		plugin: { ...plugin, spec: { ...pluginSpec, dimensions: next } },
	};
}
