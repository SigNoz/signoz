import { RefObject, useEffect, useRef, useState } from 'react';

const MIN_FONT_PX = 16;
const MAX_FONT_PX = 60;
// The value font is sized to a fraction of the container's smaller dimension so
// it scales with the panel without overflowing.
const FONT_SCALE_DIVISOR = 5;

/**
 * Sizes a single large value to its container, recomputing on resize via a
 * ResizeObserver. Returns the ref to attach to the container and the current
 * font size (px) to apply to the value text.
 */
export function useResponsiveFontSize(): {
	containerRef: RefObject<HTMLDivElement>;
	fontSize: string;
} {
	const containerRef = useRef<HTMLDivElement>(null);
	const [fontSize, setFontSize] = useState('2.5vw');

	useEffect(() => {
		const updateFontSize = (): void => {
			if (!containerRef.current) {
				return;
			}
			const { width, height } = containerRef.current.getBoundingClientRect();
			const minDimension = Math.min(width, height);
			const newSize = Math.max(
				Math.min(minDimension / FONT_SCALE_DIVISOR, MAX_FONT_PX),
				MIN_FONT_PX,
			);
			setFontSize(`${newSize}px`);
		};

		updateFontSize();

		const resizeObserver = new ResizeObserver(updateFontSize);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return (): void => {
			resizeObserver.disconnect();
		};
	}, []);

	return { containerRef, fontSize };
}
