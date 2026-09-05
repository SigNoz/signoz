import { useCallback, useMemo } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { ConfigProvider } from 'antd';
import {
	type DashboardtypesPanelDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { RenderableQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import {
	type SectionConfig,
	type SectionControls,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { getBuilderQueries } from 'pages/DashboardPage/DashboardContainer/Panels/utils/getBuilderQueries';
import { useErrorModal } from 'providers/ErrorModalProvider';

import { getExecStats } from '../queryV5/v5ResponseData';
import { usePanelInteractions } from '../PanelsAndSectionsLayout/Panel/hooks/usePanelInteractions';
import { useScrollIntoViewStore } from '../store/useScrollIntoViewStore';
import ConfigPane from './ConfigPane/ConfigPane';
import Header from './Header/Header';
import PanelEditorLayout, {
	PANE_SPLIT,
} from './PanelEditorLayout/PanelEditorLayout';
import PreviewPane from './PreviewPane/PreviewPane';
import { useLegendSeries } from './hooks/useLegendSeries';
import type { PanelEditorDraftApi } from './types';
import { usePanelEditSession } from './hooks/usePanelEditSession';
import { usePanelEditorSave } from './hooks/usePanelEditorSave';
import { useSeedMetricUnit } from './hooks/useSeedMetricUnit';
import { useSeedNewListColumns } from './hooks/useSeedNewListColumns';
import { useSwitchColumnsOnSignalChange } from './hooks/useSwitchColumnsOnSignalChange';
import { useSwitchToViewMode } from './hooks/useSwitchToViewMode';
import { useTableColumns } from './hooks/useTableColumns';

import logEvent from '@/api/common/logEvent';
import { DashboardEvents } from '../../constants/events';

// The query builder sits in an `overflow:hidden` resizable pane, so its Select
// popups (group-by, order-by, having, …) clip when they open into the short pane.
// Portal them to the document body; the query-builder filters honor this via
// `useSelectPopupContainer`. Scoped to the full-page editor — the View modal keeps
// its own `ConfigProvider` so popups stay inside the focus-trapped dialog.
const getBodyPopupContainer = (): HTMLElement => document.body;

interface QueryEditorBodyProps {
	dashboardId: string;
	panelId: string;
	panel: DashboardtypesPanelDTO;
	/**
	 * The persisted panel the dirty check compares against. Distinct from `panel` (the
	 * seed), which may carry unsaved edits handed off from View mode. Omit for a new panel.
	 */
	savedPanel?: DashboardtypesPanelDTO;
	/** Creating a new panel (seeded default) vs editing an existing one. */
	isNew?: boolean;
	/** Target section for a new panel; falls back to the last/new section. */
	layoutIndex?: number;
	/** The dashboard can be edited (unlocked + permission); gates Save. */
	isEditable: boolean;
	/** Why Save is disabled (locked / no permission); '' when editable. */
	editDisabledReason: string;
	/** Leave the editor (navigate back to the dashboard) without saving. */
	onClose: () => void;
	/** Called after a successful save — navigates back to the dashboard. */
	onSaved: () => void;
	/** Draft state, owned by the shell so it survives an authoring-mode switch. */
	draftApi: PanelEditorDraftApi;
	/** The draft kind's definition, narrowed by the shell's fork. */
	panelDefinition: RenderableQueryPanelDefinition;
	/** Kind switch, owned by the shell (its cache must survive the fork swap). */
	onChangePanelKind: (kind: PanelKind) => void;
}

/**
 * The query-kind editor body: a resizable split with the live preview + the
 * kind's editor pane on the left and the config pane on the right. Draft and
 * kind-switch state live in the shell; this body owns the query session and the
 * save round-trip.
 */
function QueryEditorBody({
	dashboardId,
	panelId,
	panel,
	savedPanel,
	isNew = false,
	layoutIndex,
	isEditable,
	editDisabledReason,
	onClose,
	onSaved,
	draftApi,
	panelDefinition,
	onChangePanelKind,
}: QueryEditorBodyProps): JSX.Element {
	// Shared editing pipeline (draft + query + staged-query sync + kind switch). A new
	// panel always serializes its seed query and seeds the builder's default signal.
	const {
		draft,
		spec,
		setSpec,
		isSpecDirty,
		query,
		runQuery,
		isQueryDirty,
		buildSaveSpec,
	} = usePanelEditSession({
		panel,
		panelId,
		savedPanel,
		alwaysSerializeQuery: isNew,
		seedQuerySignal: true,
		draftApi,
	});
	const {
		data,
		isFetching,
		isPreviousData,
		error,
		cancelQuery,
		refetch,
		pagination,
	} = query;

	// Live query type (the selected tab) — the type switcher disables kinds that can't be
	// authored in it. Read from the provider, not the spec: a new panel's spec carries no
	// query until staged, so the spec would lag the tab.
	const { currentQuery } = useQueryBuilder();
	const { save, isSaving } = usePanelEditorSave({
		dashboardId,
		panelId,
		isNew,
		layoutIndex,
	});

	const panelKind = draft.spec.plugin.kind;
	// The kind's own lower pane (query builder, plus e.g. List's columns footer).
	const { EditorPane } = panelDefinition;

	// The current kind's Formatting controls — which unit field (panel-wide `unit` vs
	// per-column `columnUnits`) a metric unit may seed into. Same source of truth the
	// switch-time seeding in `buildPluginSpec` reads, so the two stay in lockstep.
	const formattingControls = useMemo(():
		| SectionControls[SectionKind.Formatting]
		| undefined => {
		const section = panelDefinition.sections.find(
			(
				candidate,
			): candidate is Extract<SectionConfig, { kind: SectionKind.Formatting }> =>
				candidate.kind === SectionKind.Formatting,
		);
		return section?.controls;
	}, [panelDefinition]);

	// Unsaved-edits flag driving the discard confirmation on close (Save is always
	// enabled). Read the seed `panel`, not the live `draft` — the staged-query sync
	// commits the seed into the draft on open, which would falsely dirty an untouched
	// query-less new panel.
	const isDirty = useMemo(
		() => isSpecDirty || isQueryDirty || (isNew && panel.spec.queries.length > 0),
		[isSpecDirty, isQueryDirty, isNew, panel.spec.queries.length],
	);

	const isListPanel = panelKind === 'signoz/ListPanel';
	// The builder-query `signal` literal matches the TelemetrytypesSignalDTO enum
	// values; cast at this boundary (as ConfigPane does) so the columns editor's
	// field-key lookup is typed.
	const listSignal =
		(getBuilderQueries(spec.queries)[0]?.signal as TelemetrytypesSignalDTO) ||
		TelemetrytypesSignalDTO.logs;

	// Swap the List panel's columns to the new signal's defaults on signal change
	// (V1 had a per-signal field list; V2 has one `selectFields`).
	useSwitchColumnsOnSignalChange({
		enabled: isListPanel,
		signal: listSignal,
		spec,
		onChangeSpec: setSpec,
	});

	// Seed a new List panel's columns from the query's resolved signal (not the kind's
	// default logs signal) so a traces-List export gets traces columns, not logs.
	useSeedNewListColumns({
		enabled: isNew && isListPanel,
		signal: listSignal,
		spec,
		onChangeSpec: setSpec,
	});

	// Drag-to-zoom on the preview updates the URL-synced time window, as on the dashboard.
	const { onDragSelect } = usePanelInteractions();
	const legendSeries = useLegendSeries(draft, data);
	const tableColumns = useTableColumns(draft, data);

	// Resolves the selected metric's unit and, on a new panel, seeds it into the right
	// formatting field for the kind (panel-wide `unit`, or per-column `columnUnits` for
	// a Table once results resolve them). `metricUnit` also drives the mismatch warning.
	const { metricUnit } = useSeedMetricUnit({
		isNewPanel: isNew,
		formattingControls,
		columns: tableColumns,
		spec,
		onChangeSpec: setSpec,
	});

	// Smallest query step interval (seconds) — the floor for the span-gaps
	// threshold. Undefined until results carry step metadata.
	const stepInterval = useMemo((): number | undefined => {
		const intervals = getExecStats(data.response)?.stepIntervals;
		const values = intervals ? Object.values(intervals) : [];
		return values.length ? Math.min(...values) : undefined;
	}, [data.response]);

	const onSwitchToView = useSwitchToViewMode({
		dashboardId,
		panelId,
		panelType: PANEL_KIND_TO_PANEL_TYPE[panelKind],
		query: currentQuery,
		spec: draft.spec,
	});

	const setScrollTargetId = useScrollIntoViewStore((s) => s.setScrollTargetId);
	const { showErrorModal } = useErrorModal();

	const onSave = useCallback(async (): Promise<void> => {
		if (!isEditable) {
			return;
		}
		try {
			// Bake the live query into the spec so unstaged edits are saved too.
			const savedPanelId = await save(buildSaveSpec(draft.spec));
			// Reveal the saved panel once the dashboard re-renders.
			setScrollTargetId(savedPanelId);
			toast.success('Panel saved', {
				position: 'top-center',
			});
			onSaved();
		} catch (err) {
			showErrorModal(err);
		}
	}, [
		isEditable,
		save,
		buildSaveSpec,
		draft.spec,
		setScrollTargetId,
		onSaved,
		showErrorModal,
	]);

	// Leaving an existing panel's editor (without saving) still returns to it, so
	// the dashboard lands on that panel rather than scrolled to the top. A new,
	// unsaved panel has no persisted target, so there's nothing to reveal.
	const onCloseEditor = useCallback((): void => {
		if (!isNew) {
			setScrollTargetId(panelId);
		}
		onClose();
	}, [isNew, panelId, setScrollTargetId, onClose]);

	const switchToViewMode = useCallback((): void => {
		logEvent(DashboardEvents.SWITCH_TO_VIEW_MODE, {
			panelId: panelId,
		});
		onSwitchToView();
	}, [onSwitchToView]);

	return (
		<PanelEditorLayout
			split={PANE_SPLIT.query}
			header={
				<Header
					isDirty={isDirty}
					isSaving={isSaving}
					showSwitchToView={!isNew}
					readOnly={!isEditable}
					readOnlyReason={editDisabledReason}
					onSave={onSave}
					onSwitchToView={switchToViewMode}
					onClose={onCloseEditor}
				/>
			}
			preview={
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
				/>
			}
			editor={
				<ConfigProvider getPopupContainer={getBodyPopupContainer}>
					<EditorPane
						panelDefinition={panelDefinition}
						signal={listSignal}
						isLoadingQueries={isFetching}
						onStageRunQuery={runQuery}
						onCancelQuery={cancelQuery}
						spec={spec}
						onChangeSpec={setSpec}
					/>
				</ConfigProvider>
			}
			config={
				<ConfigPane
					panel={draft}
					panelId={panelId}
					spec={spec}
					onChangeSpec={setSpec}
					onChangePanelKind={onChangePanelKind}
					queryType={currentQuery.queryType}
					legendSeries={legendSeries}
					tableColumns={tableColumns}
					stepInterval={stepInterval}
					metricUnit={metricUnit}
				/>
			}
		/>
	);
}

export default QueryEditorBody;
