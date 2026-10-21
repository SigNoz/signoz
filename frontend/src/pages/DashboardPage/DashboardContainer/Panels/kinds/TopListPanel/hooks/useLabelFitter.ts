import { type RefObject, useCallback, useMemo } from 'react';
import { useResizeObserver } from 'hooks/useDimensions';

import { truncateMiddle } from '../utils';

/** The label's horizontal padding inside the bar, plus a pixel for canvas/DOM rounding. */
const LABEL_INSET_X = 17;
const RESIZE_DEBOUNCE_MS = 100;

let canvasContext: CanvasRenderingContext2D | null | undefined;

function getCanvasContext(): CanvasRenderingContext2D | null {
	if (canvasContext === undefined) {
		canvasContext = document.createElement('canvas').getContext('2d');
	}
	return canvasContext;
}

/**
 * Middle-truncates labels to the bar column, measured on `barRef`, which must carry the
 * label's font. Labels pass through unchanged until the column has a width.
 */
export function useLabelFitter(
	barRef: RefObject<HTMLElement>,
): (label: string) => string {
	const { width } = useResizeObserver(barRef, RESIZE_DEBOUNCE_MS);
	const maxWidth = width - LABEL_INSET_X;

	const font = useMemo(() => {
		const node = barRef.current;
		if (!node || maxWidth <= 0) {
			return null;
		}
		const { fontWeight, fontSize, fontFamily } = getComputedStyle(node);
		return `${fontWeight} ${fontSize} ${fontFamily}`;
	}, [barRef, maxWidth]);

	return useCallback(
		(label: string): string => {
			const context = font ? getCanvasContext() : null;
			if (!context || !font) {
				return label;
			}
			context.font = font;
			return truncateMiddle(
				label,
				maxWidth,
				(value) => context.measureText(value).width,
			);
		},
		[font, maxWidth],
	);
}
