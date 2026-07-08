import { useCallback, useMemo } from 'react';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	useDefaultLayout,
} from '@signozhq/ui/resizable';
import { toast } from '@signozhq/ui/sonner';
import {
	type DashboardtypesPanelDTO,
	type DashboardtypesPanelFormattingDTO,
	type DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { getBuilderQueries } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';

import { getExecStats } from '../queryV5/v5ResponseData';
import { usePanelInteractions } from '../PanelsAndSectionsLayout/Panel/hooks/usePanelInteractions';
import ConfigPane from './ConfigPane/ConfigPane';
import Header from './Header/Header';
import layoutStorage from './layoutStorage';
import PanelEditorQueryBuilder from './PanelEditorQueryBuilder/PanelEditorQueryBuilder';
import PreviewPane from './PreviewPane/PreviewPane';
import { useLegendSeries } from './hooks/useLegendSeries';
import { useMetricYAxisUnit } from './hooks/useMetricYAxisUnit';
import { usePanelEditSession } from './hooks/usePanelEditSession';
import { usePanelEditorSave } from './hooks/usePanelEditorSave';
import { useSeedNewListColumns } from './hooks/useSeedNewListColumns';
import { useSwitchColumnsOnSignalChange } from './hooks/useSwitchColumnsOnSignalChange';
import { useSwitchToViewMode } from './hooks/useSwitchToViewMode';
import { useTableColumns } from './hooks/useTableColumns';
import ListColumnsEditor from './ListColumnsEditor/ListColumnsEditor';

import styles from './PanelEditor.module.scss';

interface PanelEditorContainerProps {
	dashboardId: string;
	panelId: string;
	panel: DashboardtypesPanelDTO;
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
}

/**
 * V2 panel editor page body: a resizable split with the live preview + query
 * builder on the left and the config pane on the right. Owns the draft state and
 * the save round-trip.
 */
function PanelEditorContainer({
	dashboardId,
	panelId,
	panel,
	isNew = false,
	layoutIndex,
	isEditable,
	editDisabledReason,
	onClose,
	onSaved,
}: PanelEditorContainerProps): JSX.Element {
	// Shared editing pipeline (draft + query + staged-query sync + kind switch). A new
	// panel always serializes its seed query and seeds the builder's default signal.
	const {
		draft,
		spec,
		setSpec,
		isSpecDirty,
		panelDefinition,
		defaultSignal,
		query,
		runQuery,
		isQueryDirty,
		buildSaveSpec,
		onChangePanelKind,
	} = usePanelEditSession({
		panel,
		panelId,
		alwaysSerializeQuery: isNew,
		seedQuerySignal: true,
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
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'panel-editor-v2',
		storage: layoutStorage,
	});

	const {
		defaultLayout: mainDefaultLayout,
		onLayoutChanged: onMainLayoutChanged,
	} = useDefaultLayout({
		id: 'panel-editor-v2-main',
		storage: layoutStorage,
	});

	const panelKind = draft.spec.plugin.kind;

	// At editor level, not the collapsible FormattingSection, so seeding runs while closed.
	const formattingUnit = (
		spec.plugin.spec as {
			formatting?: DashboardtypesPanelFormattingDTO;
		}
	).formatting?.unit;
	const seedFormattingUnit = useCallback(
		(unit: string): void => {
			const pluginSpec = spec.plugin.spec as {
				formatting?: DashboardtypesPanelFormattingDTO;
			};
			setSpec({
				...spec,
				plugin: {
					...spec.plugin,
					spec: { ...pluginSpec, formatting: { ...pluginSpec.formatting, unit } },
				},
			} as DashboardtypesPanelSpecDTO);
		},
		[spec, setSpec],
	);
	const { metricUnit } = useMetricYAxisUnit({
		isNewPanel: isNew,
		unit: formattingUnit,
		onSelectUnit: seedFormattingUnit,
	});

	// A new panel is savable once it has a query to run — List auto-seeds one; other
	// kinds open query-less, so there's nothing to save until the user builds one.
	const isDirty = useMemo(
		() => isSpecDirty || isQueryDirty || (isNew && draft.spec.queries.length > 0),
		[isSpecDirty, isQueryDirty, isNew, draft.spec.queries.length],
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

	// Seed a new List panel's default columns so the Columns control isn't empty.
	useSeedNewListColumns({
		enabled: isNew && isListPanel,
		signal: defaultSignal,
		spec,
		onChangeSpec: setSpec,
	});

	// Drag-to-zoom on the preview updates the URL-synced time window, as on the dashboard.
	const { onDragSelect } = usePanelInteractions();
	const legendSeries = useLegendSeries(draft, data);
	const tableColumns = useTableColumns(draft, data);

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
	});

	const onSave = useCallback(async (): Promise<void> => {
		if (!isEditable) {
			return;
		}
		try {
			// Bake the live query into the spec so unstaged edits are saved too.
			await save(buildSaveSpec(draft.spec));
			toast.success('Panel saved');
			onSaved();
		} catch {
			toast.error('Failed to save panel');
		}
	}, [isEditable, save, buildSaveSpec, draft.spec, onSaved]);

	return (
		<div className={styles.page} data-testid="panel-editor-v2">
			<Header
				isDirty={isDirty}
				isSaving={isSaving}
				showSwitchToView={!isNew}
				readOnly={!isEditable}
				readOnlyReason={editDisabledReason}
				onSave={onSave}
				onSwitchToView={onSwitchToView}
				onClose={onClose}
			/>
			<ResizablePanelGroup
				id="panel-editor-v2"
				orientation="horizontal"
				defaultLayout={defaultLayout}
				onLayoutChanged={onLayoutChanged}
			>
				<ResizablePanel minSize="75%" maxSize="80%" defaultSize="80%">
					<div className={styles.left}>
						<ResizablePanelGroup
							id="panel-editor-v2-main"
							orientation="vertical"
							defaultLayout={mainDefaultLayout}
							onLayoutChanged={onMainLayoutChanged}
						>
							<ResizablePanel minSize="55%" maxSize="65%" defaultSize="60%">
								{panelDefinition && (
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
								)}
							</ResizablePanel>
							<ResizableHandle withHandle className={styles.handle} />
							<ResizablePanel minSize="35%" maxSize="45%" defaultSize="40%">
								<PanelEditorQueryBuilder
									panelKind={panelKind}
									signal={listSignal}
									isLoadingQueries={isFetching}
									onStageRunQuery={runQuery}
									onCancelQuery={cancelQuery}
									footer={
										isListPanel ? (
											<ListColumnsEditor
												spec={spec}
												onChangeSpec={setSpec}
												signal={listSignal}
											/>
										) : undefined
									}
								/>
							</ResizablePanel>
						</ResizablePanelGroup>
					</div>
				</ResizablePanel>
				<ResizableHandle withHandle className={styles.handle} />
				<ResizablePanel
					minSize="20%"
					maxSize="25%"
					defaultSize="20%"
					className={styles.right}
				>
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
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

export default PanelEditorContainer;
