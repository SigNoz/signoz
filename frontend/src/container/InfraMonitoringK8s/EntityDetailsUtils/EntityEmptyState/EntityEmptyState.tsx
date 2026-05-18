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
		<div className={styles.container}>
			<div className={styles.content}>
				<img src={emptyStateUrl} alt="empty-state" className={styles.icon} />
				{hasFilters ? (
					<Typography.Text>
						<span className={styles.title}>This query had no results. </span>
						Edit your query and try again!
					</Typography.Text>
				) : (
					<Typography.Text>
						<span className={styles.title}>No data yet. </span>
						When we receive data, it will show up here.
					</Typography.Text>
				)}
			</div>
		</div>
	);
}
