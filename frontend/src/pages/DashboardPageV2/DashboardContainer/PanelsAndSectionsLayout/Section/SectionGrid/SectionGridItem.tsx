import { useRef } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useIntersectionObserver } from 'hooks/useIntersectionObserver';

import Panel, { type PanelActionsConfig } from '../../Panel/Panel';
import { useScrollIntoView } from '../hooks/useScrollIntoView';
import styles from './SectionGrid.module.scss';

const VIEWPORT_OBSERVER_OPTIONS: IntersectionObserverInit = {
	rootMargin: '200px',
};

interface SectionGridItemProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	panelActions?: PanelActionsConfig;
}

/**
 * Lazy-loads a single panel: watches its own viewport intersection (latched) and
 * passes it to the presentational Panel as `isVisible`, so a board of many panels
 * only fetches what's on screen.
 */
function SectionGridItem({
	panel,
	panelId,
	panelActions,
}: SectionGridItemProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const isVisible = useIntersectionObserver(
		containerRef,
		VIEWPORT_OBSERVER_OPTIONS,
		true,
	);
	useScrollIntoView(panelId, containerRef);

	return (
		<div ref={containerRef} className={styles.panelWrapper}>
			<Panel
				panel={panel}
				panelId={panelId}
				isVisible={isVisible}
				panelActions={panelActions}
			/>
		</div>
	);
}

export default SectionGridItem;
