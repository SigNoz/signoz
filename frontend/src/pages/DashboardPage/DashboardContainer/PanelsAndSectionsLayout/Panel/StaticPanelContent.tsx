import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { useUpdatePanelText } from 'pages/DashboardPage/DashboardContainer/Panels/hooks/useUpdatePanelText';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import { isPanelHeaderHidden } from 'pages/DashboardPage/DashboardContainer/Panels/utils/isPanelHeaderHidden';

import type { PanelActionsConfig } from './Panel';
import PanelActionsMenu from './PanelActionsMenu/PanelActionsMenu';
import PanelHeader from './PanelHeader/PanelHeader';
import StaticPanelBody from './StaticPanelBody/StaticPanelBody';
import { EMPTY_PANEL_QUERY_DATA } from './utils/emptyPanelQueryData';
import styles from './Panel.module.scss';

interface StaticPanelContentProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** The kind's definition, narrowed to the static arm by `Panel`'s fork. */
	panelDefinition: RenderableStaticPanelDefinition;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/**
 * The static arm's content (header + body) — its own component so none of the
 * query machinery is even imported on this path. A hidden header trades the
 * chrome for hover-revealed drag and actions controls.
 */
function StaticPanelContent({
	panel,
	panelId,
	panelDefinition,
	panelActions,
}: StaticPanelContentProps): JSX.Element {
	const onChangeText = useUpdatePanelText(panelId);

	return (
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
							data={EMPTY_PANEL_QUERY_DATA}
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
				Renderer={panelDefinition.Renderer}
				panel={panel}
				panelId={panelId}
				onChangeText={onChangeText}
			/>
		</>
	);
}

export default StaticPanelContent;
