import type { TableProps } from 'antd';
import type { DashboardtypesTableThresholdDTO } from 'api/generated/services/sigNoz.schemas';
import type { PrecisionOption } from 'components/Graph/types';
import type { PanelTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import type { PanelThreshold } from '../../types/threshold';
import { resolveActiveThreshold } from '../../utils/evaluateThresholds';
import { formatPanelValue } from '../../utils/formatPanelValue';
import { toPanelThreshold } from '../../utils/mapComparisonThreshold';

type TableRowData = Record<string, unknown>;

// Resolve a column's unit by its key (queryName / queryName.expression), falling
// back to the base query name for the legacy `queryName.expression` syntax — mirrors
// V1 `getColumnUnit`. An empty entry means "no unit".
function getColumnUnit(
	key: string,
	columnUnits: Record<string, string>,
): string | undefined {
	if (columnUnits[key] !== undefined) {
		return columnUnits[key] || undefined;
	}
	if (key.includes('.')) {
		const baseQuery = key.split('.')[0];
		if (columnUnits[baseQuery] !== undefined) {
			return columnUnits[baseQuery] || undefined;
		}
	}
	return undefined;
}

// Safely render a raw cell value (typed `unknown`) as text: primitives stringify
// directly, objects fall back to JSON, nullish to empty.
function stringifyCell(raw: unknown): string {
	if (raw == null) {
		return '';
	}
	if (typeof raw === 'object') {
		return JSON.stringify(raw);
	}
	if (typeof raw === 'string') {
		return raw;
	}
	if (typeof raw === 'number' || typeof raw === 'boolean') {
		return String(raw);
	}
	return '';
}

/**
 * Groups table thresholds by the column they target, mapping each onto the
 * V2-native `PanelThreshold` consumed by `resolveActiveThreshold`. A column with
 * no thresholds simply has no entry.
 */
export function mapTableThresholds(
	thresholds: DashboardtypesTableThresholdDTO[] | null | undefined,
): Record<string, PanelThreshold[]> {
	const byColumn: Record<string, PanelThreshold[]> = {};
	(thresholds ?? []).forEach((threshold) => {
		(byColumn[threshold.columnName] ??= []).push(toPanelThreshold(threshold));
	});
	return byColumn;
}

// Sort comparator: numeric when both cells parse as numbers (value columns and
// numeric group keys), otherwise a locale string compare. Nullish sorts last.
function compareCells(a: unknown, b: unknown): number {
	const aNum = Number(a);
	const bNum = Number(b);
	if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
		return aNum - bNum;
	}
	if (a == null) {
		return b == null ? 0 : 1;
	}
	if (b == null) {
		return -1;
	}
	return stringifyCell(a).localeCompare(stringifyCell(b));
}

export interface BuildTableColumnsArgs {
	table: PanelTable;
	/** Per-column display unit (`formatting.columnUnits`), keyed by column name. */
	columnUnits: Record<string, string>;
	decimalPrecision?: PrecisionOption;
	/** Thresholds grouped by column name (see `mapTableThresholds`). */
	thresholdsByColumn: Record<string, PanelThreshold[]>;
}

/**
 * Builds antd Table columns from a prepared scalar table. Value columns format
 * their cell through the column's unit + decimal precision and recolor via the
 * matching threshold (text → font colour, background → cell fill); group columns
 * render their raw label. Every column is sortable.
 */
export function buildTableColumns({
	table,
	columnUnits,
	decimalPrecision,
	thresholdsByColumn,
}: BuildTableColumnsArgs): TableProps<TableRowData>['columns'] {
	return table.columns.map((col) => {
		// Column key = query identifier for value columns, group name otherwise. Units
		// and thresholds are stored against this key (V1 parity), matching the dataIndex.
		const key = col.id || col.name;
		const unit = getColumnUnit(key, columnUnits);
		const colThresholds = thresholdsByColumn[key] ?? [];

		return {
			title: col.name,
			dataIndex: key,
			key,
			sorter: (a: TableRowData, b: TableRowData): number =>
				compareCells(a[key], b[key]),
			render: (raw: unknown): React.ReactNode => {
				if (!col.isValueColumn) {
					return stringifyCell(raw);
				}
				const num = Number(raw);
				if (!Number.isFinite(num)) {
					return stringifyCell(raw);
				}
				const text = formatPanelValue(num, unit, decimalPrecision);
				if (colThresholds.length === 0) {
					return text;
				}
				const { threshold } = resolveActiveThreshold(colThresholds, num, unit);
				if (threshold?.format === 'text') {
					return <span style={{ color: threshold.color }}>{text}</span>;
				}
				return text;
			},
			onCell: (record: TableRowData): { style?: React.CSSProperties } => {
				if (!col.isValueColumn || colThresholds.length === 0) {
					return {};
				}
				const num = Number(record[key]);
				if (!Number.isFinite(num)) {
					return {};
				}
				const { threshold } = resolveActiveThreshold(colThresholds, num, unit);
				if (threshold?.format === 'background') {
					return { style: { backgroundColor: threshold.color } };
				}
				return {};
			},
		};
	});
}
