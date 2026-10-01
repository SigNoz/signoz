import { useMemo } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { getScalarResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

/**
 * Group-by labels of a joined scalar result, the keys a group column is stored
 * under. Empty for kinds that don't join their scalar rows or before data arrives.
 */
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
		const table = prepareScalarTables({
			results: getScalarResults(data.response),
			legendMap: data.legendMap,
			requestPayload: data.requestPayload,
		}).find((candidate) => candidate.columns.length > 0);
		return (table?.columns ?? [])
			.filter((column) => !column.isValueColumn)
			.map((column) => column.id);
	}, [
		panel.spec.plugin.kind,
		data.response,
		data.legendMap,
		data.requestPayload,
	]);
}
