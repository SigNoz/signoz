import { useEffect, useMemo } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import ContextMenu from 'periscope/components/ContextMenu';
import ListColumnsEditor from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/ListColumnsEditor/ListColumnsEditor';
import PanelEditorQueryBuilder from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/PanelEditorQueryBuilder';
import PreviewPane from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/PreviewPane/PreviewPane';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
import { useViewPanelStore } from 'pages/DashboardPageV2/DashboardContainer/store/useViewPanelStore';
import { useOpenPanelEditor } from 'pages/DashboardPageV2/DashboardContainer/hooks/useOpenPanelEditor';

import { useDrilldown } from '../hooks/useDrilldown';
import { usePanelInteractions } from '../hooks/usePanelInteractions';
import ViewPanelModalHeader from './ViewPanelModalHeader';
import { useViewPanelMode } from './useViewPanelMode';
import { useViewPanelTimeWindow } from './useViewPanelTimeWindow';
import styles from './ViewPanelModal.module.scss';
import logEvent from 'api/common/logEvent';
import { DashboardEvents } from 'pages/DashboardPageV2/constants/events';

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
		onChangePanelKind,
		resetQuery,
		buildSaveSpec,
		applyDrilldownQuery,
	} = useViewPanelMode({ panel, panelId, time: timeOverride });
	const {
		data,
		isFetching,
		isPreviousData,
		error,
		refetch,
		cancelQuery,
		pagination,
	} = query;

	const isListPanel = draft.spec.plugin.kind === 'signoz/ListPanel';

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

	const onSwitchToEdit = (): void => {
		// Carry the drilldown edits so the editor opens on them, not the saved panel.
		logEvent(DashboardEvents.SWITCH_TO_EDIT_MODE, {
			panelId: panelId,
		});
		openPanelEditor(panelId, { editSpec: buildSaveSpec(draft.spec) });
	};

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
				onSwitchToEdit={onSwitchToEdit}
				panelKind={draft.spec.plugin.kind}
				queryType={queryType}
				signal={signal}
				onChangePanelKind={onChangePanelKind}
				onResetQuery={resetQuery}
			/>
			<div className={styles.queryBuilder}>
				<PanelEditorQueryBuilder
					panelKind={draft.spec.plugin.kind}
					signal={signal}
					isLoadingQueries={isFetching}
					onStageRunQuery={runQuery}
					onCancelQuery={cancelQuery}
					stickyHeader={false}
					footer={
						isListPanel ? (
							<ListColumnsEditor
								spec={draft.spec}
								onChangeSpec={setSpec}
								signal={signal}
							/>
						) : undefined
					}
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
					onDragSelect={onDragSelect}
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

export default ViewPanelModalContent;
