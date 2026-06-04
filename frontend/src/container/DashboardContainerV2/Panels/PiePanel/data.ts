import { themeColors } from 'constants/theme';
import type { PieSlice } from 'container/DashboardContainer/visualization/charts/types';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export interface PreparePieDataArgs {
	payload: MetricRangePayloadProps | undefined;
	/** Per-label colour overrides from `spec.legend.customColors`. */
	customColors?: Record<string, string> | null;
	isDarkMode: boolean;
}

// Local view of the scalar/table response. A pie issues a TABLE request (see
// `getGraphType`), which the API returns web-formatted: one aggregation column
// holds the value, the remaining (group) columns form the label, and each row's
// `data` is keyed by `column.id || column.name`. The generated `QueryData.table`
// types its columns loosely (no `isValueColumn`), so we cast to this precise
// shape once at the boundary rather than threading `any` through.
interface ScalarTableColumn {
	name: string;
	id?: string;
	isValueColumn: boolean;
}
interface ScalarTableEntry {
	queryName?: string;
	legend?: string;
	table?: {
		columns: ScalarTableColumn[];
		rows: { data: Record<string, string | number | null> }[];
	};
}

/**
 * Turns a query response into pie slices: one slice per group row.
 *
 * The reduced value-per-series lives in the scalar `table`, not the time-series
 * `result[].values`. Because the pie's graphType is `TABLE`, the response is
 * web-formatted and the table sits on `result[]`; we fall back to `newResult`
 * for the non-`formatForWeb` shape. Labels come from the group column(s),
 * colours honour `customColors` then fall back to a deterministic palette
 * colour, and non-positive / non-numeric values are dropped.
 */
export function preparePieData({
	payload,
	customColors,
	isDarkMode,
}: PreparePieDataArgs): PieSlice[] {
	const primary = (payload?.data?.result ?? []) as unknown as ScalarTableEntry[];
	const fallback = (payload?.data?.newResult?.data?.result ??
		[]) as unknown as ScalarTableEntry[];
	const entries = primary.some((entry) => entry.table) ? primary : fallback;

	const colorMap = isDarkMode
		? themeColors.chartcolors
		: themeColors.lightModeColor;

	const slices: PieSlice[] = [];
	entries.forEach((entry) => {
		const { table } = entry;
		if (!table) {
			return;
		}

		const valueColumn = table.columns.find((column) => column.isValueColumn);
		if (!valueColumn) {
			return;
		}
		const valueKey = valueColumn.id || valueColumn.name;
		const labelColumns = table.columns.filter((column) => !column.isValueColumn);

		table.rows.forEach((row) => {
			const value = Number(row.data[valueKey]);
			const label =
				labelColumns
					.map((column) => row.data[column.id || column.name])
					.filter((part) => part != null)
					.join(', ') ||
				entry.legend ||
				entry.queryName ||
				'';
			const color = customColors?.[label] ?? generateColor(label, colorMap);
			slices.push({ label, value, color });
		});
	});

	return slices.filter(
		(slice) => Number.isFinite(slice.value) && slice.value > 0,
	);
}
