import { useCallback, useMemo } from 'react';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import {
	DownloadFormat,
	type PanelActionCapabilities,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { buildDownloadMenuItem } from '../utils/buildDownloadMenuItem';
import { useDownloadPanelCsv } from './useDownloadPanelCsv';
import { useDownloadPanelImage } from './useDownloadPanelImage';

interface UseDownloadPanelMenuItemArgs {
	panelId: string;
	panel: DashboardtypesPanelDTO;
	data: PanelQueryData;
	actions: PanelActionCapabilities;
}

/**
 * Resolves the panel's "Download" submenu item: CSV from the query response,
 * PNG/SVG from the rendered node. Null when the kind supports no format.
 */
export function useDownloadPanelMenuItem({
	panelId,
	panel,
	data,
	actions,
}: UseDownloadPanelMenuItemArgs): MenuItem | null {
	const panelName = panel.spec.display.name;
	const downloadPanelCsv = useDownloadPanelCsv({
		panel,
		data,
		canDownloadCsv: actions.download[DownloadFormat.CSV],
	});
	const { downloadPanelImage } = useDownloadPanelImage();

	const onDownload = useCallback(
		(format: DownloadFormat): void => {
			if (format === DownloadFormat.CSV) {
				downloadPanelCsv();
				return;
			}
			void downloadPanelImage(panelId, panelName, format);
		},
		[downloadPanelCsv, downloadPanelImage, panelId, panelName],
	);

	return useMemo(
		() => buildDownloadMenuItem({ supported: actions.download, onDownload }),
		[actions.download, onDownload],
	);
}
