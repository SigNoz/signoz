import { Flame } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { useCreateAlertFromPanel } from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/hooks/useCreateAlertFromPanel';

import ConfigActionRow from './ConfigActionRow';
import styles from './ConfigActions.module.scss';

interface ConfigActionsProps {
	/** The draft panel — its current query seeds the actions (e.g. Create alert). */
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** Whether the builder holds an AI query — the alert builder can't seed from one. */
	isAIQuery: boolean;
}

/**
 * The "Actions" group at the foot of the config pane: cross-page navigation links,
 * kept distinct from the collapsible config sections above. Each link is gated by the
 * panel kind's capabilities; the whole group hides when none apply.
 */
function ConfigActions({
	panel,
	panelId,
	isAIQuery,
}: ConfigActionsProps): JSX.Element | null {
	const createAlert = useCreateAlertFromPanel();
	const { actions } = getPanelDefinition(panel.spec.plugin.kind);

	// Only kinds whose query can seed an alert offer this today; mirror the panel
	// menu's create-alert capability. AI queries are excluded on top of that — the
	// alert builder has no AI tab, so it would seed a plain trace query instead.
	if (!actions.createAlert || isAIQuery) {
		return null;
	}

	return (
		<>
			<div className={styles.divider} />
			<div className={styles.container}>
				<span className={styles.eyebrow}>Actions</span>
				<div className={styles.list}>
					<ConfigActionRow
						testId="panel-editor-v2-create-alert"
						icon={<Flame size={14} />}
						label="Create alert"
						onClick={(): void => createAlert(panel, panelId)}
					/>
				</div>
			</div>
		</>
	);
}

export default ConfigActions;
