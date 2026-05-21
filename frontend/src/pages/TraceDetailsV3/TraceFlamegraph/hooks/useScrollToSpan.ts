import {
	Dispatch,
	MutableRefObject,
	RefObject,
	SetStateAction,
	useEffect,
} from 'react';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import { MIN_VISIBLE_SPAN_MS } from '../constants';
import { ITraceMetadata } from '../types';
import { clamp, findSpanById, getFlamegraphRowMetrics } from '../utils';

interface UseScrollToSpanArgs {
	firstSpanAtFetchLevel: string;
	spans: FlamegraphSpan[][];
	traceMetadata: ITraceMetadata;
	containerRef: RefObject<HTMLDivElement>;
	viewStartRef: MutableRefObject<number>;
	viewEndRef: MutableRefObject<number>;
	scrollTopRef: MutableRefObject<number>;
	rowHeight: number;
	setViewStartTs: Dispatch<SetStateAction<number>>;
	setViewEndTs: Dispatch<SetStateAction<number>>;
	setScrollTop: Dispatch<SetStateAction<number>>;
}

/**
 * When firstSpanAtFetchLevel (from URL spanId) changes, scroll and zoom the
 * flamegraph so the selected span is centered in view.
 */
export function useScrollToSpan(args: UseScrollToSpanArgs): void {
	const {
		firstSpanAtFetchLevel,
		spans,
		traceMetadata,
		containerRef,
		viewStartRef,
		viewEndRef,
		scrollTopRef,
		rowHeight,
		setViewStartTs,
		setViewEndTs,
		setScrollTop,
	} = args;

	useEffect(() => {
		if (!firstSpanAtFetchLevel || spans.length === 0) {
			return;
		}

		const result = findSpanById(spans, firstSpanAtFetchLevel);
		if (!result) {
			return;
		}

		const { span, levelIndex } = result;
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const metrics = getFlamegraphRowMetrics(rowHeight);
		const viewportHeight = container.clientHeight;
		const totalHeight = spans.length * metrics.ROW_HEIGHT;
		const maxScroll = Math.max(0, totalHeight - viewportHeight);

		// Vertical: center the span's row in the viewport
		const targetScrollTop = clamp(
			levelIndex * metrics.ROW_HEIGHT -
				viewportHeight / 2 +
				metrics.ROW_HEIGHT / 2,
			0,
			maxScroll,
		);

		// Horizontal: zoom to span with padding (2x span duration), center it
		const spanStartMs = span.timestamp;
		const spanEndMs = span.timestamp + span.durationNano / 1e6;
		const spanDurationMs = spanEndMs - spanStartMs;
		const spanCenterMs = (spanStartMs + spanEndMs) / 2;

		const visibleWindowMs = Math.max(spanDurationMs * 2, MIN_VISIBLE_SPAN_MS);
		const fullSpanMs = traceMetadata.endTime - traceMetadata.startTime;
		const clampedWindow = clamp(visibleWindowMs, MIN_VISIBLE_SPAN_MS, fullSpanMs);

		let targetViewStart = spanCenterMs - clampedWindow / 2;
		let targetViewEnd = spanCenterMs + clampedWindow / 2;

		targetViewStart = clamp(
			targetViewStart,
			traceMetadata.startTime,
			traceMetadata.endTime - clampedWindow,
		);
		targetViewEnd = targetViewStart + clampedWindow;

		// Apply immediately (instant jump)
		viewStartRef.current = targetViewStart;
		viewEndRef.current = targetViewEnd;
		scrollTopRef.current = targetScrollTop;

		setViewStartTs(targetViewStart);
		setViewEndTs(targetViewEnd);
		setScrollTop(targetScrollTop);
	}, [
		firstSpanAtFetchLevel,
		spans,
		traceMetadata,
		containerRef,
		viewStartRef,
		viewEndRef,
		scrollTopRef,
		rowHeight,
		setViewStartTs,
		setViewEndTs,
		setScrollTop,
	]);
}
