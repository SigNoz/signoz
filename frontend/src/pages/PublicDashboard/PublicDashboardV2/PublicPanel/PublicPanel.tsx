import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import PanelBody from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody';
import PanelHeader from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';

import { usePublicPanelQuery } from '../hooks/usePublicPanelQuery';
import styles from './PublicPanel.module.scss';

interface PublicPanelProps {
	panel: DashboardtypesPanelDTO;
	/** Panel key in `spec.panels` — addresses the panel on the public endpoint. */
	panelKey: string;
	publicDashboardId: string;
	/** Epoch milliseconds. */
	startMs: number;
	/** Epoch milliseconds. */
	endMs: number;
	/** True once the panel is on screen — gates the fetch. */
	isVisible?: boolean;
}

// Public dashboards have no cross-panel cursor sync and no drill-down/interactions.
const NO_OP = (): void => {};
const PUBLIC_DASHBOARD_PREFERENCE: DashboardPreference = {
	syncMode: DashboardCursorSync.None,
};

/**
 * Read-only render of a single v2 public dashboard panel. Reuses the authenticated V2 header
 * and body renderers, but fetches through the anonymous public endpoint and disables every
 * editor/interaction affordance (actions menu, drag-select, drill-down).
 */
function PublicPanel({
	panel,
	panelKey,
	publicDashboardId,
	startMs,
	endMs,
	isVisible,
}: PublicPanelProps): JSX.Element | null {
	const panelDefinition = getPanelDefinition(panel.spec.plugin.kind);

	const { data, isFetching, isPreviousData, error, refetch } =
		usePublicPanelQuery({
			panel,
			panelKey,
			publicDashboardId,
			startMs,
			endMs,
			// Lazy: fetch only once on screen and a renderer exists for the kind.
			enabled: !!panelDefinition && isVisible !== false,
		});

	// Unsupported panel kind — render nothing rather than a broken cell.
	if (!panelDefinition) {
		return null;
	}

	return (
		<div className={styles.panel} data-panel-root={panelKey}>
			<PanelHeader
				panelId={panelKey}
				panel={panel}
				data={data}
				isFetching={isFetching}
				error={error}
				warning={data.response?.data?.warning}
				hideActions
			/>
			<PanelBody
				panelDefinition={panelDefinition}
				panel={panel}
				panelId={panelKey}
				data={data}
				isFetching={isFetching}
				isPreviousData={isPreviousData}
				error={error}
				refetch={refetch}
				onDragSelect={NO_OP}
				dashboardPreference={PUBLIC_DASHBOARD_PREFERENCE}
				enableDrillDown={false}
			/>
		</div>
	);
}

export default PublicPanel;
