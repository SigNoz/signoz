import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import type { PanelMode } from 'lib/visualization/panels/types';
import PanelHeader from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import StaticPanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody';

import type { RenderableStaticPanelDefinition } from '../../Panels/types/panelDefinition';
import { isTransparentPanel } from '../../Panels/utils/isTransparentPanel';
import styles from './StaticPreviewPane.module.scss';

interface StaticPreviewPaneProps {
	panelId: string;
	panel: DashboardtypesPanelDTO;
	panelDefinition: RenderableStaticPanelDefinition;
	panelMode: PanelMode;
}

/**
 * Live preview of a static draft: the panel card rendered through the same
 * `StaticPanelBody` the grid uses, on the query preview's dotted canvas. It
 * re-renders from the draft spec on every edit — no query, no Run step. Shared
 * by the full editor and the View modal.
 */
function StaticPreviewPane({
	panelId,
	panel,
	panelDefinition,
	panelMode,
}: StaticPreviewPaneProps): JSX.Element {
	return (
		<div className={styles.preview}>
			<div
				className={cx(styles.surface, {
					[styles.transparent]: isTransparentPanel(panel.spec),
				})}
			>
				<PanelHeader mode="static" panelId={panelId} panel={panel} hideActions />
				<StaticPanelBody
					panelDefinition={panelDefinition}
					panel={panel}
					panelId={panelId}
					panelMode={panelMode}
				/>
			</div>
		</div>
	);
}

export default StaticPreviewPane;
