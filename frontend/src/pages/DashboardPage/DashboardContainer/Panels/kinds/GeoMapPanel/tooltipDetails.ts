import type { GeoMapDetail } from 'lib/visualization/charts/GeoMap/types';
import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { toFiniteNumber } from './prepareData';
import type { GeoMapPanelData } from './types';

interface TooltipDetailsArgs {
	table: PanelTable | undefined;
	data: GeoMapPanelData;
	labels: Record<string, string>;
	formatterFor: (columnId: string) => (value: number) => string;
}

/**
 * Each placed row's value columns besides the color one, formatted in their
 * own units, for the tooltip. The color value already heads it.
 */
export function withTooltipDetails({
	table,
	data,
	labels,
	formatterFor,
}: TooltipDetailsArgs): Pick<GeoMapPanelData, 'regions' | 'points'> {
	const columns = (table?.columns ?? []).filter(
		(column) => column.isValueColumn && column.id !== data.colorColumn?.id,
	);
	if (!table || columns.length === 0) {
		return data;
	}
	const detailsOf = (id: string): GeoMapDetail[] => {
		const row = table.rows[data.rowIndexById.get(id) ?? -1];
		return columns.map((column: PanelTableColumn) => {
			const value = toFiniteNumber(row?.data[column.id]);
			return {
				label: labels[column.id] ?? column.name,
				value: value === null ? '—' : formatterFor(column.id)(value),
			};
		});
	};
	return {
		regions: data.regions.map((datum) => ({
			...datum,
			details: detailsOf(datum.code),
		})),
		points: data.points.map((point) => ({
			...point,
			details: detailsOf(point.id),
		})),
	};
}
