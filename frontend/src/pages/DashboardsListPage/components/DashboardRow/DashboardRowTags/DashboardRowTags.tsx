import { TooltipSimple } from '@signozhq/ui/tooltip';
import TagBadge from 'components/TagBadge/TagBadge';

import styles from './DashboardRowTags.module.scss';

const MAX_VISIBLE_TAGS = 3;

interface DashboardRowTagsProps {
	tags: string[];
}

/**
 * The dashboards-list row tag chips: the first few inline, the rest revealed on
 * hover of a "+N" chip.
 */
function DashboardRowTags({ tags }: DashboardRowTagsProps): JSX.Element | null {
	if (tags.length === 0) {
		return null;
	}

	const extra = tags.slice(MAX_VISIBLE_TAGS);

	return (
		<div className={styles.tags}>
			{tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
				<TagBadge key={tag}>{tag}</TagBadge>
			))}
			{extra.length > 0 && (
				<TooltipSimple
					side="bottom"
					arrow
					tooltipContentProps={{ className: styles.extraTagsTooltip }}
					title={
						<div className={styles.extraTags}>
							{extra.map((tag) => (
								<TagBadge key={tag}>{tag}</TagBadge>
							))}
						</div>
					}
				>
					{/* Stop the click so hovering/clicking the chip doesn't navigate the row. */}
					<span role="presentation" onClick={(e): void => e.stopPropagation()}>
						<TagBadge>+{extra.length}</TagBadge>
					</span>
				</TooltipSimple>
			)}
		</div>
	);
}

export default DashboardRowTags;
