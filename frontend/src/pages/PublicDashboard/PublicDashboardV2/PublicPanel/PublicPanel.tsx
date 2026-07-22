import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { noop } from 'lodash-es';
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

const PUBLIC_DASHBOARD_PREFERENCE: DashboardPreference = {
	syncMode: DashboardCursorSync.None,
};

// Read-only v2 public panel: reuses the V2 header/body renderers with interactions disabled.
function PublicPanel({
	panel,
	panelKey,
	publicDashboardId,
	startMs,
	endMs,
	isVisible,
}: PublicPanelProps): JSX.Element {
	const panelDefinition = getPanelDefinition(panel.spec.plugin.kind);

	const { data, isFetching, isPreviousData, error, refetch } =
		usePublicPanelQuery({
			panel,
			panelKey,
			publicDashboardId,
			startMs,
			endMs,
			enabled: isVisible !== false,
		});

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
				onDragSelect={noop}
				dashboardPreference={PUBLIC_DASHBOARD_PREFERENCE}
				enableDrillDown={false}
			/>
		</div>
	);
}

export default PublicPanel;
