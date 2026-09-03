import TagBadge from 'components/TagBadge/TagBadge';
import TooltipScrollArea from 'components/TooltipScrollArea/TooltipScrollArea';

import styles from './DashboardInfo.module.scss';

interface TagsOverflowTooltipProps {
	/** The tags the cluster isn't showing inline. */
	tags: string[];
}

function TagsOverflowTooltip({ tags }: TagsOverflowTooltipProps): JSX.Element {
	return (
		<TooltipScrollArea>
			<div className={styles.overflowTags} data-testid="dashboard-tags-tooltip">
				{tags.map((tag) => (
					<TagBadge key={tag}>{tag}</TagBadge>
				))}
			</div>
		</TooltipScrollArea>
	);
}

export default TagsOverflowTooltip;
