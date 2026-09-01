import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';

import type { DashboardSection } from '../../utils';
import QueryPanel from './QueryPanel';

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
 * A single dashboard panel. Forks on the kind's mode before any query machinery
 * exists, so a static kind never mounts a fetch — not even a disabled one.
 */
function Panel({
	panel,
	panelId,
	isVisible,
	panelActions,
}: PanelProps): JSX.Element | null {
	const panelDefinition = getPanelDefinition(panel.spec.plugin.kind);

	if (panelDefinition.mode === 'static') {
		// No static kind is registered yet; StaticPanel lands with the first one.
		return null;
	}

	return (
		<QueryPanel
			panel={panel}
			panelId={panelId}
			panelDefinition={panelDefinition}
			isVisible={isVisible}
			panelActions={panelActions}
		/>
	);
}

export default Panel;
