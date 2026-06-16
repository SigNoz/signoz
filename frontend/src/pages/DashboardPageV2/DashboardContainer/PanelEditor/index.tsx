import { type AnimationEvent, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import cx from 'classnames';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	useDefaultLayout,
} from '@signozhq/ui/resizable';
import { toast } from '@signozhq/ui/sonner';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';

import ConfigPane from './ConfigPane/ConfigPane';
import Header from './Header/Header';
import layoutStorage from './layoutStorage';
import PreviewPane from './PreviewPane/PreviewPane';
import QueryBuilderPlaceholder from './QueryBuilderPlaceholder/QueryBuilderPlaceholder';
import { useLegendSeries } from './hooks/useLegendSeries';
import { usePanelEditorDraft } from './hooks/usePanelEditorDraft';
import { usePanelEditorSave } from './hooks/usePanelEditorSave';
import { usePreviewQuery } from './hooks/usePreviewQuery';
import { useTableColumns } from './hooks/useTableColumns';

import './PanelEditor.globals.scss';
import styles from './PanelEditor.module.scss';

interface PanelEditorContainerProps {
	dashboardId: string;
	panelId: string;
	panel: DashboardtypesPanelDTO;
	/** Dismiss the editor overlay (clears the `editPanelId` query param). */
	onClose: () => void;
	/** Called after a successful save so the dashboard can refetch. */
	onSaved: () => void;
}

/**
 * V2 panel editor rendered as a full-screen overlay on top of the dashboard
 * view (the dashboard stays mounted underneath). A resizable split holds the
 * live preview + query builder on the left and the configuration pane on the
 * right. Owns the draft state and the save round-trip.
 */
function PanelEditorContainer({
	dashboardId,
	panelId,
	panel,
	onClose,
	onSaved,
}: PanelEditorContainerProps): JSX.Element {
	const { draft, spec, setSpec, isDirty } = usePanelEditorDraft(panel);
	const { save, isSaving } = usePanelEditorSave({ dashboardId, panelId });
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'panel-editor-v2',
		storage: layoutStorage,
	});

	// One shared query result for the whole editor: the preview renders it and the config
	// pane derives the panel's series from it (e.g. for the legend-colors control).
	const panelDef = getPanelDefinition(draft.spec?.plugin?.kind);
	const { data, isLoading, error, selectedInterval, timeRange, onTimeChange } =
		usePreviewQuery({
			panel: draft,
			panelId,
			enabled: !!panelDef,
		});
	const legendSeries = useLegendSeries(draft, data);
	const tableColumns = useTableColumns(draft, data);

	// Flags the document while the editor overlay is mounted so the global stylesheet can
	// lift body-portaled floating UI (Select dropdowns, the ⌘K palette) above the overlay.
	useEffect(() => {
		document.body.classList.add('panel-editor-open');
		return (): void => document.body.classList.remove('panel-editor-open');
	}, []);

	// Dismiss is deferred until the exit animation finishes: `requestClose` flips the
	// overlay into its closing state (playing the reverse keyframes), and the modal's
	// `onAnimationEnd` then calls the real `onClose`, which unmounts the editor.
	const [closing, setClosing] = useState(false);
	const requestClose = useCallback(() => setClosing(true), []);
	const onExitAnimationEnd = useCallback(
		(event: AnimationEvent<HTMLDivElement>): void => {
			// Only the modal's own exit animation should unmount — ignore animations that
			// bubble up from descendants (e.g. the loading spinner).
			if (closing && event.target === event.currentTarget) {
				onClose();
			}
		},
		[closing, onClose],
	);

	// Safety net: `prefers-reduced-motion` disables the exit animation, so
	// `onAnimationEnd` never fires. Fall back to a timer (slightly longer than the
	// animation) so the editor always unmounts once closing. `onClose` is idempotent.
	useEffect(() => {
		if (!closing) {
			return undefined;
		}
		const timer = setTimeout(onClose, 240);
		return (): void => clearTimeout(timer);
	}, [closing, onClose]);

	const onSave = useCallback(async (): Promise<void> => {
		try {
			await save(draft.spec);
			toast.success('Panel saved');
			onSaved();
			requestClose();
		} catch {
			toast.error('Failed to save panel');
		}
	}, [save, draft.spec, onSaved, requestClose]);

	// Portal to <body> so the fixed overlay escapes the dashboard content's
	// stacking context (AppLayout pins `.app-content` at `z-index: 0`, which
	// would otherwise trap the overlay below the side nav).
	return createPortal(
		<div
			className={cx(styles.root, { [styles.closing]: closing })}
			data-testid="panel-editor-v2"
		>
			<div className={styles.modal} onAnimationEnd={onExitAnimationEnd}>
				<Header
					isDirty={isDirty}
					isSaving={isSaving}
					onSave={onSave}
					onClose={requestClose}
				/>
				<ResizablePanelGroup
					id="panel-editor-v2"
					orientation="horizontal"
					defaultLayout={defaultLayout}
					onLayoutChanged={onLayoutChanged}
				>
					<ResizablePanel minSize="75%" maxSize="80%" defaultSize="80%">
						<div className={styles.left}>
							<PreviewPane
								panelId={panelId}
								panel={draft}
								panelDef={panelDef}
								data={data}
								isLoading={isLoading}
								error={error}
								selectedInterval={selectedInterval}
								timeRange={timeRange}
								onTimeChange={onTimeChange}
							/>
							<QueryBuilderPlaceholder />
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
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
		</div>,
		document.body,
	);
}

export default PanelEditorContainer;
