import { ReactNode, useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';

import ThreadPageLoader from './ThreadPageLoader';
import { ThreadSpan } from './types';

import styles from './ThreadSpanList.module.scss';

// Virtuoso needs a positive index it can decrease as older spans are prepended.
const FIRST_ITEM_INDEX_BASE = 1_000_000;
const LOAD_AHEAD_PX = 200;

interface ThreadSpanListProps {
	spans: ThreadSpan[];
	spansAboveFirstPage: number;
	initialSpanIndex?: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	isFetchingNextPage: boolean;
	isFetchingPreviousPage: boolean;
	fetchNextPage: () => Promise<unknown>;
	fetchPreviousPage: () => Promise<unknown>;
	renderSpan: (span: ThreadSpan) => ReactNode;
}

function ThreadSpanList({
	spans,
	spansAboveFirstPage,
	initialSpanIndex,
	hasNextPage,
	hasPreviousPage,
	isFetchingNextPage,
	isFetchingPreviousPage,
	fetchNextPage,
	fetchPreviousPage,
	renderSpan,
}: ThreadSpanListProps): JSX.Element {
	const handleEndReached = useCallback((): void => {
		if (hasNextPage && !isFetchingNextPage) {
			void fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const handleStartReached = useCallback((): void => {
		if (hasPreviousPage && !isFetchingPreviousPage) {
			void fetchPreviousPage();
		}
	}, [hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage]);

	const components = useMemo(
		() => ({
			Header: (): JSX.Element | null =>
				hasPreviousPage || isFetchingPreviousPage ? (
					<div className={styles.item}>
						<ThreadPageLoader testId="thread-loading-previous" />
					</div>
				) : null,
			Footer: (): JSX.Element => (
				<div className={styles.footer}>
					{isFetchingNextPage && (
						<div className={styles.item}>
							<ThreadPageLoader testId="thread-loading-next" />
						</div>
					)}
				</div>
			),
		}),
		[hasPreviousPage, isFetchingPreviousPage, isFetchingNextPage],
	);

	return (
		<Virtuoso
			className={styles.list}
			data-testid="thread-span-list"
			data={spans}
			// 0 is allowed, negative is not (Virtuoso warns); the base fits 1,000,000 prepended spans.
			firstItemIndex={FIRST_ITEM_INDEX_BASE - spansAboveFirstPage}
			// Omitted, not undefined: an explicit undefined blanks the list, and 0 resets an early scroll.
			{...(initialSpanIndex === undefined
				? {}
				: { initialTopMostItemIndex: initialSpanIndex })}
			increaseViewportBy={LOAD_AHEAD_PX}
			computeItemKey={(_, span): string => span.span_id}
			itemContent={(_, span): JSX.Element => (
				<div className={styles.item}>{renderSpan(span)}</div>
			)}
			startReached={handleStartReached}
			endReached={handleEndReached}
			components={components}
		/>
	);
}

export default ThreadSpanList;
