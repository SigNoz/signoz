import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';

import { SUGGESTED_GROUP_BYS } from '../utils/options';

import styles from '../LocationSection.module.scss';

interface GroupByEmptyStateProps {
	/** Adds the keys and runs the query; absent outside the query builder. */
	onAddGroupBy: ((keys: string[]) => void) | undefined;
}

/** Asks for a location group by, offering the usual GeoIP keys. */
function GroupByEmptyState({
	onAddGroupBy,
}: GroupByEmptyStateProps): JSX.Element {
	return (
		<div className={styles.empty} data-testid="geo-location-empty">
			<span className={styles.emptyTitle}>Add a location to Group By</span>
			<span className={styles.muted}>
				Group the query by the attribute that holds each row&apos;s country, state,
				or latitude and longitude, then run it. This section fills in by itself.
			</span>
			<span className={styles.muted}>
				{onAddGroupBy
					? 'GeoIP enrichment usually names them. Pick one to add it and run the query:'
					: 'GeoIP enrichment usually names them:'}
			</span>
			<div className={styles.chips}>
				{SUGGESTED_GROUP_BYS.map(({ label, keys }) =>
					onAddGroupBy ? (
						<Button
							key={label}
							variant="outlined"
							color="secondary"
							size="sm"
							testId={`geo-location-add-group-by-${keys[0]}`}
							onClick={(): void => onAddGroupBy(keys)}
						>
							<span className={styles.mono}>{label}</span>
						</Button>
					) : (
						<Badge key={label} color="secondary" variant="outlined">
							{label}
						</Badge>
					),
				)}
			</div>
		</div>
	);
}

export default GroupByEmptyState;
