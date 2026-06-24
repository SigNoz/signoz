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
		const items = Array.from(container.children).filter(
			(el): el is HTMLElement =>
				el instanceof HTMLElement && el.dataset.overflowItem === 'true',
		);
		if (items.length === 0) {
			setVisibleCount(0);
			return;
		}

		items.forEach((el, i) => {
			if (el.offsetWidth > 0) {
				itemWidthsRef.current[i] = el.offsetWidth;
			}
		});
		const widths: number[] = [];
		for (let i = 0; i < items.length; i += 1) {
			const width = itemWidthsRef.current[i];
			if (width == null) {
				// Width not cached yet — reveal everything for one frame so it gets
				// measured, then the next pass collapses accurately.
				setVisibleCount(items.length);
				return;
			}
			widths.push(width);
		}

		const containerWidth = container.clientWidth;
		const totalWidth = widths.reduce(
			(sum, w, i) => sum + w + (i > 0 ? gap : 0),
			0,
		);
		if (totalWidth <= containerWidth) {
			setVisibleCount(items.length);
			return;
		}

		const availableWidth = containerWidth - reserveWidth;
		let usedWidth = 0;
		let fitCount = 0;
		for (let i = 0; i < widths.length; i += 1) {
			const segmentWidth = widths[i] + (i > 0 ? gap : 0);
			if (usedWidth + segmentWidth > availableWidth && fitCount > 0) {
				break;
			}
			usedWidth += segmentWidth;
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
