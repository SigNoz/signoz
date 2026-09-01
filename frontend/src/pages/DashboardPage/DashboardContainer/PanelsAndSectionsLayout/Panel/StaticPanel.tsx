import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import { EMPTY_PANEL_QUERY_DATA } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelActionsConfig } from './Panel';
import PanelHeader from './PanelHeader/PanelHeader';
import StaticPanelBody from './StaticPanelBody/StaticPanelBody';
import styles from './Panel.module.scss';

interface StaticPanelProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	panelDefinition: RenderableStaticPanelDefinition;
	isVisible?: boolean;
	panelActions?: PanelActionsConfig;
}

/**
 * A dashboard panel that renders from its own plugin spec: chrome plus the static
 * body. No fetch, no status indicators, no time preference, no drilldown — none
 * of that exists without a query.
 */
function StaticPanel({
	panel,
	panelId,
	panelDefinition,
	isVisible,
	panelActions,
}: StaticPanelProps): JSX.Element {
	return (
		<div
			className={styles.panel}
			data-panel-visible={isVisible ? 'true' : 'false'}
			// Stable locator, as on QueryPanel — actions that capture the panel node
			// (and tests) address it the same way for both arms.
			data-panel-root={panelId}
		>
			<PanelHeader
				panelId={panelId}
				panel={panel}
				data={EMPTY_PANEL_QUERY_DATA}
				isFetching={false}
				error={null}
				timeLabel={null}
				panelActions={panelActions}
			/>
			<StaticPanelBody
				panelDefinition={panelDefinition}
				panel={panel}
				panelId={panelId}
			/>
		</div>
	);
}

export default StaticPanel;
