import { useMemo } from 'react';
import { CalendarClock } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { useGetSavedView } from 'api/generated/services/saved-view';
import { withAuthZContent } from 'lib/authz/components/withAuthZ/withAuthZContent';
import { buildSavedViewReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { useTimezone } from 'providers/Timezone';

import {
	SAVED_VIEW_LOAD_FAILED_NAME,
	SAVED_VIEW_UPDATED_AT_FORMAT,
} from './constants';
import SavedViewHighlightedExpression from './SavedViewHighlightedExpression';
import SavedViewHoverCardSkeleton from './SavedViewHoverCardSkeleton';
import { SavedViewHoverCardDetailsProps } from './types';
import { getSavedViewQuerySummaries } from './utils/getSavedViewQuerySummaries';

import styles from './SavedViewHoverCard.module.scss';

function SavedViewHoverCardDetails({
	viewId,
}: SavedViewHoverCardDetailsProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const { data, isLoading, isError } = useGetSavedView({ id: viewId });
	const view = data?.data;
	const querySummaries = useMemo(
		() => (view ? getSavedViewQuerySummaries(view) : []),
		[view],
	);

	if (isLoading) {
		return <SavedViewHoverCardSkeleton />;
	}

	if (isError || !view) {
		return (
			<Typography.Text
				className={styles.error}
				data-testid="saved-view-hover-card-error"
			>
				{SAVED_VIEW_LOAD_FAILED_NAME}
			</Typography.Text>
		);
	}

	const hasQueryNames = querySummaries.length > 1;
	const copyValue = querySummaries
		.filter(({ expression }) => expression.length > 0)
		.map(({ queryName, expression }) =>
			hasQueryNames ? `${queryName}: ${expression}` : expression,
		)
		.join('\n');

	return (
		<>
			<div className={styles.header}>
				<Typography.Text className={styles.name}>
					{view.spec.displayName}
				</Typography.Text>
				{copyValue && (
					<CopyButton
						value={copyValue}
						ariaLabel="Copy query"
						testId="saved-view-hover-card-copy"
					/>
				)}
			</div>
			<div className={styles.query} data-testid="saved-view-hover-card-query">
				{querySummaries.length === 0 ? (
					<Typography.Text className={styles.noFilters}>No filters</Typography.Text>
				) : (
					querySummaries.map(({ queryName, expression, metric }) => (
						<div key={queryName} className={styles.queryItem}>
							{hasQueryNames && (
								<Typography.Text className={styles.queryName}>
									{queryName}
								</Typography.Text>
							)}
							{metric && (
								<Typography.Text className={styles.metric}>{metric}</Typography.Text>
							)}
							{expression && (
								<Typography.Text className={styles.expression}>
									<SavedViewHighlightedExpression expression={expression} />
								</Typography.Text>
							)}
						</div>
					))
				)}
			</div>
			<div className={styles.updated}>
				<Typography.Text className={styles.sectionTitle}>
					Last updated
				</Typography.Text>
				{view.updatedBy && (
					<Typography.Text className={styles.metaText}>
						{view.updatedBy}
					</Typography.Text>
				)}
				{view.updatedAt && (
					<div className={styles.meta}>
						<CalendarClock size={14} />
						<Typography.Text className={styles.metaText}>
							{formatTimezoneAdjustedTimestamp(
								view.updatedAt,
								SAVED_VIEW_UPDATED_AT_FORMAT,
							)}
						</Typography.Text>
					</div>
				)}
			</div>
		</>
	);
}

export default withAuthZContent(SavedViewHoverCardDetails, {
	checks: ({ viewId, canReadAll }) =>
		canReadAll ? [] : [buildSavedViewReadPermission(viewId)],
	fallbackOnLoading: <SavedViewHoverCardSkeleton />,
});
