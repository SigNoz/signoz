import { Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import styles from './NoResultsEmptyState.module.scss';

interface NoResultsEmptyStateProps {
	title?: string;
	subtitle?: string;
	onClear?: () => void;
	clearButtonText?: string;
}

function NoResultsEmptyState({
	title = 'No matching results',
	subtitle = 'No items match your current filters. Try adjusting your search criteria.',
	onClear,
	clearButtonText = 'Clear Filters',
}: NoResultsEmptyStateProps): JSX.Element {
	return (
		<div className={styles.emptyState} data-testid="no-results-empty-state">
			<Search className={styles.icon} />
			<div className={styles.title} data-testid="no-results-title">
				{title}
			</div>
			<div className={styles.subtitle} data-testid="no-results-subtitle">
				{subtitle}
			</div>
			{onClear && (
				<Button
					variant="outlined"
					onClick={onClear}
					data-testid="no-results-clear-button"
				>
					{clearButtonText}
				</Button>
			)}
		</div>
	);
}

export default NoResultsEmptyState;
