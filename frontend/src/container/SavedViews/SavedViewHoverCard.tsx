import { CalendarClock } from '@signozhq/icons';
import { Popover, PopoverAnchor, PopoverContent } from '@signozhq/ui/popover';
import { useMemo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { useTimezone } from 'providers/Timezone';

import { SAVED_VIEW_UPDATED_AT_FORMAT } from './constants';
import SavedViewHighlightedExpression from './SavedViewHighlightedExpression';
import { getSavedViewQuerySummaries } from './utils/getSavedViewQuerySummaries';
import { SavedViewHoverCardProps } from './types';

import styles from './SavedViewHoverCard.module.scss';

function SavedViewHoverCard({
	target,
	onCardEnter,
	onCardLeave,
	onClose,
}: SavedViewHoverCardProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const view = target?.view;
	const querySummaries = useMemo(
		() => (view ? getSavedViewQuerySummaries(view) : []),
		[view],
	);
	const hasQueryNames = querySummaries.length > 1;
	const copyValue = querySummaries
		.filter(({ expression }) => expression.length > 0)
		.map(({ queryName, expression }) =>
			hasQueryNames ? `${queryName}: ${expression}` : expression,
		)
		.join('\n');

	return (
		<Popover
			open={!!view}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
		>
			<PopoverAnchor asChild>
				<div
					className={styles.anchor}
					style={{ top: target?.anchorTop ?? 0, height: target?.anchorHeight ?? 0 }}
				/>
			</PopoverAnchor>
			<PopoverContent
				side="right"
				align="start"
				sideOffset={4}
				className={styles.card}
				onOpenAutoFocus={(event): void => event.preventDefault()}
				onCloseAutoFocus={(event): void => event.preventDefault()}
			>
				{view && (
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
				)}
			</PopoverContent>
		</Popover>
	);
}

export default SavedViewHoverCard;
