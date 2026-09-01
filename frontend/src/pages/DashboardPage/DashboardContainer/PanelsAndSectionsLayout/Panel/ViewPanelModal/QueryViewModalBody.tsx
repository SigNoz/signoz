import { useCallback, useEffect, useMemo } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'lib/visualization/panels/types';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import ContextMenu from 'periscope/components/ContextMenu';
import PreviewPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/PreviewPane/PreviewPane';
import type { DashboardPreference } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import type { PanelEditorDraftApi } from 'pages/DashboardPage/DashboardContainer/PanelEditor/types';
import { useViewPanelStore } from 'pages/DashboardPage/DashboardContainer/store/useViewPanelStore';
import { useOpenPanelEditor } from 'pages/DashboardPage/DashboardContainer/hooks/useOpenPanelEditor';

import { useDrilldown } from '../hooks/useDrilldown';
import { usePanelInteractions } from '../hooks/usePanelInteractions';
import ViewPanelModalHeader from './ViewPanelModalHeader';
import { useViewPanelMode } from './useViewPanelMode';
import { useViewPanelTimeWindow } from './useViewPanelTimeWindow';
import styles from './ViewPanelModal.module.scss';
import logEvent from 'api/common/logEvent';
import {
	DashboardDetailEvents,
	DashboardEvents,
} from 'pages/DashboardPage/constants/events';

interface QueryViewModalBodyProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** Close the modal — wired to the graph manager's Save/Cancel. */
	onClose: () => void;
	/** Draft state, owned by the modal shell so it survives an authoring-mode switch. */
	draftApi: PanelEditorDraftApi;
	/** Kind switch, owned by the shell (its cache must survive the fork swap). */
	onChangePanelKind: (kind: PanelKind) => void;
}

/**
 * The query-kind View modal body: a compact drilldown editor. It renders an
 * editable draft of the panel (preview) over a per-view time window plus the
 * kind's editor pane, so the user can tweak + Stage & Run without touching the
 * dashboard. Edits are temporary.
 */
function QueryViewModalBody({
	panel,
	panelId,
	onClose,
	draftApi,
	onChangePanelKind,
}: QueryViewModalBodyProps): JSX.Element | null {
	const {
		timeOverride,
		selectedInterval,
		onTimeChange,
		refreshWindow,
		onDragSelect,
		extendWindow,
	} = useViewPanelTimeWindow();

	const {
		draft,
		setSpec,
		panelDefinition,
		signal,
		queryType,
		query,
		runQuery,
		resetQuery,
		buildSaveSpec,
		applyDrilldownQuery,
	} = useViewPanelMode({ panel, panelId, time: timeOverride, draftApi });
	const {
		data,
		isFetching,
		isPreviousData,
		error,
		refetch,
		cancelQuery,
		pagination,
	} = query;

	// Grid drill-down, but filter-by-value / breakout refine this view in place. Drills the draft
	// so it reflects in-modal edits (and the click's time range follows the per-view window).
	const drilldown = useDrilldown(draft, panelId, {
		openDrilldownView: applyDrilldownQuery,
	});

	// Drag-to-zoom stays inside the modal; opt the chart out of the dashboard's
	// cursor-sync group so a drag here can't replay onto the grid panels.
	const { dashboardPreference } = usePanelInteractions();
	const isolatedPreference = useMemo<DashboardPreference>(
		() => ({ ...dashboardPreference, syncMode: DashboardCursorSync.None }),
		[dashboardPreference],
	);
	const openPanelEditor = useOpenPanelEditor();

	// Modal drag-to-zoom is its own path (local window, not the grid's) — tag it distinctly.
	const handleDragSelect = useCallback(
		(start: number, end: number): void => {
			if (Math.floor(start) !== Math.floor(end)) {
				void logEvent(DashboardDetailEvents.PanelZoomed, {
					context: 'viewModal',
					panelType: draft.spec.plugin.kind,
					panelId,
				});
			}
			onDragSelect(start, end);
		},
		[onDragSelect, draft.spec.plugin.kind, panelId],
	);

	// Publish the modal's local extender for the nested no-data state; cleared on close.
	const setViewPanelExtendWindow = useViewPanelStore(
		(s) => s.setViewPanelExtendWindow,
	);
	useEffect(() => {
		setViewPanelExtendWindow(extendWindow);
		return (): void => setViewPanelExtendWindow(null);
	}, [extendWindow, setViewPanelExtendWindow]);

	// The View action only appears for registered kinds, so this is defensive.
	if (!panelDefinition) {
		return null;
	}
	const { EditorPane } = panelDefinition;

	const onSwitchToEdit = (): void => {
		// Carry the drilldown edits so the editor opens on them, not the saved panel.
		void logEvent(DashboardEvents.SWITCH_TO_EDIT_MODE, {
			panelId: panelId,
		});
		openPanelEditor(panelId, {
			handoffState: { editSpec: buildSaveSpec(draft.spec) },
		});
	};

	return (
		<div className={styles.content} data-testid="view-panel-modal-content">
			<ViewPanelModalHeader
				mode="query"
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
				onSwitchToEdit={onSwitchToEdit}
				panelKind={draft.spec.plugin.kind}
				queryType={queryType}
				signal={signal}
				onChangePanelKind={onChangePanelKind}
				onResetQuery={resetQuery}
			/>
			<div className={styles.queryBuilder}>
				<EditorPane
					panelDefinition={panelDefinition}
					signal={signal}
					isLoadingQueries={isFetching}
					onStageRunQuery={runQuery}
					onCancelQuery={cancelQuery}
					stickyHeader={false}
					spec={draft.spec}
					onChangeSpec={setSpec}
				/>
			</div>
			<div className={styles.body}>
				<PreviewPane
					panelId={panelId}
					panel={draft}
					panelDefinition={panelDefinition}
					data={data}
					isFetching={isFetching}
					isPreviousData={isPreviousData}
					error={error}
					refetch={refetch}
					onDragSelect={handleDragSelect}
					pagination={pagination}
					panelMode={PanelMode.STANDALONE_VIEW}
					dashboardPreference={isolatedPreference}
					onCloseStandaloneView={onClose}
					onClick={drilldown.onPanelClick}
					enableDrillDown={drilldown.enableDrillDown}
					hideHeader
				/>
			</div>
			<ContextMenu {...drilldown.contextMenuProps} />
		</div>
	);
}

export default QueryViewModalBody;
