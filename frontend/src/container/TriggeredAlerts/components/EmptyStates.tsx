import { useCallback } from 'react';
import { CircleCheck, Plus, RefreshCw, Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import styles from './EmptyStates.module.scss';

interface EmptyStateProps {
	onRefresh?: () => void;
}

export function EmptyState({ onRefresh }: EmptyStateProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();

	const handleCreateAlert = useCallback((): void => {
		safeNavigate(ROUTES.ALERTS_NEW);
	}, [safeNavigate]);

	return (
		<div className={styles.emptyState}>
			<CircleCheck className={styles.emptyStateIcon} size={16} />
			<div className={styles.emptyStateTitle}>No alerts firing</div>
			<div className={styles.emptyStateSubtitle}>
				All systems are healthy. No alerts are currently triggered.
			</div>
			<div className={styles.emptyStateActions}>
				<Button
					variant="solid"
					color="primary"
					prefix={<Plus size={14} />}
					onClick={handleCreateAlert}
				>
					Create Alert Rule
				</Button>
				{onRefresh && (
					<Button
						variant="outlined"
						color="secondary"
						prefix={<RefreshCw size={14} />}
						onClick={onRefresh}
					>
						Refresh
					</Button>
				)}
			</div>
		</div>
	);
}

interface NoFilterResultsEmptyStateProps {
	onClearFilters: () => void;
}

export function NoFilterResultsEmptyState({
	onClearFilters,
}: NoFilterResultsEmptyStateProps): JSX.Element {
	return (
		<div className={styles.emptyState}>
			<Search className={styles.emptyStateIconMuted} size={16} />
			<div className={styles.emptyStateTitle}>No matching alerts</div>
			<div className={styles.emptyStateSubtitle}>
				No alerts match your current filters. Try adjusting your search criteria.
			</div>
			<Button variant="outlined" onClick={onClearFilters}>
				Clear Filters
			</Button>
		</div>
	);
}
