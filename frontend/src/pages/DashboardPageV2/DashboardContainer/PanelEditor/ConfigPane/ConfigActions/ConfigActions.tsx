import { Bell } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import { useCreateAlertFromPanel } from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/hooks/useCreateAlertFromPanel';

import ConfigActionRow from './ConfigActionRow';
import styles from './ConfigActions.module.scss';

interface ConfigActionsProps {
	/** The draft panel — its current query seeds the actions (e.g. Create alert). */
	panel: DashboardtypesPanelDTO;
	panelId: string;
}

/**
 * The "Actions" group at the foot of the config pane: cross-page navigation links,
 * kept distinct from the collapsible config sections above. Each link is gated by the
 * panel kind's capabilities; the whole group hides when none apply.
 */
function ConfigActions({
	panel,
	panelId,
}: ConfigActionsProps): JSX.Element | null {
	const createAlert = useCreateAlertFromPanel();
	const { actions } = getPanelDefinition(panel.spec.plugin.kind);

	// Only kinds whose query can seed an alert offer this today; mirror the panel
	// menu's create-alert capability.
	if (!actions.createAlert) {
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
						icon={<Bell size={14} />}
						label="Create alert"
						onClick={(): void => createAlert(panel, panelId)}
					/>
				</div>
			</div>
		</>
	);
}

export default ConfigActions;
