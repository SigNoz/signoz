import { useCallback } from 'react';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	useDefaultLayout,
} from '@signozhq/ui/resizable';
import { toast } from '@signozhq/ui/sonner';
import type {
	DashboardtypesPanelDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { getBuilderQueries } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';

import { usePanelInteractions } from '../PanelsAndSectionsLayout/Panel/hooks/usePanelInteractions';
import ConfigPane from './ConfigPane/ConfigPane';
import Header from './Header/Header';
import layoutStorage from './layoutStorage';
import PanelEditorQueryBuilder from './PanelEditorQueryBuilder/PanelEditorQueryBuilder';
import PreviewPane from './PreviewPane/PreviewPane';
import { useLegendSeries } from './hooks/useLegendSeries';
import { usePanelQuery } from '../hooks/usePanelQuery';
import { usePanelEditorDraft } from './hooks/usePanelEditorDraft';
import { usePanelEditorQuerySync } from './hooks/usePanelEditorQuerySync';
import { usePanelEditorSave } from './hooks/usePanelEditorSave';
import { useSeedNewListColumns } from './hooks/useSeedNewListColumns';
import { useSwitchColumnsOnSignalChange } from './hooks/useSwitchColumnsOnSignalChange';
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
	/** Leave the editor (navigate back to the dashboard) without saving. */
	onClose: () => void;
	/** Called after a successful save — navigates back to the dashboard. */
	onSaved: () => void;
}

/**
 * V2 panel editor page body. Rendered by the `DASHBOARD_PANEL_EDITOR` route
 * (`PanelEditorPage`) as a full page — a resizable split holds the live preview
 * + query builder on the left and the configuration pane on the right. Owns the
 * draft state and the save round-trip.
 */
function PanelEditorContainer({
	dashboardId,
	panelId,
	panel,
	isNew = false,
	layoutIndex,
	onClose,
	onSaved,
}: PanelEditorContainerProps): JSX.Element {
	const { draft, spec, setSpec, isSpecDirty } = usePanelEditorDraft(panel);
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

	// Panel kind → V1 panel type (drives the query builder + preview).
	const fullKind = draft.spec?.plugin?.kind;
	const panelType =
		(fullKind && PANEL_KIND_TO_PANEL_TYPE[fullKind as PanelKind]) ??
		PANEL_TYPES.TIME_SERIES;

	// One shared query result for the whole editor: the preview renders it and the config
	// pane derives the panel's series from it (e.g. for the legend-colors control).
	const panelDef = getPanelDefinition(draft.spec?.plugin?.kind);
	const {
		data,
		isLoading,
		isFetching,
		error,
		cancelQuery,
		refetch,
		pagination,
	} = usePanelQuery({
		panel: draft,
		panelId,
		enabled: !!panelDef,
	});

	// A new panel defaults to its kind's first supported signal (e.g. List → logs);
	// drives both the seed query's datasource and the seed of its default columns.
	const defaultDataSource = panelDef?.supportedSignals[0];

	// Seed the shared query builder from the draft and expose the Stage-&-Run
	// action (writes the query into the draft → preview re-fetches, or forces a
	// re-fetch when unchanged).
	const { runQuery, isQueryDirty, buildSaveSpec } = usePanelEditorQuerySync({
		draft,
		panelType,
		setSpec,
		refetch,
		// A new panel's seed query is the builder default, not a real saved query —
		// always serialize it for the panel's kind on save.
		alwaysSerializeQuery: isNew,
		// Seed a new panel with a datasource the panel actually supports.
		defaultDataSource,
	});

	// Dirty = an edited config slice (display/plugin spec) OR an edited query. The
	// two are tracked independently so query re-serialization never false-dirties.
	// A new panel is always savable (you're creating it), even before any edit.
	const isDirty = isNew || isSpecDirty || isQueryDirty;
	// The List panel edits its columns below the query builder (V1 parity), so the
	// editor container resolves the committed query's signal once and shares it
	// with both the columns control and the datasource-switch effect below.
	const isListPanel = fullKind === 'signoz/ListPanel';
	// The builder-query `signal` literal matches the TelemetrytypesSignalDTO enum
	// values; cast at this boundary (as ConfigPane does) so the columns editor's
	// field-key lookup is typed.
	const listSignal = getBuilderQueries(spec.queries)[0]?.signal as
		| TelemetrytypesSignalDTO
		| undefined;

	// When the List panel's datasource changes, swap its columns to the new
	// source's defaults (V1 kept a per-datasource field list; V2 has one
	// `selectFields`). Driven by the committed query's signal, so it lives in the
	// editor container alongside the query sync — ConfigPane stays presentational.
	useSwitchColumnsOnSignalChange({
		enabled: isListPanel,
		signal: listSignal,
		spec,
		onChangeSpec: setSpec,
	});
	// A brand-new List panel starts with no columns; seed the default signal's
	// columns once so the Columns control isn't empty on first open (V1 parity).
	useSeedNewListColumns({
		enabled: isNew && isListPanel,
		signal: defaultDataSource,
		spec,
		onChangeSpec: setSpec,
	});
	// Drag-to-zoom on the preview chart updates the (URL-synced) time window,
	// exactly as on the dashboard.
	const { onDragSelect } = usePanelInteractions();
	const legendSeries = useLegendSeries(draft, data);
	const tableColumns = useTableColumns(draft, data);

	const onSave = useCallback(async (): Promise<void> => {
		try {
			// Bake the live query into the spec so unstaged edits are saved too.
			await save(buildSaveSpec(draft.spec));
			toast.success('Panel saved');
			onSaved();
		} catch {
			toast.error('Failed to save panel');
		}
	}, [save, buildSaveSpec, draft.spec, onSaved]);

	return (
		<div className={styles.page} data-testid="panel-editor-v2">
			<Header
				isDirty={isDirty}
				isSaving={isSaving}
				onSave={onSave}
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
								<PreviewPane
									panelId={panelId}
									panel={draft}
									panelDef={panelDef}
									data={data}
									isLoading={isLoading || isFetching}
									error={error}
									refetch={refetch}
									onDragSelect={onDragSelect}
									pagination={pagination}
								/>
							</ResizablePanel>
							<ResizableHandle withHandle className={styles.handle} />
							<ResizablePanel minSize="35%" maxSize="45%" defaultSize="40%">
								<PanelEditorQueryBuilder
									panelType={panelType}
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
						panelKind={draft.spec?.plugin?.kind}
						spec={spec}
						onChangeSpec={setSpec}
						legendSeries={legendSeries}
						tableColumns={tableColumns}
					/>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

export default PanelEditorContainer;
