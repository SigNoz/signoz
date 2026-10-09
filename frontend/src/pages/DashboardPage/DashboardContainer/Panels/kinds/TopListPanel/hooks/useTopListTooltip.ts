import {
	type FC,
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useRef,
} from 'react';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import type { TooltipInPortalProps } from '@visx/tooltip/lib/hooks/useTooltipInPortal';

/** Above the dashboard grid, like the chart tooltips. */
const TOOLTIP_Z_INDEX = 1000;

interface TopListTooltip {
	/** The hovered row, or null when the tooltip is hidden. */
	rowIndex: number | null;
	top?: number;
	left?: number;
	show: (index: number, event: ReactMouseEvent<HTMLElement>) => void;
	hide: () => void;
	/** Hides the tooltip when the pointer is over the list but not on a row. */
	hideOffRow: (event: ReactMouseEvent<HTMLElement>) => void;
	/** The element the tooltip is positioned against. */
	listRef: (element: HTMLElement | null) => void;
	TooltipInPortal: FC<TooltipInPortalProps>;
}

/** One tooltip for the whole list, following the pointer the way the chart tooltips do. */
export function useTopListTooltip(): TopListTooltip {
	const {
		tooltipOpen,
		tooltipData,
		tooltipTop,
		tooltipLeft,
		showTooltip,
		hideTooltip,
	} = useTooltip<number>();
	const { containerRef, containerBounds, TooltipInPortal } = useTooltipInPortal({
		scroll: true,
		detectBounds: true,
		zIndex: TOOLTIP_Z_INDEX,
	});

	// Read at event time so `show` stays stable for the memoised rows.
	const boundsRef = useRef(containerBounds);
	boundsRef.current = containerBounds;

	const show = useCallback(
		(index: number, event: ReactMouseEvent<HTMLElement>): void => {
			const { left, top } = boundsRef.current;
			showTooltip({
				tooltipData: index,
				tooltipLeft: event.clientX - left,
				tooltipTop: event.clientY - top,
			});
		},
		[showTooltip],
	);

	const hideOffRow = useCallback(
		(event: ReactMouseEvent<HTMLElement>): void => {
			if (!(event.target as Element).closest('[data-row-index]')) {
				hideTooltip();
			}
		},
		[hideTooltip],
	);

	return {
		rowIndex: tooltipOpen ? (tooltipData ?? null) : null,
		top: tooltipTop,
		left: tooltipLeft,
		show,
		hide: hideTooltip,
		hideOffRow,
		listRef: containerRef,
		TooltipInPortal,
	};
}
