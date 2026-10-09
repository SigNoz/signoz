import { RefObject, useLayoutEffect, useRef } from 'react';

import { useIntersectionSentinel } from './useIntersectionSentinel';

interface UseThreadInfiniteScrollOptions {
	containerRef: RefObject<HTMLDivElement>;
	firstItemKey?: string;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	isFetchingNextPage: boolean;
	isFetchingPreviousPage: boolean;
	fetchNextPage: () => Promise<unknown>;
	fetchPreviousPage: () => Promise<unknown>;
}

interface UseThreadInfiniteScrollResult {
	topSentinelRef: RefObject<HTMLDivElement>;
	bottomSentinelRef: RefObject<HTMLDivElement>;
}

/** Loads pages as either list edge nears view, holding position on prepend. */
export function useThreadInfiniteScroll({
	containerRef,
	firstItemKey,
	hasNextPage,
	hasPreviousPage,
	isFetchingNextPage,
	isFetchingPreviousPage,
	fetchNextPage,
	fetchPreviousPage,
}: UseThreadInfiniteScrollOptions): UseThreadInfiniteScrollResult {
	const topSentinelRef = useRef<HTMLDivElement>(null);
	const bottomSentinelRef = useRef<HTMLDivElement>(null);
	const heightBeforePrependRef = useRef<number | null>(null);

	const loadPreviousRef = useRef((): void => {});
	loadPreviousRef.current = (): void => {
		heightBeforePrependRef.current = containerRef.current?.scrollHeight ?? null;
		void fetchPreviousPage();
	};
	// Stable wrapper so the observer isn't recreated on every render.
	const stableLoadPrevious = useRef((): void =>
		loadPreviousRef.current(),
	).current;

	useIntersectionSentinel(
		containerRef,
		bottomSentinelRef,
		hasNextPage && !isFetchingNextPage,
		fetchNextPage,
	);
	useIntersectionSentinel(
		containerRef,
		topSentinelRef,
		hasPreviousPage && !isFetchingPreviousPage,
		stableLoadPrevious,
	);

	useLayoutEffect(() => {
		const container = containerRef.current;
		const previousHeight = heightBeforePrependRef.current;
		if (!container || previousHeight === null) {
			return;
		}
		heightBeforePrependRef.current = null;
		container.scrollTop += container.scrollHeight - previousHeight;
	}, [containerRef, firstItemKey]);

	return { topSentinelRef, bottomSentinelRef };
}
