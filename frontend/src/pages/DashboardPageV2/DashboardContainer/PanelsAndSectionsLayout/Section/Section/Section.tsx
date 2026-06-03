import { useRef, useState } from 'react';

import { useIntersectionObserver } from 'hooks/useIntersectionObserver';

import type { DashboardSection } from '../../../utils';
import SectionGrid from '../SectionGrid/SectionGrid';
import SectionHeader from '../SectionHeader/SectionHeader';
import styles from './Section.module.scss';

interface Props {
	section: DashboardSection;
}

function Section({ section }: Props): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	// Placeholder signal for lazy panel query-loading (consumed in a later PR):
	// true once the section scrolls into (or near) the viewport.
	const isVisible = useIntersectionObserver(containerRef, {
		rootMargin: '200px',
	});

	const [open, setOpen] = useState<boolean>(section.open);
	const toggle = (): void => setOpen((prev) => !prev);

	const grid = <SectionGrid items={section.items} isVisible={isVisible} />;

	if (!section.title) {
		// Untitled section — just the grid (no header chrome), but still observed
		// for the viewport signal.
		return (
			<div
				ref={containerRef}
				data-testid={`dashboard-section-${section.id}`}
				data-section-layout-index={section.layoutIndex}
			>
				{grid}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={styles.section}
			data-testid={`dashboard-section-${section.id}`}
			data-section-layout-index={section.layoutIndex}
		>
			<SectionHeader
				sectionId={section.id}
				title={section.title}
				open={open}
				onToggle={toggle}
				repeatVariable={section.repeatVariable}
			/>
			{open ? grid : null}
		</div>
	);
}

export default Section;
