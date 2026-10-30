import { type CSSProperties, useRef } from 'react';
import { Tooltip } from '@signozhq/ui/tooltip';

import ItemBadge from './ItemBadge';
import type { OverflowBadgeItem } from './types';
import { useOverflowBadgesLayout } from './useOverflowBadgesLayout';

import styles from './OverflowBadges.module.scss';

interface OverflowBadgesProps {
	items: OverflowBadgeItem[];
}

/**
 * A row of badges: as many as fit the width inline, the rest revealed on hover
 * of a "+N" badge. A lone badge too wide to fit truncates instead.
 */
function OverflowBadges({ items }: OverflowBadgesProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	const { visibleCount, firstMaxWidth, isMeasuring } = useOverflowBadgesLayout(
		items,
		containerRef,
		measureRef,
	);

	const visible = items.slice(0, visibleCount);
	const extra = items.slice(visibleCount);
	// The app sets `--badge-max-width` globally, which outranks Badge's `maxWidth` prop.
	const containerStyle =
		firstMaxWidth === undefined
			? undefined
			: ({ '--badge-max-width': `${firstMaxWidth}px` } as CSSProperties);

	return (
		<div ref={containerRef} className={styles.badges} style={containerStyle}>
			{visible.map(({ key, label }) => (
				<ItemBadge key={key} testId="overflow-badges-item">
					{label}
				</ItemBadge>
			))}
			{extra.length > 0 && (
				<Tooltip
					side="bottom"
					title={
						<div className={styles.extraBadges}>
							{extra.map(({ key, label }) => (
								<ItemBadge key={key}>{label}</ItemBadge>
							))}
						</div>
					}
				>
					{/* Stop the click so the "+N" badge doesn't trigger the row's click. */}
					<span
						role="presentation"
						className={styles.overflow}
						onClick={(e): void => e.stopPropagation()}
					>
						<ItemBadge testId="overflow-badges-more">+{extra.length}</ItemBadge>
					</span>
				</Tooltip>
			)}
			{isMeasuring && (
				<div ref={measureRef} className={styles.measure} aria-hidden>
					{items.map(({ key, label }) => (
						<ItemBadge key={key}>{label}</ItemBadge>
					))}
					<ItemBadge>+{items.length}</ItemBadge>
				</div>
			)}
		</div>
	);
}

export default OverflowBadges;
