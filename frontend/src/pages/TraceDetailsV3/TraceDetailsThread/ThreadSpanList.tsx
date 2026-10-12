import { ReactNode, RefObject } from 'react';

import { useThreadInfiniteScroll } from './hooks/useThreadInfiniteScroll';
import ThreadPageLoader from './ThreadPageLoader';

import styles from './ThreadSpanList.module.scss';

interface ThreadSpanListProps {
	listRef: RefObject<HTMLDivElement>;
	firstItemKey?: string;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	isFetchingNextPage: boolean;
	isFetchingPreviousPage: boolean;
	fetchNextPage: () => Promise<unknown>;
	fetchPreviousPage: () => Promise<unknown>;
	children: ReactNode;
}

function ThreadSpanList({
	listRef,
	firstItemKey,
	hasNextPage,
	hasPreviousPage,
	isFetchingNextPage,
	isFetchingPreviousPage,
	fetchNextPage,
	fetchPreviousPage,
	children,
}: ThreadSpanListProps): JSX.Element {
	const { topSentinelRef, bottomSentinelRef } = useThreadInfiniteScroll({
		containerRef: listRef,
		firstItemKey,
		hasNextPage,
		hasPreviousPage,
		isFetchingNextPage,
		isFetchingPreviousPage,
		fetchNextPage,
		fetchPreviousPage,
	});

	return (
		<div className={styles.list} ref={listRef} data-testid="thread-span-list">
			<div ref={topSentinelRef} className={styles.sentinel} />
			{isFetchingPreviousPage && (
				<ThreadPageLoader testId="thread-loading-previous" />
			)}
			{children}
			{isFetchingNextPage && <ThreadPageLoader testId="thread-loading-next" />}
			<div ref={bottomSentinelRef} className={styles.sentinel} />
		</div>
	);
}

export default ThreadSpanList;
