import { TOOLTIP_OFFSET, TooltipLayoutInfo, TooltipViewState } from './types';

export function isPlotInViewport(
	rect: uPlot.BBox,
	windowWidth: number,
	windowHeight: number,
): boolean {
	return (
		rect.top + rect.height <= windowHeight &&
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.left + rect.width <= windowWidth
	);
}

export function calculateVerticalOffset(
	currentOffset: number,
	clientY: number,
	tooltipHeight: number,
	windowHeight: number,
): number {
	const height = tooltipHeight + TOOLTIP_OFFSET;

	if (currentOffset !== 0) {
		if (clientY + height < windowHeight || clientY - height < 0) {
			return 0;
		}
		if (currentOffset !== -height) {
			return -height;
		}
		return currentOffset;
	}

	if (clientY + height > windowHeight && clientY - height >= 0) {
		return -height;
	}

	return 0;
}

export function calculateHorizontalOffset(
	currentOffset: number,
	clientX: number,
	tooltipWidth: number,
	windowWidth: number,
): number {
	const width = tooltipWidth + TOOLTIP_OFFSET;

	if (currentOffset !== 0) {
		if (clientX + width < windowWidth || clientX - width < 0) {
			return 0;
		}
		if (currentOffset !== -width) {
			return -width;
		}
		return currentOffset;
	}

	if (clientX + width > windowWidth && clientX - width >= 0) {
		return -width;
	}

	return 0;
}

export function calculateTooltipOffset(
	clientX: number,
	clientY: number,
	tooltipWidth: number,
	tooltipHeight: number,
	currentHorizontalOffset: number,
	currentVerticalOffset: number,
	windowWidth: number,
	windowHeight: number,
): { horizontalOffset: number; verticalOffset: number } {
	return {
		horizontalOffset: calculateHorizontalOffset(
			currentHorizontalOffset,
			clientX,
			tooltipWidth,
			windowWidth,
		),
		verticalOffset: calculateVerticalOffset(
			currentVerticalOffset,
			clientY,
			tooltipHeight,
			windowHeight,
		),
	};
}

export function buildTransform(
	clientX: number,
	clientY: number,
	hOffset: number,
	vOffset: number,
): string {
	const translateX =
		clientX + (hOffset === 0 ? TOOLTIP_OFFSET : -TOOLTIP_OFFSET);
	const translateY =
		clientY + (vOffset === 0 ? TOOLTIP_OFFSET : -TOOLTIP_OFFSET);
	const reflectX = hOffset === 0 ? '' : 'translateX(-100%)';
	const reflectY = vOffset === 0 ? '' : 'translateY(-100%)';

	return `translateX(${translateX}px) ${reflectX} translateY(${translateY}px) ${reflectY}`;
}

/**
 * React view state for the tooltip.
 *
 * This is the minimal data needed to render:
 * - current position / CSS style
 * - whether the tooltip is visible or pinned
 * - the React node to show as contents
 * - the associated uPlot instance (for children)
 *
 * All interaction logic lives in the controller; that logic calls
 * `updateState` to push the latest snapshot into React.
 */
export function createInitialViewState(): TooltipViewState {
	return {
		style: { transform: '', pointerEvents: 'none' },
		isHovering: false,
		isPinned: false,
		contents: null,
		plot: null,
		dismiss: (): void => {},
	};
}

/**
 * Creates and wires a ResizeObserver that keeps track of the rendered
 * tooltip size. This is used by the controller to place the tooltip
 * on the correct side of the cursor and avoid clipping the viewport.
 */
export function createLayoutObserver(
	layoutRef: React.MutableRefObject<TooltipLayoutInfo | undefined>,
): TooltipLayoutInfo {
	const layout: TooltipLayoutInfo = {
		width: 0,
		height: 0,
		observer: new ResizeObserver((entries) => {
			const current = layoutRef.current;
			if (!current) {
				return;
			}
			for (const entry of entries) {
				if (entry.borderBoxSize?.length) {
					current.width = entry.borderBoxSize[0].inlineSize;
					current.height = entry.borderBoxSize[0].blockSize;
				} else {
					current.width = entry.contentRect.width;
					current.height = entry.contentRect.height;
				}
			}
		}),
	};
	return layout;
}
