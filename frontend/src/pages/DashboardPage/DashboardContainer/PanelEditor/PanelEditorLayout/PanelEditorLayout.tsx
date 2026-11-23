import type { ReactNode } from 'react';
import { Resizable, type ResizableSizeType } from '@signozhq/ui/resizable';

import layoutStorage from '../layoutStorage';

import styles from '../PanelEditor.module.scss';

/** A resizable pane's bounds, in the percentage strings `Resizable` items take. */
interface PaneSize {
	minSize: ResizableSizeType;
	maxSize: ResizableSizeType;
	defaultSize: ResizableSizeType;
}

/** How the left column divides between the preview and the editor pane. */
export interface PaneSplit {
	preview: PaneSize;
	editor: PaneSize;
}

/**
 * Vertical split per authoring mode. The query builder is a compact form, so the
 * preview keeps the room; a static kind's editor pane is the surface being worked
 * in, so it gets more and can grow further.
 */
export const PANE_SPLIT = {
	query: {
		preview: { minSize: '55%', maxSize: '65%', defaultSize: '60%' },
		editor: { minSize: '35%', maxSize: '45%', defaultSize: '40%' },
	},
	static: {
		preview: { minSize: '40%', maxSize: '65%', defaultSize: '55%' },
		editor: { minSize: '35%', maxSize: '60%', defaultSize: '45%' },
	},
} as const satisfies Record<string, PaneSplit>;

interface PanelEditorLayoutProps {
	/** Save/close chrome — its affordances differ per authoring mode. */
	header: ReactNode;
	/** Upper-left: what the panel will look like once saved. */
	preview: ReactNode;
	/** Lower-left: the kind's `EditorPane` — the query builder, or a static kind's own. */
	editor: ReactNode;
	/** Right column: the kind's config sections. */
	config: ReactNode;
	split: PaneSplit;
}

/**
 * The panel editor's frame: header, the resizable three-pane arrangement, and the
 * persistence of what the user drags. Owned once so both authoring modes cannot
 * drift apart on pane bounds or share a layout id by accident — they differ only in
 * `split` and in what fills the slots.
 */
function PanelEditorLayout({
	header,
	preview,
	editor,
	config,
	split,
}: PanelEditorLayoutProps): JSX.Element {
	return (
		<div className={styles.page} data-testid="panel-editor-v2">
			{header}
			<Resizable
				orientation="horizontal"
				storageKey="panel-editor-v2"
				storage={layoutStorage}
				testId="panel-editor-v2-split"
				items={[
					{
						value: 'main',
						label: 'Preview and editor',
						minSize: '75%',
						maxSize: '80%',
						defaultSize: '80%',
						children: (
							<Resizable
								orientation="vertical"
								storageKey="panel-editor-v2-main"
								storage={layoutStorage}
								items={[
									{
										value: 'preview',
										label: 'Panel preview',
										...split.preview,
										children: preview,
									},
									{
										value: 'editor',
										label: 'Panel editor',
										...split.editor,
										children: editor,
									},
								]}
							/>
						),
					},
					{
						value: 'config',
						label: 'Panel configuration',
						minSize: '20%',
						maxSize: '25%',
						defaultSize: '20%',
						children: <div className={styles.right}>{config}</div>,
					},
				]}
			/>
		</div>
	);
}

export default PanelEditorLayout;
