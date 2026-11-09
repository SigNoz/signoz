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
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
				data-testid="saved-view-hover-card-error"
			>
				{SAVED_VIEW_LOAD_FAILED_NAME}
			</Typography>
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
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="main"
					as="span"
					display="block"
					textOverflow="ellipsis"
				>
					{view.spec.displayName}
				</Typography>
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
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="tertiary"
						as="span"
						textOverflow="wrap"
					>
						No filters
					</Typography>
				) : (
					querySummaries.map(({ queryName, expression, metric }) => (
						<div key={queryName} className={styles.queryItem}>
							{hasQueryNames && (
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="secondary"
									as="span"
									textOverflow="wrap"
								>
									{queryName}
								</Typography>
							)}
							{metric && (
								<Typography
									variant="code"
									size="small"
									weight="regular"
									color="secondary"
									as="span"
									textOverflow="wrap"
								>
									{metric}
								</Typography>
							)}
							{expression && (
								<div className={styles.expression}>
									<Typography
										variant="code"
										size="small"
										weight="regular"
										color="main"
										as="span"
										textOverflow="wrap"
									>
										<SavedViewHighlightedExpression expression={expression} />
									</Typography>
								</div>
							)}
						</div>
					))
				)}
			</div>
			<div className={styles.updated}>
				<Typography
					variant="uppercase"
					size="small"
					weight="medium"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					Last updated
				</Typography>
				{view.updatedBy && (
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						{view.updatedBy}
					</Typography>
				)}
				{view.updatedAt && (
					<div className={styles.meta}>
						<CalendarClock size={14} />
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							{formatTimezoneAdjustedTimestamp(
								view.updatedAt,
								SAVED_VIEW_UPDATED_AT_FORMAT,
							)}
						</Typography>
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
