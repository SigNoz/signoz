import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import { getTableCsvRows } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TablePanel/tableCsv';
import { toLegacyPanelType } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import type { PanelOfKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';
import { downloadCsv } from 'pages/DashboardPage/DashboardContainer/Panels/utils/downloadCsv';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

interface UseDownloadPanelCsvArgs {
	panel: DashboardtypesPanelDTO;
	data: PanelQueryData;
	/**
	 * Whether the kind's definition declares CSV as a downloadable format
	 * (`actions.download.csv`). Only tables carry tabular data, so this is the
	 * same gate the menu uses — kept here so the callback stays a no-op when
	 * invoked for a kind that can't produce CSV.
	 */
	canDownloadCsv: boolean;
}

/**
 * Returns a callback that exports the panel's data as CSV, gated on the kind's
 * declared download capability. Non-CSV kinds get a no-op.
 */
export function useDownloadPanelCsv({
	panel,
	data,
	canDownloadCsv,
}: UseDownloadPanelCsvArgs): () => void {
	const fileName = panel.spec.display.name;

	return useCallback((): void => {
		if (!canDownloadCsv) {
			return;
		}
		const rows = getTableCsvRows(panel as PanelOfKind<'signoz/TablePanel'>, data);
		if (rows.length === 0) {
			return;
		}
		downloadCsv(rows, fileName);
		void logEvent(DashboardDetailEvents.PanelExported, {
			format: 'csv',
			panelType: toLegacyPanelType(panel.spec.plugin.kind),
			panelKind: panel.spec.plugin.kind,
		});
	}, [canDownloadCsv, fileName, panel, data]);
}
