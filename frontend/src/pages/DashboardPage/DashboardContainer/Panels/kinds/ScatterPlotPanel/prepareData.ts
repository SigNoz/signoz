import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxisDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { ScatterSeries } from 'lib/visualization/charts/Scatter/utils';
import type { ScatterPointLabel } from 'lib/uPlotV2/plugins/ScatterPlugin/types';
import type {
	PanelTableColumn,
	PanelTableRow,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { getColumnUnit } from '../../utils/getColumnUnit';
import { getValueColumnLabels } from '../../utils/getValueColumnLabels';

import {
	type PrepareScatterPlotDataArgs,
	type ScatterPlotData,
	ScatterPlotDataStatus,
} from './types';

/** Series label when the query has no group by to colour by. */
export const UNGROUPED_SERIES_LABEL = 'All';

/**
 * A finite number, or null. The backend sends NaN/±Inf as the strings
 * `"NaN"`/`"Inf"`/`"-Inf"` and fills join misses with `"n/a"`; none of those
 * may plot, least of all as 0.
 */
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

function toLabelValue(value: unknown): string {
	return typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
		? String(value)
		: '';
}

function findColumn(
	columns: PanelTableColumn[],
	key: string | undefined,
): PanelTableColumn | undefined {
	return key ? columns.find((column) => column.id === key) : undefined;
}

function isPlaceable(
	value: number,
	axis: DashboardtypesScatterPlotAxisDTO | undefined,
): boolean {
	return axis?.scale !== DashboardtypesAxisScaleDTO.log || value > 0;
}

function getPointLabels(
	row: PanelTableRow,
	groupColumns: PanelTableColumn[],
): ScatterPointLabel[] {
	return groupColumns.map((column) => ({
		key: column.name,
		value: toLabelValue(row.data[column.id]),
	}));
}

/** Joins the values of a dot's colour keys into its series label. */
export const COLOR_LABEL_SEPARATOR = ', ';

/**
 * The selected colour keys the result has; every group-by column when none
 * is selected or none of the selection is left.
 */
function resolveColorColumns(
	groupColumns: PanelTableColumn[],
	keys: string[] | null | undefined,
): PanelTableColumn[] {
	const selected = groupColumns.filter((column) => keys?.includes(column.id));
	return selected.length > 0 ? selected : groupColumns;
}

/**
 * One dot per row of the joined scalar table. Unset or stale dimensions fall back
 * to the first two value columns and every group-by label.
 */
export function prepareScatterPlotData({
	table,
	dimensions,
	axes,
	columnUnits,
}: PrepareScatterPlotDataArgs): ScatterPlotData {
	const columns = table?.columns ?? [];
	const rows = table?.rows ?? [];
	const valueColumns = columns.filter((column) => column.isValueColumn);
	const groupColumns = columns.filter((column) => !column.isValueColumn);

	const xColumn = findColumn(valueColumns, dimensions?.x) ?? valueColumns[0];
	const yColumn =
		findColumn(valueColumns, dimensions?.y) ??
		valueColumns.find((column) => column !== xColumn);
	if (!xColumn || !yColumn) {
		return {
			status: ScatterPlotDataStatus.NeedsSecondValue,
			totalGroups: rows.length,
		};
	}
	const sizeColumn = findColumn(valueColumns, dimensions?.size);
	const colorColumns = resolveColorColumns(groupColumns, dimensions?.color);

	const seriesByLabel = new Map<
		string,
		{ series: ScatterSeries; labels: ScatterPointLabel[][] }
	>();
	let drawnGroups = 0;
	let missingValueGroups = 0;
	let nonPositiveOnLogGroups = 0;

	rows.forEach((row) => {
		const x = toFiniteNumber(row.data[xColumn.id]);
		const y = toFiniteNumber(row.data[yColumn.id]);
		if (x === null || y === null) {
			missingValueGroups += 1;
			return;
		}
		if (!isPlaceable(x, axes?.x) || !isPlaceable(y, axes?.y)) {
			nonPositiveOnLogGroups += 1;
			return;
		}
		const label =
			colorColumns.length > 0
				? colorColumns
						.map((column) => toLabelValue(row.data[column.id]))
						.join(COLOR_LABEL_SEPARATOR)
				: UNGROUPED_SERIES_LABEL;
		let entry = seriesByLabel.get(label);
		if (!entry) {
			entry = {
				series: { label, xs: [], ys: [], ...(sizeColumn && { sizes: [] }) },
				labels: [],
			};
			seriesByLabel.set(label, entry);
		}
		entry.series.xs.push(x);
		entry.series.ys.push(y);
		entry.series.sizes?.push(
			sizeColumn ? toFiniteNumber(row.data[sizeColumn.id]) : null,
		);
		entry.labels.push(getPointLabels(row, groupColumns));
		drawnGroups += 1;
	});

	const entries = [...seriesByLabel.values()];
	const labels = getValueColumnLabels(columns);
	const toChannel = (
		column: PanelTableColumn,
		axisLabel?: string,
	): { label: string; unit: string | undefined } => ({
		label: axisLabel || (labels[column.id] ?? column.name),
		unit: getColumnUnit(column.id, columnUnits),
	});
	return {
		status: ScatterPlotDataStatus.Ready,
		series: entries.map((entry) => entry.series),
		pointLabels: entries.map((entry) => entry.labels),
		channels: {
			x: toChannel(xColumn, axes?.x?.label),
			y: toChannel(yColumn, axes?.y?.label),
			...(sizeColumn && { size: toChannel(sizeColumn) }),
		},
		axisQueries: { x: xColumn.queryName, y: yColumn.queryName },
		totalGroups: rows.length,
		drawnGroups,
		missingValueGroups,
		nonPositiveOnLogGroups,
	};
}
