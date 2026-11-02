import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';

import { HEADER_HEIGHT, LIST_PADDING_Y, ROW_GAP } from '../constants';

const OVERSCAN = 10;
/** Size assumed until the container is measured, so the first paint isn't empty. */
const INITIAL_RECT = { width: 0, height: 600 };
/** Frames to wait for a scrolled-to row to mount before giving up on focusing it. */
const FOCUS_RETRY_FRAMES = 10;
/** The first row's offset in the container: the list's top padding, the header and the gap below it. */
const ROWS_OFFSET = LIST_PADDING_Y / 2 + HEADER_HEIGHT + ROW_GAP;

interface UseTopListVirtualizerArgs {
	count: number;
	rowHeight: number;
	containerRef: RefObject<HTMLDivElement>;
}

interface TopListVirtualizer {
	/** The rows to render: those in view plus an overscan either side. */
	virtualItems: VirtualItem[];
	/** Space standing in for the rows above and below the rendered window. */
	paddingTop: number;
	paddingBottom: number;
	/** Scrolls the row into view if needed, then focuses it. */
	focusRow: (index: number) => void;
}

export function useTopListVirtualizer({
	count,
	rowHeight,
	containerRef,
}: UseTopListVirtualizerArgs): TopListVirtualizer {
	const virtualizer = useVirtualizer({
		count,
		getScrollElement: () => containerRef.current,
		estimateSize: () => rowHeight,
		gap: ROW_GAP,
		scrollMargin: ROWS_OFFSET,
		// Keeps a row scrolled to from landing under the sticky header.
		scrollPaddingStart: HEADER_HEIGHT,
		scrollPaddingEnd: LIST_PADDING_Y / 2,
		overscan: OVERSCAN,
		initialRect: INITIAL_RECT,
	});
	const focusFrame = useRef<number>();

	// Every row takes the density's height, so a density change re-lays out every row.
	useEffect(() => {
		virtualizer.measure();
	}, [virtualizer, rowHeight]);

	useEffect(() => (): void => cancelAnimationFrame(focusFrame.current ?? 0), []);

	const focusRow = useCallback(
		(index: number): void => {
			cancelAnimationFrame(focusFrame.current ?? 0);
			virtualizer.scrollToIndex(index, { align: 'auto' });
			let attempts = 0;
			const tryFocus = (): void => {
				const row = containerRef.current?.querySelector<HTMLElement>(
					`[data-row-index="${index}"]`,
				);
				if (row) {
					// The virtualizer already scrolled; a native focus scroll would fight it.
					row.focus({ preventScroll: true });
					return;
				}
				if (attempts < FOCUS_RETRY_FRAMES) {
					attempts += 1;
					focusFrame.current = requestAnimationFrame(tryFocus);
				}
			};
			tryFocus();
		},
		[virtualizer, containerRef],
	);

	const virtualItems = virtualizer.getVirtualItems();
	const first = virtualItems[0];
	const last = virtualItems[virtualItems.length - 1];
	return {
		virtualItems,
		// Item offsets include the scroll margin; the total size doesn't.
		paddingTop: first ? first.start - ROWS_OFFSET : 0,
		paddingBottom: last
			? virtualizer.getTotalSize() - (last.end - ROWS_OFFSET)
			: 0,
		focusRow,
	};
}
