import type { GeoMapPlacement } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';

import type { TableColumnOption } from '../../../hooks/useTableColumns';

export interface ThresholdColorColumn {
	label: string;
	unit?: string;
}

/** The Color by column a Geo Map's thresholds compare against. */
export function resolveColorColumn(
	placement: GeoMapPlacement | undefined,
	tableColumns: TableColumnOption[],
): ThresholdColorColumn | undefined {
	const column = placement?.data.colorColumn;
	if (!column) {
		return undefined;
	}
	const option = tableColumns.find((candidate) => candidate.key === column.id);
	return { label: option?.label ?? column.name, unit: option?.unit };
}
