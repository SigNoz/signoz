import { TOOLTIP_OFFSET } from './types';

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

export function calculateTooltipPosition(
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
