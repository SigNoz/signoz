import type { Key, ReactNode } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Tooltip } from '@signozhq/ui/tooltip';

import styles from './OverflowBadges.module.scss';

const DEFAULT_MAX_VISIBLE = 2;

export interface OverflowBadgeItem {
	key: Key;
	label: ReactNode;
}

interface OverflowBadgesProps {
	items: OverflowBadgeItem[];
	maxVisible?: number;
}

/**
 * A row of badges: the first few inline, the rest revealed on hover of a "+N"
 * badge.
 */
function OverflowBadges({
	items,
	maxVisible = DEFAULT_MAX_VISIBLE,
}: OverflowBadgesProps): JSX.Element {
	const extra = items.slice(maxVisible);

	const renderBadge = ({ key, label }: OverflowBadgeItem): JSX.Element => (
		<Badge key={key} textTransform="none" variant="solid" color="secondary">
			{label}
		</Badge>
	);

	return (
		<div className={styles.badges}>
			{items.slice(0, maxVisible).map(renderBadge)}
			{extra.length > 0 && (
				<Tooltip
					side="bottom"
					title={<div className={styles.extraBadges}>{extra.map(renderBadge)}</div>}
				>
					{/* Stop the click so the "+N" badge doesn't trigger the row's click. */}
					<span
						role="presentation"
						className={styles.overflow}
						onClick={(e): void => e.stopPropagation()}
					>
						<Badge textTransform="none" variant="solid" color="secondary">
							+{extra.length}
						</Badge>
					</span>
				</Tooltip>
			)}
		</div>
	);
}

export default OverflowBadges;
