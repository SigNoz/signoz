import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { noop } from 'lodash-es';
import PanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody';
import PanelHeader from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import type { DashboardPreference } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';
import type { RenderableQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';

import { usePublicPanelQuery } from '../hooks/usePublicPanelQuery';
import StaticPublicPanel from './StaticPublicPanel';
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

/**
 * Read-only v2 public panel. Forks on the kind's mode before any query machinery
 * exists; the static arm renders nothing until a static kind registers.
 */
function PublicPanel(props: PublicPanelProps): JSX.Element {
	const panelDefinition = getPanelDefinition(props.panel.spec.plugin.kind);

	if (panelDefinition.mode === 'static') {
		return (
			<StaticPublicPanel
				panel={props.panel}
				panelKey={props.panelKey}
				panelDefinition={panelDefinition}
			/>
		);
	}

	return <QueryPublicPanel {...props} panelDefinition={panelDefinition} />;
}

interface QueryPublicPanelProps extends PublicPanelProps {
	panelDefinition: RenderableQueryPanelDefinition;
}

// Reuses the V2 header/body renderers with interactions disabled.
function QueryPublicPanel({
	panel,
	panelKey,
	publicDashboardId,
	startMs,
	endMs,
	isVisible,
	panelDefinition,
}: QueryPublicPanelProps): JSX.Element {
	const { data, isFetching, isPreviousData, error, refetch } =
		usePublicPanelQuery({
			panel,
			queryCapabilities: panelDefinition.queryCapabilities,
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
				Renderer={panelDefinition.Renderer}
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
