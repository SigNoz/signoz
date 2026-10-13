import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import type { TableColumnOption } from '../../hooks/useTableColumns';

/** Mirrors the renderer: bound key, else X = first value column, Y = first other. */
export function resolveAutoAxes(
	columns: TableColumnOption[],
	bound: { x?: string; y?: string },
): { x?: TableColumnOption; y?: TableColumnOption } {
	const x = columns.find((column) => column.key === bound.x) ?? columns[0];
	const y =
		columns.find((column) => column.key === bound.y) ??
		columns.find((column) => column !== x);
	return { x, y };
}

function resolveScatterAxisColumns(
	spec: DashboardtypesPanelSpecDTO,
	tableColumns: TableColumnOption[],
): { x?: TableColumnOption; y?: TableColumnOption } | null {
	if (spec.plugin.kind !== 'signoz/ScatterPlotPanel') {
		return null;
	}
	return resolveAutoAxes(tableColumns, {
		x: spec.plugin.spec.dimensions?.x,
		y: spec.plugin.spec.dimensions?.y,
	});
}

export function getScatterAxisColumnNames(
	spec: DashboardtypesPanelSpecDTO,
	tableColumns: TableColumnOption[] = [],
): { x?: string; y?: string } {
	const axes = resolveScatterAxisColumns(spec, tableColumns);
	return axes ? { x: axes.x?.name, y: axes.y?.name } : {};
}

export function getScatterAxisColumnUnits(
	spec: DashboardtypesPanelSpecDTO,
	tableColumns: TableColumnOption[] = [],
): { x?: string; y?: string } {
	const axes = resolveScatterAxisColumns(spec, tableColumns);
	return axes ? { x: axes.x?.unit, y: axes.y?.unit } : {};
}
