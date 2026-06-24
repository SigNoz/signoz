import { themeColors } from 'constants/theme';
import type { PieSlice } from 'container/DashboardContainer/visualization/charts/types';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import type { PanelTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

export interface PreparePieDataArgs {
	/** Scalar tables from the V5 response (see `prepareScalarTables`). */
	tables: PanelTable[];
	/** Per-label colour overrides from `spec.legend.customColors`. */
	customColors?: Record<string, string> | null;
	isDarkMode: boolean;
}

/**
 * Turns the scalar tables of a V5 response into pie slices (one per group row):
 * value column → value, group column(s) → label. Colours honour `customColors`
 * then fall back to the deterministic palette; non-positive/non-numeric dropped.
 */
export function preparePieData({
	tables,
	customColors,
	isDarkMode,
}: PreparePieDataArgs): PieSlice[] {
	const colorMap = isDarkMode
		? themeColors.chartcolors
		: themeColors.lightModeColor;

	const slices: PieSlice[] = [];
	tables.forEach((table) => {
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
					.map(String)
					.join(', ') ||
				table.legend ||
				table.queryName ||
				'';
			const color = customColors?.[label] ?? generateColor(label, colorMap);
			slices.push({ label, value, color });
		});
	});

	return slices.filter(
		(slice) => Number.isFinite(slice.value) && slice.value > 0,
	);
}
