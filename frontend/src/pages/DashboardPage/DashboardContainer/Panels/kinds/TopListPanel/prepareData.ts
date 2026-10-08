import type {
	PanelTable,
	PanelTableColumn,
	PanelTableRow,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { TopListData, TopListRow } from './types';

export const EMPTY_LABEL = '(empty)';

const LABEL_SEPARATOR = ' · ';
const LEGEND_VARIABLE = /\{\{\s*([^}]+?)\s*\}\}/g;

const EMPTY_DATA: TopListData = {
	rows: [],
	labelColumnNames: [],
	valueColumnName: '',
	ignoredValueColumns: [],
};

/** A missing group value is `null` for traces/logs and `""` for metrics. */
function isMissing(value: unknown): boolean {
	return value == null || value === '';
}

/** Finite numbers only: the server sends NaN/±Inf as "NaN"/"Inf"/"-Inf" and a missing value as "n/a". */
function toFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function toGroupValue(value: unknown): string {
	return typeof value === 'object'
		? JSON.stringify(value)
		: String(value as string | number | boolean);
}

function getCell(row: PanelTableRow, column: PanelTableColumn): unknown {
	return row.data[column.id || column.name];
}

function resolveLabel(
	labelColumns: PanelTableColumn[],
	row: PanelTableRow,
	labels: Record<string, string>,
	table: PanelTable,
): Pick<TopListRow, 'label' | 'isEmptyLabel'> {
	if (table.legend) {
		// Unlike `getLabelName`, a key the row doesn't carry renders empty, not "undefined".
		const label = table.legend.replace(
			LEGEND_VARIABLE,
			(_, key: string) => labels[key] ?? '',
		);
		return { label, isEmptyLabel: false };
	}
	if (labelColumns.length === 0) {
		return { label: table.queryName, isEmptyLabel: false };
	}

	const parts = labelColumns.map((column) => getCell(row, column));
	if (parts.every(isMissing)) {
		return { label: EMPTY_LABEL, isEmptyLabel: true };
	}
	return {
		label: parts
			.map((part) => (isMissing(part) ? EMPTY_LABEL : toGroupValue(part)))
			.join(LABEL_SEPARATOR),
		isEmptyLabel: false,
	};
}

/** Highest value first; non-numeric values last; ties by label so the order is stable across refreshes. */
function compareRows(a: TopListRow, b: TopListRow): number {
	if (a.value === null || b.value === null) {
		if (a.value === b.value) {
			return a.label.localeCompare(b.label);
		}
		return a.value === null ? 1 : -1;
	}
	return b.value - a.value || a.label.localeCompare(b.label);
}

/**
 * Ranks the first value column of the first table that has one. The server already
 * orders and limits, but its order isn't stable on ties, so the rows are sorted again here.
 */
export function prepareTopListRows(tables: PanelTable[]): TopListData {
	const table = tables.find((candidate) =>
		candidate.columns.some((column) => column.isValueColumn),
	);
	if (!table) {
		return EMPTY_DATA;
	}

	const [valueColumn, ...ignoredColumns] = table.columns.filter(
		(column) => column.isValueColumn,
	);
	const labelColumns = table.columns.filter((column) => !column.isValueColumn);

	const rows = table.rows.map((row, index): TopListRow => {
		const labels: Record<string, string> = {};
		labelColumns.forEach((column) => {
			const value = getCell(row, column);
			if (value != null) {
				labels[column.name] = toGroupValue(value);
			}
		});

		const rawValue = getCell(row, valueColumn);
		return {
			key: `${table.queryName}-${index}`,
			...resolveLabel(labelColumns, row, labels, table),
			value: toFiniteNumber(rawValue),
			rawValue,
			ratio: 0,
			queryName: valueColumn.queryName,
			labels,
		};
	});

	const max = Math.max(0, ...rows.map((row) => row.value ?? 0));
	rows.forEach((row) => {
		row.ratio =
			max > 0 && row.value !== null && row.value > 0 ? row.value / max : 0;
	});

	return {
		rows: rows.sort(compareRows),
		labelColumnNames: labelColumns.map((column) => column.name),
		valueColumnName: valueColumn.name,
		ignoredValueColumns: ignoredColumns.map((column) => column.name),
	};
}
