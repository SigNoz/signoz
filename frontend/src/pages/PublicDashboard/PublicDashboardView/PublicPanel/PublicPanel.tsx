import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { noop } from 'lodash-es';
import PanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody';
import PanelHeader from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import StaticPanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody';
import type { DashboardPreference } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';
import type { RenderableQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { isTransparentPanel } from 'pages/DashboardPage/DashboardContainer/Panels/utils/isTransparentPanel';

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

/**
 * Read-only v2 public panel. Forks on the kind's mode before any query
 * machinery exists. A static body is authored content meant to be read, so it
 * is not redacted; public dashboards carry no variable runtime, so variable
 * tokens render literally.
 */
function PublicPanel(props: PublicPanelProps): JSX.Element {
	const { panel, panelKey } = props;
	const panelDefinition = getPanelDefinition(panel.spec.plugin.kind);

	return (
		<div
			className={cx(styles.panel, {
				[styles.transparent]: isTransparentPanel(panel.spec),
			})}
			data-panel-root={panelKey}
		>
			{panelDefinition.mode === 'static' ? (
				<>
					<PanelHeader mode="static" panelId={panelKey} panel={panel} hideActions />
					<StaticPanelBody
						panelDefinition={panelDefinition}
						panel={panel}
						panelId={panelKey}
					/>
				</>
			) : (
				<QueryPublicPanelContent {...props} panelDefinition={panelDefinition} />
			)}
		</div>
	);
}

interface QueryPublicPanelContentProps extends PublicPanelProps {
	panelDefinition: RenderableQueryPanelDefinition;
}

// Reuses the V2 header/body renderers with interactions disabled.
function QueryPublicPanelContent({
	panel,
	panelKey,
	publicDashboardId,
	startMs,
	endMs,
	isVisible,
	panelDefinition,
}: QueryPublicPanelContentProps): JSX.Element {
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
		<>
			<PanelHeader
				mode="query"
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
		</>
	);
}

export default PublicPanel;
