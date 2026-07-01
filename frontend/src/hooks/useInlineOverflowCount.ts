import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInlineOverflowCountOptions {
	itemCount: number;
	/** Horizontal gap between items, in px. */
	gap?: number;
	/** Width kept free at the end of the line for a trailing "+N" trigger, in px. */
	reserveWidth?: number;
	/** Pause measuring (e.g. while expanded) without unmounting. */
	enabled?: boolean;
}

interface UseInlineOverflowCountResult {
	containerRef: React.RefObject<HTMLDivElement>;
	visibleCount: number;
	overflowCount: number;
}

/**
 * Measures how many of a container's children (each marked
 * `data-overflow-item="true"`) fit on a single line, reserving `reserveWidth`
 * for a trailing "+N" trigger. Item widths are cached, so children hidden with
 * `display: none` still count toward the fit; measuring pauses while `enabled`
 * is false.
 */
export function useInlineOverflowCount({
	itemCount,
	gap = 8,
	reserveWidth = 0,
	enabled = true,
}: UseInlineOverflowCountOptions): UseInlineOverflowCountResult {
	const containerRef = useRef<HTMLDivElement>(null);
	const [visibleCount, setVisibleCount] = useState(itemCount);
	const itemWidthsRef = useRef<number[]>([]);
	const enabledRef = useRef(enabled);
	enabledRef.current = enabled;

	useEffect(() => {
		itemWidthsRef.current = [];
		setVisibleCount(itemCount);
	}, [itemCount]);

	const measure = useCallback((): void => {
		const container = containerRef.current;
		if (!container || !enabledRef.current) {
			return;
		}
		const itemElements = Array.from(container.children).filter(
			(itemElement): itemElement is HTMLElement =>
				itemElement instanceof HTMLElement &&
				itemElement.dataset.overflowItem === 'true',
		);
		if (itemElements.length === 0) {
			setVisibleCount(0);
			return;
		}

		itemElements.forEach((itemElement, index) => {
			if (itemElement.offsetWidth > 0) {
				itemWidthsRef.current[index] = itemElement.offsetWidth;
			}
		});
		const cachedWidths: number[] = [];
		for (let index = 0; index < itemElements.length; index += 1) {
			const cachedWidth = itemWidthsRef.current[index];
			if (cachedWidth == null) {
				// Width not cached yet — reveal everything for one frame so it gets
				// measured, then the next pass collapses accurately.
				setVisibleCount(itemElements.length);
				return;
			}
			cachedWidths.push(cachedWidth);
		}

		const containerWidth = container.clientWidth;
		const totalWidth = cachedWidths.reduce(
			(runningTotal, itemWidth, index) =>
				runningTotal + itemWidth + (index > 0 ? gap : 0),
			0,
		);
		if (totalWidth <= containerWidth) {
			setVisibleCount(itemElements.length);
			return;
		}

		const availableWidth = containerWidth - reserveWidth;
		let usedWidth = 0;
		let fitCount = 0;
		for (let index = 0; index < cachedWidths.length; index += 1) {
			const itemWidthWithGap = cachedWidths[index] + (index > 0 ? gap : 0);
			if (usedWidth + itemWidthWithGap > availableWidth && fitCount > 0) {
				break;
			}
			usedWidth += itemWidthWithGap;
			fitCount += 1;
		}
		setVisibleCount(Math.max(1, fitCount));
	}, [gap, reserveWidth]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return undefined;
		}
		const observer = new ResizeObserver(() => measure());
		observer.observe(container);
		Array.from(container.children).forEach((child) => observer.observe(child));
		measure();
		return (): void => observer.disconnect();
	}, [measure, itemCount, enabled]);

	return {
		containerRef,
		visibleCount,
		overflowCount: Math.max(0, itemCount - visibleCount),
	};
}
