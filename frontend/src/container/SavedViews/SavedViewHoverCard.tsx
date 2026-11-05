import { CalendarClock } from '@signozhq/icons';
import { Popover } from '@signozhq/ui/popover';
import { Typography } from '@signozhq/ui/typography';
import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { useTimezone } from 'providers/Timezone';

import {
	SAVED_VIEW_HOVER_CARD_WIDTH,
	SAVED_VIEW_UPDATED_AT_FORMAT,
} from './constants';
import SavedViewHighlightedExpression from './SavedViewHighlightedExpression';
import { getSavedViewQuerySummaries } from './utils/getSavedViewQuerySummaries';
import { SavedViewHoverCardProps } from './types';

import styles from './SavedViewHoverCard.module.scss';

/**
 * One card for the whole list, shown against whichever row the pointer rests on.
 *
 * Driven by a handle rather than a trigger: the rows carry their own buttons and menu, so making
 * each one a trigger would multiply the popup and swallow those controls into it. The list calls
 * `showAt(rowElement, view)` instead, and the card moves to that row and renders that view.
 */
function SavedViewHoverCard({
	handle,
	onCardEnter,
	onCardLeave,
}: SavedViewHoverCardProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return (
		<Popover
			side="right"
			align="start"
			handle={handle}
			width={SAVED_VIEW_HOVER_CARD_WIDTH}
			// The card is a preview; the pointer and the keyboard stay where they were.
			initialFocus={false}
			finalFocus={false}
			aria-label="Saved view preview"
		>
			{(view: SavedviewtypesSavedViewDTO | undefined): JSX.Element | null => {
				if (!view) {
					return null;
				}

				const querySummaries = getSavedViewQuerySummaries(view);
				const hasQueryNames = querySummaries.length > 1;
				const copyValue = querySummaries
					.filter(({ expression }) => expression.length > 0)
					.map(({ queryName, expression }) =>
						hasQueryNames ? `${queryName}: ${expression}` : expression,
					)
					.join('\n');

				return (
					<div
						className={styles.content}
						onMouseEnter={onCardEnter}
						onMouseLeave={onCardLeave}
						data-testid="saved-view-hover-card"
					>
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
								<Typography.Text className={styles.noFilters}>
									No filters
								</Typography.Text>
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
					</div>
				);
			}}
		</Popover>
	);
}

export default SavedViewHoverCard;
