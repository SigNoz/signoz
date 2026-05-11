import { CircleAlert, Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { AlertsEmptyState } from '../AlertsEmptyState/AlertsEmptyState';

import styles from './EmptyStates.module.scss';

interface EmptyStateProps {
	variant?: 'no-rules' | 'no-search-results' | 'error';
	onClearSearch?: () => void;
}

export function EmptyState({
	variant = 'no-rules',
	onClearSearch,
}: EmptyStateProps): JSX.Element {
	if (variant === 'error') {
		return (
			<div className={styles.emptyState}>
				<CircleAlert className={styles.emptyStateIconMuted} />
				<div className={styles.emptyStateTitle}>Failed to load alert rules</div>
				<div className={styles.emptyStateSubtitle}>
					Something went wrong while loading alert rules. Please try again later.
				</div>
			</div>
		);
	}

	if (variant === 'no-search-results') {
		return (
			<div className={styles.emptyState}>
				<Search className={styles.emptyStateIconMuted} />
				<div className={styles.emptyStateTitle}>No matching alert rules</div>
				<div className={styles.emptyStateSubtitle}>
					No alert rules match your search. Try adjusting your search criteria.
				</div>
				{onClearSearch && (
					<Button variant="outlined" onClick={onClearSearch}>
						Clear Search
					</Button>
				)}
			</div>
		);
	}

	return <AlertsEmptyState />;
}
