import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'lib/visualization/panels/types';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import type { PanelOfKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

import styles from './StaticPanelBody.module.scss';

interface StaticPanelBodyProps {
	panelDefinition: RenderableStaticPanelDefinition;
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** Render context — defaults to the dashboard view; the editor preview passes EDIT. */
	panelMode?: PanelMode;
}

/**
 * Body for a kind that renders from its own plugin spec: the static renderer and
 * nothing else — no fetch, no loading or error states. Shared by the dashboard
 * grid, the public view and the editor preview, which is what keeps the preview
 * live while the draft spec changes.
 */
function StaticPanelBody({
	panelDefinition,
	panel,
	panelId,
	panelMode = PanelMode.DASHBOARD_VIEW,
}: StaticPanelBodyProps): JSX.Element {
	// From the edit context, not props: the editor route seeds it too, so an
	// unsaved panel's preview resolves variables the same way the grid does.
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { Renderer } = panelDefinition;

	return (
		<div className={styles.body} data-testid="static-panel-body">
			<Renderer
				panelId={panelId}
				panel={panel as PanelOfKind}
				panelMode={panelMode}
				dashboardId={dashboardId || undefined}
			/>
		</div>
	);
}

export default StaticPanelBody;
