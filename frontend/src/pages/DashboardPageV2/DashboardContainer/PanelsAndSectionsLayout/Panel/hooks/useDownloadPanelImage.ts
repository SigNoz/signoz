import { useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import {
	downloadElementAsImage,
	type PanelImageFormat,
} from '../utils/downloadPanelImage';

interface UseDownloadPanelImage {
	downloadPanelImage: (
		panelId: string,
		panelName: string,
		format: PanelImageFormat,
	) => Promise<void>;
}

/**
 * Downloads a V2 panel as an image (PNG or SVG). Locates the panel's root node
 * by its `data-panel-root` marker (set in Panel.tsx) so the capture works
 * without threading a ref through the header → actions-menu chain, then
 * delegates to the pure capture util. Failures surface as an error toast.
 */
export function useDownloadPanelImage(): UseDownloadPanelImage {
	const downloadPanelImage = useCallback(
		async (
			panelId: string,
			panelName: string,
			format: PanelImageFormat,
		): Promise<void> => {
			const node = document.querySelector<HTMLElement>(
				`[data-panel-root="${CSS.escape(panelId)}"]`,
			);
			// The menu lives inside the panel, so the node is normally present;
			// bail quietly if the panel unmounted between open and click.
			if (!node) {
				return;
			}
			try {
				await downloadElementAsImage(node, panelName, format);
				void logEvent(DashboardDetailEvents.PanelExported, {
					format,
					panelId,
				});
			} catch {
				toast.error('Could not download panel.', {
					action: {
						label: 'Dismiss',
						onClick: (): void => {
							toast.dismiss();
						},
					},
					description: 'Something went wrong while capturing the panel image.',
				});
			}
		},
		[],
	);

	return { downloadPanelImage };
}
