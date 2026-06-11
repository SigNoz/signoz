import { useMemo } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels';
import { usePanelQuery } from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';
import type { Warning } from 'types/api';

import type { DashboardSection } from '../../utils';
import type { DeletePanelArgs } from './hooks/useDeletePanel';
import { usePanelInteractions } from './hooks/usePanelInteractions';
import type { MovePanelArgs } from './hooks/useMovePanelToSection';
import PanelBody from './PanelBody';
import PanelHeader from './PanelHeader';
import styles from './Panel.module.scss';

/** Panel action context — present together only in editable sectioned mode. */
export interface PanelActionsConfig {
	currentLayoutIndex: number;
	sections: DashboardSection[];
	onMovePanel: (args: MovePanelArgs) => void;
	onDeletePanel: (args: DeletePanelArgs) => void;
}

interface PanelProps {
	panel: DashboardtypesPanelDTO | undefined;
	panelId: string;
	/** True once this panel's section enters the viewport — gates the fetch. */
	isVisible?: boolean;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/**
 * A single dashboard panel: chrome (header) + content (body). Thin orchestrator
 * — data fetching lives in `usePanelQuery`, cross-panel interactions in
 * `usePanelInteractions`, and the loading/error/chart state machine in
 * `PanelBody`.
 */
function Panel({
	panel,
	panelId,
	isVisible,
	panelActions,
}: PanelProps): JSX.Element {
	const name = panel?.spec?.display?.name || `Panel ${panelId.slice(0, 6)}`;
	const description = panel?.spec?.display?.description;
	const fullKind = panel?.spec?.plugin?.kind;
	const kind = fullKind?.replace(/^signoz\//, '') ?? 'unknown';
	const queryCount = panel?.spec?.queries?.length ?? 0;

	const panelDef = getPanelDefinition(fullKind);

	const { data, isLoading, isFetching, error, refetch } = usePanelQuery({
		panel,
		panelId,
		// Lazy: only fetch once the section is on screen (undefined → treat as
		// visible) and a renderer exists for the kind.
		enabled: !!panelDef && isVisible !== false,
	});

	const { onDragSelect, dashboardPreference } = usePanelInteractions();

	const headerTitle = useMemo(() => {
		if (!description) {
			return name;
		}
		return (
			<TooltipSimple title={description}>
				<span>{name}</span>
			</TooltipSimple>
		);
	}, [name, description]);

	return (
		<div
			className={styles.panel}
			data-panel-visible={isVisible ? 'true' : 'false'}
		>
			<PanelHeader
				title={headerTitle}
				panelId={panelId}
				isFetching={isFetching}
				error={error}
				// The V5 response `warning` is the same object the legacy chain
				// surfaced as `Warning` — passed through untouched; the cast is the
				// generated-DTO → hand-written-type boundary.
				warning={data.response?.data?.warning as Warning | undefined}
				panelActions={panelActions}
			/>
			<PanelBody
				panelDef={panelDef}
				panel={panel}
				panelId={panelId}
				kind={kind}
				queryCount={queryCount}
				data={data}
				isLoading={isLoading}
				error={error}
				refetch={refetch}
				onDragSelect={onDragSelect}
				dashboardPreference={dashboardPreference}
			/>
		</div>
	);
}

export default Panel;
