import { useMemo } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { getScalarResults } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

export interface TableColumnOption {
	/**
	 * Key the column's unit / threshold is stored under — the query identifier
	 * (`queryName`, or `queryName.expression` for multi-aggregation queries). Matches
	 * `PanelTableColumn.id` and the rendered column's `dataIndex` (V1 parity: column
	 * units and thresholds are keyed by the query, not the display name).
	 */
	key: string;
	/** Display label shown in the editor — the resolved column name. */
	label: string;
	/**
	 * The column's configured unit (`formatting.columnUnits[key]`), if any. The
	 * per-column threshold editor scopes its unit picker to this unit's category
	 * (V1 parity), since Table panels have no single panel-wide unit.
	 */
	unit?: string;
}

// Resolve a column's unit by its key, falling back to the base query name (the legacy
// `queryName.expression` → `queryName` syntax) — mirrors the renderer's getColumnUnit.
function resolveColumnUnit(
	key: string,
	columnUnits: Record<string, string>,
): string | undefined {
	if (columnUnits[key]) {
		return columnUnits[key];
	}
	if (key.includes('.')) {
		const baseQuery = key.split('.')[0];
		if (columnUnits[baseQuery]) {
			return columnUnits[baseQuery];
		}
	}
	return undefined;
}

/**
 * Resolves a Table panel's value (aggregation) columns into `{ key, label }`
 * options, so the table-only config editors (column units, per-column thresholds)
 * store the query-keyed value the renderer looks up by while showing the readable
 * column name. Empty for non-table kinds or before data arrives.
 */
export function useTableColumns(
	panel: DashboardtypesPanelDTO,
	data: PanelQueryData,
): TableColumnOption[] {
	return useMemo(() => {
		if (panel?.spec?.plugin?.kind !== 'signoz/TablePanel') {
			return [];
		}
		const table = prepareScalarTables({
			results: getScalarResults(data?.response),
			legendMap: data?.legendMap ?? {},
			requestPayload: data?.requestPayload,
		}).find((candidate) => candidate.columns.length > 0);
		if (!table) {
			return [];
		}
		const columnUnits =
			(
				panel?.spec?.plugin?.spec as
					| { formatting?: { columnUnits?: Record<string, string> | null } }
					| undefined
			)?.formatting?.columnUnits ?? {};
		return table.columns
			.filter((column) => column.isValueColumn)
			.map((column) => {
				const key = column.id || column.name;
				return {
					key,
					label: column.name,
					unit: resolveColumnUnit(key, columnUnits),
				};
			});
	}, [
		panel.spec.plugin.kind,
		panel.spec.plugin.spec,
		data?.response,
		data.legendMap,
		data?.requestPayload,
	]);
}
