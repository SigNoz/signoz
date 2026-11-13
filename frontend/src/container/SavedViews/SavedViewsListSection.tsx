import { Typography } from '@signozhq/ui/typography';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';

import SavedViewsListRow from './SavedViewsListRow';
import { SavedViewsListSectionProps } from './types';

import styles from './SavedViewsList.module.scss';

function SavedViewsListSection({
	title,
	views,
	activeViewId,
	onSelect,
	onClear,
	onAction,
	hover,
	testId,
}: SavedViewsListSectionProps): JSX.Element {
	return (
		<section className={styles.section} data-testid={testId}>
			<Typography
				variant="uppercase"
				size="small"
				weight="medium"
				color="secondary"
				as="span"
				display="inline-block"
				paddingY={4}
				paddingX={6}
				textOverflow="wrap"
			>
				{title}
			</Typography>
			<div className={styles.sectionList}>
				<OverlayScrollbar>
					<div>
						{views.map((view) => (
							<SavedViewsListRow
								key={view.id}
								view={view}
								isActive={view.id === activeViewId}
								onSelect={onSelect}
								onClear={onClear}
								onAction={onAction}
								hover={hover}
							/>
						))}
					</div>
				</OverlayScrollbar>
			</div>
		</section>
	);
}

export default SavedViewsListSection;
