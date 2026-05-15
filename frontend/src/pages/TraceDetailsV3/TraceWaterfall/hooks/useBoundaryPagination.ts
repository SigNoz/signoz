import { RefObject, useEffect, useRef } from 'react';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { IInterestedSpan } from '../types';

const MIN_SPANS_FOR_PAGINATION = 500;

interface UseBoundaryPaginationProps {
	scrollContainerRef: RefObject<HTMLDivElement>;
	spans: SpanV3[];
	isFetching: boolean | undefined;
	isFullDataLoaded: boolean;
	setInterestedSpanId: (next: IInterestedSpan) => void;
}

interface UseBoundaryPaginationResult {
	topSentinelRef: RefObject<HTMLDivElement>;
	bottomSentinelRef: RefObject<HTMLDivElement>;
}

/**
 * Drives load-more on a virtualized list via two `IntersectionObserver`
 * sentinels (top + bottom of the inner content). The observer is created
 * once and reads live state through refs — recreating it would re-fire
 * IO's mandatory initial-intersection callback for sentinels still in view
 * and produce a fetch spiral on every data update.
 *
 * Returns the two refs the caller must attach to its sentinel `<div>`s.
 */
export function useBoundaryPagination({
	scrollContainerRef,
	spans,
	isFetching,
	isFullDataLoaded,
	setInterestedSpanId,
}: UseBoundaryPaginationProps): UseBoundaryPaginationResult {
	const topSentinelRef = useRef<HTMLDivElement | null>(null);
	const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

	const spansRef = useRef<SpanV3[]>(spans);
	const isFetchingRef = useRef<boolean | undefined>(isFetching);
	const isFullDataLoadedRef = useRef<boolean>(isFullDataLoaded);

	useEffect(() => {
		spansRef.current = spans;
	}, [spans]);
	useEffect(() => {
		isFetchingRef.current = isFetching;
	}, [isFetching]);
	useEffect(() => {
		isFullDataLoadedRef.current = isFullDataLoaded;
	}, [isFullDataLoaded]);

	useEffect(() => {
		const root = scrollContainerRef.current;
		if (!root) {
			return undefined;
		}

		const seenInitial = new WeakSet<Element>();

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!seenInitial.has(entry.target)) {
						seenInitial.add(entry.target);
						return;
					}
					if (
						!entry.isIntersecting ||
						isFetchingRef.current ||
						isFullDataLoadedRef.current ||
						spansRef.current.length < MIN_SPANS_FOR_PAGINATION
					) {
						return;
					}

					if (entry.target === bottomSentinelRef.current) {
						const lastSpan = spansRef.current[spansRef.current.length - 1];
						if (lastSpan) {
							setInterestedSpanId({
								spanId: lastSpan.span_id,
								isUncollapsed: false,
							});
						}
					} else if (entry.target === topSentinelRef.current) {
						const firstSpan = spansRef.current[0];
						if (firstSpan && firstSpan.level !== 0) {
							setInterestedSpanId({
								spanId: firstSpan.span_id,
								isUncollapsed: false,
							});
						}
					}
				});
			},
			{ root, threshold: 0 },
		);

		if (bottomSentinelRef.current) {
			observer.observe(bottomSentinelRef.current);
		}
		if (topSentinelRef.current) {
			observer.observe(topSentinelRef.current);
		}

		return (): void => observer.disconnect();
	}, [scrollContainerRef, setInterestedSpanId]);

	return { topSentinelRef, bottomSentinelRef };
}
