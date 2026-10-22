import { useRef } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { useIntersectionObserver } from 'hooks/useIntersectionObserver';

import Panel, { type PanelActionsConfig } from '../../Panel/Panel';
import { useScrollIntoView } from '../hooks/useScrollIntoView';
import styles from './SectionGrid.module.scss';

const VIEWPORT_OBSERVER_OPTIONS: IntersectionObserverInit = {
	rootMargin: '200px',
};

// Start observing after RGL's mount unfold settles, so a panel that only
// transiently overlaps the viewport during layout doesn't fire a throwaway fetch.
const OBSERVER_START_DELAY_MS = 350;

interface SectionGridItemProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	panelActions?: PanelActionsConfig;
}

/**
 * Lazy-loads a single panel: tracks its live viewport intersection and passes it to
 * the presentational Panel as `isVisible`, so a board of many panels only fetches
 * (and refetches on time change / auto-refresh) what's on screen.
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
		// Not once: track the live viewport so a time change / auto-refresh only
		// refetches on-screen panels (off-screen ones stay query-disabled).
		false,
		OBSERVER_START_DELAY_MS,
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
