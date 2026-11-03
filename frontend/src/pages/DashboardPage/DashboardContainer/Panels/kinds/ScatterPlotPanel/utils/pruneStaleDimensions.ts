import {
	type DashboardtypesPanelSpecDTO,
	type DashboardtypesScatterPlotPanelSpecDTO,
	Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType,
	Querybuildertypesv5QueryEnvelopePromQLDTOType,
} from 'api/generated/services/sigNoz.schemas';

import { toQueryEnvelopes } from '../../../../queryV5/buildQueryRangeRequest';
import { getBuilderQueries } from '../../../utils/getBuilderQueries';
import { getTableColumnKeys } from '../../../utils/getTableColumnKeys';

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
	const hasRuntimeColumns = toQueryEnvelopes(queries).some(
		(envelope) =>
			envelope.type ===
				Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType.clickhouse_sql ||
			envelope.type === Querybuildertypesv5QueryEnvelopePromQLDTOType.promql,
	);
	if (hasRuntimeColumns) {
		return spec;
	}

	const pluginSpec = plugin.spec as DashboardtypesScatterPlotPanelSpecDTO;
	const dimensions = pluginSpec.dimensions ?? {};
	const valueKeys = new Set(getTableColumnKeys(queries));
	const groupKeys = new Set(
		getBuilderQueries(queries).flatMap((query) =>
			(query.groupBy ?? []).map((key) => key.name),
		),
	);
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
