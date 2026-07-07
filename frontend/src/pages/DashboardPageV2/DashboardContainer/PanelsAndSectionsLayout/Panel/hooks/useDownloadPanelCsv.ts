import { useCallback } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getTableCsvRows } from 'pages/DashboardPageV2/DashboardContainer/Panels/kinds/TablePanel/tableCsv';
import type { PanelOfKind } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
import { downloadCsv } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/downloadCsv';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

interface UseDownloadPanelCsvArgs {
	panel: DashboardtypesPanelDTO;
	data: PanelQueryData;
}

/**
 * Returns a callback that exports the panel's data as CSV. Only tables have
 * tabular data to export; other kinds get a no-op.
 */
export function useDownloadPanelCsv({
	panel,
	data,
}: UseDownloadPanelCsvArgs): () => void {
	const kind = panel.spec.plugin.kind;
	const fileName = panel.spec.display.name;

	return useCallback((): void => {
		if (kind !== 'signoz/TablePanel') {
			return;
		}
		const rows = getTableCsvRows(panel as PanelOfKind<'signoz/TablePanel'>, data);
		if (rows.length === 0) {
			return;
		}
		downloadCsv(rows, fileName);
	}, [kind, fileName, panel, data]);
}
