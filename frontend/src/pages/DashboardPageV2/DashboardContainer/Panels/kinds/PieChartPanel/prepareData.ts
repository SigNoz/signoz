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

/** One pie slice per (row × value column); column name labels slices when a query has several value columns. */
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
		const valueColumns = table.columns.filter((column) => column.isValueColumn);
		if (valueColumns.length === 0) {
			return;
		}
		const labelColumns = table.columns.filter((column) => !column.isValueColumn);
		const hasMultipleValueColumns = valueColumns.length > 1;

		table.rows.forEach((row) => {
			const groupLabel = labelColumns
				.map((column) => row.data[column.id || column.name])
				.filter((part) => part != null)
				.map(String)
				.join(', ');

			valueColumns.forEach((column) => {
				let label: string;
				if (hasMultipleValueColumns) {
					label = groupLabel ? `${groupLabel} · ${column.name}` : column.name;
				} else {
					label = groupLabel || table.legend || table.queryName || '';
				}

				const color = customColors?.[label] ?? generateColor(label, colorMap);
				slices.push({
					label,
					value: Number(row.data[column.id || column.name]),
					color,
				});
			});
		});
	});

	return slices.filter(
		(slice) => Number.isFinite(slice.value) && slice.value > 0,
	);
}
