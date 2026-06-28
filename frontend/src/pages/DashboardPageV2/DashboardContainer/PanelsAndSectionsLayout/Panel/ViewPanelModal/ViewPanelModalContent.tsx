import { useMemo, useState } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
import { useOpenPanelEditor } from 'pages/DashboardPageV2/DashboardContainer/hooks/useOpenPanelEditor';

import { usePanelInteractions } from '../hooks/usePanelInteractions';
import PanelBody from '../PanelBody/PanelBody';
import PanelHeaderSearch from '../PanelHeader/PanelHeaderSearch';
import ViewPanelModalHeader from './ViewPanelModalHeader';
import ViewPanelQueryBuilder from './ViewPanelQueryBuilder';
import { useViewPanelEditor } from './useViewPanelEditor';
import { useViewPanelTimeWindow } from './useViewPanelTimeWindow';
import styles from './ViewPanelModal.module.scss';

interface ViewPanelModalContentProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** Close the modal — wired to the graph manager's Save/Cancel. */
	onClose: () => void;
}

/**
 * Body of the View modal: a compact drilldown editor. It renders an editable draft of
 * the panel (preview) over a per-view time window plus the shared query builder, so the
 * user can tweak + Stage & Run without touching the dashboard. Edits are temporary.
 */
function ViewPanelModalContent({
	panel,
	panelId,
	onClose,
}: ViewPanelModalContentProps): JSX.Element | null {
	const {
		timeOverride,
		selectedInterval,
		onTimeChange,
		refreshWindow,
		onDragSelect,
	} = useViewPanelTimeWindow();

	const {
		draft,
		panelDefinition,
		panelType,
		signal,
		query,
		runQuery,
		onChangePanelKind,
		resetQuery,
		buildSaveSpec,
	} = useViewPanelEditor({ panel, panelId, time: timeOverride });
	const { data, isFetching, error, refetch, cancelQuery, pagination } = query;

	// Only tabular kinds declare header search; the term is local to the modal.
	const searchable = !!panelDefinition?.actions.search;
	const [searchTerm, setSearchTerm] = useState('');

	// Drag-to-zoom stays inside the modal; opt the chart out of the dashboard's
	// cursor-sync group so a drag here can't replay onto the grid panels.
	const { dashboardPreference } = usePanelInteractions();
	const isolatedPreference = useMemo<DashboardPreference>(
		() => ({ ...dashboardPreference, syncMode: DashboardCursorSync.None }),
		[dashboardPreference],
	);
	const openPanelEditor = useOpenPanelEditor();

	// The View action only appears for registered kinds, so this is defensive.
	if (!panelDefinition) {
		return null;
	}

	return (
		<div className={styles.content} data-testid="view-panel-modal-content">
			<ViewPanelModalHeader
				selectedInterval={selectedInterval}
				startMs={timeOverride.startMs}
				endMs={timeOverride.endMs}
				onTimeChange={onTimeChange}
				isFetching={isFetching}
				onRefresh={(): void => {
					// Relative windows re-anchor to now (new key → refetch); a fixed
					// custom window just re-runs the same query.
					if (selectedInterval === 'custom') {
						refetch();
					} else {
						refreshWindow();
					}
				}}
				onSwitchToEdit={(): void =>
					// Carry the drilldown edits so the editor opens on them, not the saved panel.
					openPanelEditor(panelId, { editSpec: buildSaveSpec(draft.spec) })
				}
				panelKind={draft.spec.plugin.kind}
				signal={signal}
				onChangePanelKind={onChangePanelKind}
				onResetQuery={resetQuery}
			/>
			<ViewPanelQueryBuilder
				panelType={panelType}
				isLoadingQueries={isFetching}
				onStageRunQuery={runQuery}
				onCancelQuery={cancelQuery}
			/>
			{searchable && (
				<div className={styles.searchRow}>
					<PanelHeaderSearch value={searchTerm} onChange={setSearchTerm} />
				</div>
			)}
			<div className={styles.body}>
				<PanelBody
					panelDefinition={panelDefinition}
					panel={draft}
					panelId={panelId}
					data={data}
					isFetching={isFetching}
					error={error}
					refetch={refetch}
					onDragSelect={onDragSelect}
					dashboardPreference={isolatedPreference}
					panelMode={PanelMode.STANDALONE_VIEW}
					searchTerm={searchable ? searchTerm : undefined}
					pagination={pagination}
					onCloseStandaloneView={onClose}
				/>
			</div>
		</div>
	);
}

export default ViewPanelModalContent;
