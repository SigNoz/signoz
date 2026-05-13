import { RefreshCw, Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import styles from './NoResultsEmptyState.module.scss';

interface NoResultsEmptyStateProps {
	title?: string;
	subtitle?: string;
	onClear?: () => void;
	clearButtonText?: string;
	onRefresh?: () => void;
}

function NoResultsEmptyState({
	title = 'No matching results',
	subtitle = 'No items match your current filters. Try adjusting your search criteria.',
	onClear,
	clearButtonText = 'Clear Filters',
	onRefresh,
}: NoResultsEmptyStateProps): JSX.Element {
	return (
		<div className={styles.emptyState} data-testid="no-results-empty-state">
			<Search className={styles.icon} size={16} />
			<div className={styles.title} data-testid="no-results-title">
				{title}
			</div>
			<div className={styles.subtitle} data-testid="no-results-subtitle">
				{subtitle}
			</div>
			<div className={styles.actions}>
				{onClear && (
					<Button
						variant="outlined"
						color="secondary"
						onClick={onClear}
						data-testid="no-results-clear-button"
					>
						{clearButtonText}
					</Button>
				)}
				{onRefresh && (
					<Button
						variant="outlined"
						color="secondary"
						prefix={<RefreshCw size={14} />}
						onClick={onRefresh}
						data-testid="no-results-refresh-button"
					>
						Refresh
					</Button>
				)}
			</div>
		</div>
	);
}

export default NoResultsEmptyState;
