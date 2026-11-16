import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import type { TableColumnOption } from '../../hooks/useTableColumns';

/**
 * What the dots are sized by, mirroring the renderer: a bound key the loaded
 * result no longer has sizes nothing. Before the result loads the key stands in.
 */
export function getSizeColumnLabel(
	spec: DashboardtypesPanelSpecDTO,
	tableColumns: TableColumnOption[] = [],
): string | undefined {
	if (spec.plugin.kind !== 'signoz/ScatterPlotPanel') {
		return undefined;
	}
	const key = spec.plugin.spec.dimensions?.sizeBy;
	if (!key) {
		return undefined;
	}
	if (tableColumns.length === 0) {
		return key;
	}
	return tableColumns.find((column) => column.key === key)?.label;
}
