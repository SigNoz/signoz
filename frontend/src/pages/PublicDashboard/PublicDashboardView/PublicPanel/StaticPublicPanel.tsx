import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import PanelHeader from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import StaticPanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import { EMPTY_PANEL_QUERY_DATA } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import styles from './PublicPanel.module.scss';

interface StaticPublicPanelProps {
	panel: DashboardtypesPanelDTO;
	panelKey: string;
	panelDefinition: RenderableStaticPanelDefinition;
}

/**
 * Read-only public rendering of a kind that renders from its own plugin spec. The
 * body is authored content meant to be read, so it is not redacted — and there is
 * no query to issue. Public dashboards carry no variable runtime, so variable
 * tokens render literally, as an undefined variable does anywhere else.
 */
function StaticPublicPanel({
	panel,
	panelKey,
	panelDefinition,
}: StaticPublicPanelProps): JSX.Element {
	return (
		<div className={styles.panel} data-panel-root={panelKey}>
			<PanelHeader
				panelId={panelKey}
				panel={panel}
				data={EMPTY_PANEL_QUERY_DATA}
				isFetching={false}
				error={null}
				hideActions
			/>
			<StaticPanelBody
				panelDefinition={panelDefinition}
				panel={panel}
				panelId={panelKey}
			/>
		</div>
	);
}

export default StaticPublicPanel;
