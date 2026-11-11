import { useMemo } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import { getJoinedScalarTable } from 'pages/DashboardPage/DashboardContainer/Panels/utils/getJoinedScalarTable';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

/** Group-by column ids of the joined scalar result; empty for non-joining kinds. */
export function useGroupColumns(
	panel: DashboardtypesPanelDTO,
	data: PanelQueryData,
): string[] {
	return useMemo(() => {
		if (
			!getQueryPanelDefinition(panel.spec.plugin.kind)?.queryCapabilities
				.formatTableResultForUI
		) {
			return [];
		}
		return (getJoinedScalarTable(data)?.columns ?? [])
			.filter((column) => !column.isValueColumn)
			.map((column) => column.id);
	}, [panel.spec.plugin.kind, data]);
}
