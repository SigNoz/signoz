import type { TransformMatrix } from '@visx/zoom/lib/types';

export const MAX_ZOOM = 12;
export const ZOOM_STEP = 1.6;

/** Keeps the map covering the panel: no zooming out past fit, no panning off an edge. */
export function constrainZoom(
	width: number,
	height: number,
): (transform: TransformMatrix) => TransformMatrix {
	return (transform): TransformMatrix => {
		const scale = Math.min(Math.max(transform.scaleX, 1), MAX_ZOOM);
		const clamp = (value: number, min: number): number =>
			Math.min(Math.max(value, min), 0);
		return {
			...transform,
			scaleX: scale,
			scaleY: scale,
			translateX: clamp(transform.translateX, width - width * scale),
			translateY: clamp(transform.translateY, height - height * scale),
		};
	};
}
