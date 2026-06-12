import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	useDefaultLayout,
} from '@signozhq/ui/resizable';
import { toast } from '@signozhq/ui/sonner';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigPane from './ConfigPane/ConfigPane';
import Header from './Header/Header';
import layoutStorage from './layoutStorage';
import PreviewPane from './PreviewPane/PreviewPane';
import QueryBuilderPlaceholder from './QueryBuilderPlaceholder/QueryBuilderPlaceholder';
import { usePanelEditorDraft } from './usePanelEditorDraft';
import { usePanelEditorSave } from './usePanelEditorSave';

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
	const { draft, display, setDisplay, isDirty } = usePanelEditorDraft(panel);
	const { save, isSaving } = usePanelEditorSave({ dashboardId, panelId });
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'panel-editor-v2',
		storage: layoutStorage,
	});

	const onSave = useCallback(async (): Promise<void> => {
		try {
			await save(display);
			toast.success('Panel saved');
			onSaved();
			onClose();
		} catch {
			toast.error('Failed to save panel');
		}
	}, [save, display, onSaved, onClose]);

	// Portal to <body> so the fixed overlay escapes the dashboard content's
	// stacking context (AppLayout pins `.app-content` at `z-index: 0`, which
	// would otherwise trap the overlay below the side nav).
	return createPortal(
		<div className={styles.root} data-testid="panel-editor-v2">
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
				<ResizablePanel minSize="70%" maxSize="80%" defaultSize="75%">
					<div className={styles.left}>
						<PreviewPane panelId={panelId} panel={draft} />
						<QueryBuilderPlaceholder />
					</div>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel minSize="20%" maxSize="30%" defaultSize="25%">
					<ConfigPane display={display} onChangeDisplay={setDisplay} />
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>,
		document.body,
	);
}

export default PanelEditorContainer;
