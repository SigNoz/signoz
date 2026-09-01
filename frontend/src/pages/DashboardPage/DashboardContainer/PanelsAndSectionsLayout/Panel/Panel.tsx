import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { isPanelHeaderHidden } from 'pages/DashboardPage/DashboardContainer/Panels/utils/isPanelHeaderHidden';
import { isTransparentPanel } from 'pages/DashboardPage/DashboardContainer/Panels/utils/isTransparentPanel';

import type { DashboardSection } from '../../utils';
import PanelActionsMenu from './PanelActionsMenu/PanelActionsMenu';
import PanelHeader from './PanelHeader/PanelHeader';
import QueryPanelContent from './QueryPanelContent';
import StaticPanelBody from './StaticPanelBody/StaticPanelBody';
import styles from './Panel.module.scss';

/**
 * Layout context for the panel actions menu — present only in editable mode. No
 * callbacks: the menu resolves its own mutations from store-backed hooks.
 */
export interface PanelActionsConfig {
	currentLayoutIndex: number;
	sections: DashboardSection[];
}

interface PanelProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** True once this panel enters the viewport — gates the fetch (owned by SectionGridItem). */
	isVisible?: boolean;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/**
 * A single dashboard panel: shared shell chrome, forking on the kind's mode
 * before any query machinery exists, so a static kind never mounts a fetch —
 * not even a disabled one.
 */
function Panel({
	panel,
	panelId,
	isVisible,
	panelActions,
}: PanelProps): JSX.Element {
	const panelDefinition = getPanelDefinition(panel.spec.plugin.kind);

	return (
		<div
			className={cx(styles.panel, {
				[styles.transparent]: isTransparentPanel(panel.spec),
			})}
			data-panel-visible={isVisible === false ? 'false' : 'true'}
			// Stable locator so the "Download as PNG" action can find this node to
			// capture, without threading a ref through the header/actions chain.
			data-panel-root={panelId}
		>
			{panelDefinition.mode === 'static' ? (
				<>
					{isPanelHeaderHidden(panel.spec) ? (
						<div className={styles.hiddenHeaderControls}>
							<span
								className={cx('panel-drag-handle', styles.dragPill)}
								data-testid="hidden-header-drag-handle"
							/>
							<div className={styles.floatingActions}>
								<PanelActionsMenu
									panelId={panelId}
									panel={panel}
									panelActions={panelActions}
								/>
							</div>
						</div>
					) : (
						<PanelHeader
							mode="static"
							panelId={panelId}
							panel={panel}
							panelActions={panelActions}
						/>
					)}
					<StaticPanelBody
						panelDefinition={panelDefinition}
						panel={panel}
						panelId={panelId}
					/>
				</>
			) : (
				<QueryPanelContent
					panel={panel}
					panelId={panelId}
					panelDefinition={panelDefinition}
					isVisible={isVisible}
					panelActions={panelActions}
				/>
			)}
		</div>
	);
}

export default Panel;
