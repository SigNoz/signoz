import type { RefObject } from 'react';
import { useEffect, useState } from 'react';
import type { Rnd } from 'react-rnd';

interface ViewportSize {
	width: number;
	height: number;
}

function readViewport(): ViewportSize {
	return { width: window.innerWidth, height: window.innerHeight };
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Moves and shrinks the panel back into view whenever the window resizes; a panel that still fits stays put. */
export function useKeepInViewport(
	rndRef: RefObject<Rnd>,
	enabled: boolean,
): ViewportSize {
	const [viewport, setViewport] = useState(readViewport);

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const onResize = (): void => setViewport(readViewport());
		window.addEventListener('resize', onResize);
		return (): void => window.removeEventListener('resize', onResize);
	}, [enabled]);

	useEffect(() => {
		const rnd = rndRef.current;
		const element = rnd?.getSelfElement();
		if (!enabled || !rnd || !element) {
			return;
		}
		const width = Math.min(element.offsetWidth, viewport.width);
		const height = Math.min(element.offsetHeight, viewport.height);
		if (width !== element.offsetWidth || height !== element.offsetHeight) {
			rnd.updateSize({ width, height });
		}
		const { x, y } = rnd.getDraggablePosition();
		const fitted = {
			x: clamp(x, 0, viewport.width - width),
			y: clamp(y, 0, viewport.height - height),
		};
		if (fitted.x !== x || fitted.y !== y) {
			rnd.updatePosition(fitted);
		}
	}, [enabled, rndRef, viewport]);

	return viewport;
}
