import { Typography } from '@signozhq/ui/typography';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';

import styles from './EntityEmptyState.module.scss';

interface EntityEmptyStateProps {
	hasFilters: boolean;
}

export default function EntityEmptyState({
	hasFilters,
}: EntityEmptyStateProps): JSX.Element {
	return (
		<div className={styles.container} data-testid="entity-empty-state">
			<div className={styles.content}>
				<img src={emptyStateUrl} alt="empty-state" className={styles.icon} />
				{hasFilters ? (
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						<span className={styles.title}>This query had no results. </span>
						Edit your query and try again!
					</Typography>
				) : (
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						<span className={styles.title}>No data yet. </span>
						When we receive data, it will show up here.
					</Typography>
				)}
			</div>
		</div>
	);
}
