import { GripVertical } from '@signozhq/icons';

import type { GridItem } from '../../../utils';
import styles from './PanelDragPreview.module.scss';

interface PanelDragPreviewProps {
	item: GridItem;
}

/**
 * Lightweight preview shown in the DragOverlay while a panel is being dragged
 * across sections. Title-only (no chart) so the overlay stays cheap and never
 * mounts a query-bound panel.
 */
function PanelDragPreview({ item }: PanelDragPreviewProps): JSX.Element {
	const title = item.panel?.spec?.display?.name || 'Panel';
	return (
		<div className={styles.preview}>
			<GripVertical size={14} className={styles.grip} />
			<span className={styles.title}>{title}</span>
		</div>
	);
}

export default PanelDragPreview;
