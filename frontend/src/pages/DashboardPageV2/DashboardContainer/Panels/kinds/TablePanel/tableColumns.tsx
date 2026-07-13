import type { TableProps } from 'antd';
import type { DashboardtypesTableThresholdDTO } from 'api/generated/services/sigNoz.schemas';
import type { PrecisionOption } from 'components/Graph/types';
import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { coerceToString } from 'utils/stringUtils';

import type { PanelThreshold } from '../../types/threshold';
import { resolveActiveThreshold } from '../../utils/evaluateThresholds';
import { formatPanelValue } from '../../utils/formatPanelValue';
import { getColumnUnit } from '../../utils/getColumnUnit';
import { toPanelThreshold } from '../../utils/mapComparisonThreshold';

import styles from './TablePanel.module.scss';

/** A prepared scalar-table row flattened for the antd Table, with the antd key. */
export type TableRowData = Record<string, unknown> & { key: number };

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

/**
 * Plain-text value of a table cell (value columns formatted through unit +
 * precision, group columns raw). Shared by the renderer and the CSV export.
 */
export function formatTableCellText(
	col: PanelTableColumn,
	raw: unknown,
	unit: string | undefined,
	decimalPrecision?: PrecisionOption,
): string {
	if (!col.isValueColumn) {
		return coerceToString(raw);
	}
	const num = Number(raw);
	if (!Number.isFinite(num)) {
		return coerceToString(raw);
	}
	return formatPanelValue(num, unit, decimalPrecision);
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
	return coerceToString(a).localeCompare(coerceToString(b));
}

export interface BuildTableColumnsArgs {
	table: PanelTable;
	/** Per-column display unit (`formatting.columnUnits`), keyed by column name. */
	columnUnits: Record<string, string>;
	decimalPrecision?: PrecisionOption;
	/** Thresholds grouped by column name (see `mapTableThresholds`). */
	thresholdsByColumn: Record<string, PanelThreshold[]>;
	/** When set, every body cell becomes a drill-down target (keyed by its column id). */
	onCellClick?: (args: {
		columnId: string;
		record: TableRowData;
		event: React.MouseEvent<HTMLElement>;
	}) => void;
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
	onCellClick,
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
				const text = formatTableCellText(col, raw, unit, decimalPrecision);
				const num = Number(raw);
				if (
					!col.isValueColumn ||
					colThresholds.length === 0 ||
					!Number.isFinite(num)
				) {
					return text;
				}
				const { threshold } = resolveActiveThreshold(colThresholds, num, unit);
				if (threshold?.format === 'text') {
					return <span style={{ color: threshold.color }}>{text}</span>;
				}
				return text;
			},
			onCell: (record: TableRowData): React.HTMLAttributes<HTMLElement> => {
				const cellProps: React.HTMLAttributes<HTMLElement> = {};

				if (col.isValueColumn && colThresholds.length > 0) {
					const num = Number(record[key]);
					if (Number.isFinite(num)) {
						const { threshold } = resolveActiveThreshold(colThresholds, num, unit);
						if (threshold?.format === 'background') {
							cellProps.style = { backgroundColor: threshold.color };
						}
					}
				}

				if (onCellClick) {
					cellProps.onClick = (event): void =>
						onCellClick({ columnId: key, record, event });
					cellProps.className = styles.clickableCell;
				}

				return cellProps;
			},
		};
	});
}
