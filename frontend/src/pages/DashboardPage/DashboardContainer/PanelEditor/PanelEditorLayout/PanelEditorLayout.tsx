import type { ReactNode } from 'react';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	useDefaultLayout,
} from '@signozhq/ui/resizable';

import layoutStorage from '../layoutStorage';

import styles from '../PanelEditor.module.scss';

/** A resizable pane's bounds, in the percentage strings `ResizablePanel` takes. */
interface PaneSize {
	minSize: string;
	maxSize: string;
	defaultSize: string;
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

	return (
		<div className={styles.page} data-testid="panel-editor-v2">
			{header}
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
							<ResizablePanel {...split.preview}>{preview}</ResizablePanel>
							<ResizableHandle withHandle className={styles.handle} />
							<ResizablePanel {...split.editor}>{editor}</ResizablePanel>
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
					{config}
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

export default PanelEditorLayout;
