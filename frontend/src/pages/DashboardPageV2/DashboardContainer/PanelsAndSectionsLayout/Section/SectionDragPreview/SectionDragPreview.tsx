import type { DashboardSection } from '../../../utils';
import SectionHeader from '../SectionHeader/SectionHeader';
import styles from './SectionDragPreview.module.scss';

interface SectionDragPreviewProps {
	section: DashboardSection;
}

/**
 * Lightweight preview rendered inside the DragOverlay while a section is being
 * dragged. Deliberately header-only (no react-grid-layout) so the overlay is
 * cheap and never triggers RGL width re-measurement.
 */
function SectionDragPreview({ section }: SectionDragPreviewProps): JSX.Element {
	const panelCount = section.items.length;
	const title = `${section.title ?? ''} · ${panelCount} ${
		panelCount === 1 ? 'panel' : 'panels'
	}`;

	return (
		<div className={styles.preview}>
			<SectionHeader
				sectionId={`${section.id}-preview`}
				title={title}
				open={false}
				onToggle={(): void => undefined}
			/>
		</div>
	);
}

export default SectionDragPreview;
