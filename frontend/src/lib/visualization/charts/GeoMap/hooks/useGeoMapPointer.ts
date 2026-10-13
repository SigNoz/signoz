import { useRef } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import type { ProvidedZoom, TransformMatrix } from '@visx/zoom/lib/types';

import { centreOf, codeOf } from '../utils/dom';

type Zoom = ProvidedZoom<SVGSVGElement> & {
	transformMatrix: TransformMatrix;
	isDragging: boolean;
};

interface GeoMapPointerHandlers {
	onMouseDown: (event: MouseEvent) => void;
	onMouseMove: (event: MouseEvent) => void;
	onMouseUp: () => void;
	onMouseLeave: () => void;
	onClick: (event: MouseEvent) => void;
	onFocus: (event: FocusEvent) => void;
	onBlur: () => void;
	onKeyDown: (event: KeyboardEvent) => void;
}

// Beyond this a press is a pan, not a click on a country.
const CLICK_SLOP_PX = 4;

/** Hover, click and keyboard on countries/bubbles, plus drag-to-pan once zoomed in. */
export function useGeoMapPointer(
	zoom: Zoom,
	onHover: (code: string | null, clientX: number, clientY: number) => void,
	onSelect: (code: string, clientX: number, clientY: number) => void,
): GeoMapPointerHandlers {
	const pressedAt = useRef<{ x: number; y: number } | null>(null);
	const isZoomed = zoom.transformMatrix.scaleX > 1;

	return {
		onMouseDown: (event): void => {
			pressedAt.current = { x: event.clientX, y: event.clientY };
			if (isZoomed) {
				zoom.dragStart(event);
			}
		},
		onMouseMove: (event): void => {
			if (zoom.isDragging) {
				zoom.dragMove(event);
				onHover(null, 0, 0);
				return;
			}
			onHover(codeOf(event.target), event.clientX, event.clientY);
		},
		onMouseUp: (): void => zoom.dragEnd(),
		onMouseLeave: (): void => {
			zoom.dragEnd();
			onHover(null, 0, 0);
		},
		onClick: (event): void => {
			const start = pressedAt.current;
			const moved = start
				? Math.hypot(event.clientX - start.x, event.clientY - start.y)
				: 0;
			const code = codeOf(event.target);
			if (code && moved <= CLICK_SLOP_PX) {
				onSelect(code, event.clientX, event.clientY);
			}
		},
		onFocus: (event): void => {
			const [x, y] = centreOf(event.target);
			onHover(codeOf(event.target), x, y);
		},
		onBlur: (): void => onHover(null, 0, 0),
		onKeyDown: (event): void => {
			const code = codeOf(event.target);
			if (event.key === 'Enter' && code) {
				const [x, y] = centreOf(event.target);
				onSelect(code, x, y);
			}
		},
	};
}
