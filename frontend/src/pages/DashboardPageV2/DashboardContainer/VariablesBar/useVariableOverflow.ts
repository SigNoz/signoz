import { useCallback, useEffect, useRef, useState } from 'react';

/** Right margin between variable pills (keep in sync with `.variableSlot`). */
const ITEM_GAP = 8;
/** Room reserved for the inline `+N` trigger that follows the last visible pill. */
const TRIGGER_RESERVE = 48;

interface Result {
	stripRef: React.RefObject<HTMLDivElement>;
	/** How many pills fit on the first line before the rest collapse behind the trigger. */
	visibleCount: number;
}

/**
 * Measures how many variable pills fit on the first line (the space left of the
 * floated time selector) so the bar can collapse the overflow behind an inline
 * `+N` trigger placed right after the last visible pill.
 *
 * The overflow pills are `display: none` (so the trigger hugs the last visible
 * pill instead of floating to the container edge) but stay mounted — their last
 * measured width is cached so they still count toward the fit calculation, and
 * variable auto-selection / option fetching keep driving the panels.
 *
 * Measuring is paused while `active` is false (expanded): the strip then spans
 * the full width and wraps under the float, so a fresh measure would wrongly
 * report that everything fits.
 */
export function useVariableOverflow(
	itemCount: number,
	active: boolean,
): Result {
	const stripRef = useRef<HTMLDivElement>(null);
	const [visibleCount, setVisibleCount] = useState(itemCount);
	const widthsRef = useRef<number[]>([]);
	const activeRef = useRef(active);
	activeRef.current = active;

	// The variable set changed — drop cached widths and re-measure from scratch.
	useEffect(() => {
		widthsRef.current = [];
		setVisibleCount(itemCount);
	}, [itemCount]);

	const measure = useCallback((): void => {
		const strip = stripRef.current;
		if (!strip || !activeRef.current) {
			return;
		}
		const items = Array.from(strip.children).filter(
			(el): el is HTMLElement =>
				el instanceof HTMLElement && el.dataset.overflowItem === 'true',
		);
		if (items.length === 0) {
			setVisibleCount(0);
			return;
		}

		// Cache the width of every pill currently in layout; `display: none` pills
		// report 0 and keep their previously cached width.
		items.forEach((el, i) => {
			if (el.offsetWidth > 0) {
				widthsRef.current[i] = el.offsetWidth;
			}
		});
		const widths: number[] = [];
		for (let i = 0; i < items.length; i += 1) {
			const width = widthsRef.current[i];
			if (width == null) {
				// A pill hasn't been measured yet — reveal everything for one frame so
				// its width gets cached, then the next pass collapses accurately.
				setVisibleCount(items.length);
				return;
			}
			widths.push(width);
		}

		const stripWidth = strip.clientWidth;
		const totalWidth = widths.reduce(
			(sum, w, i) => sum + w + (i > 0 ? ITEM_GAP : 0),
			0,
		);
		if (totalWidth <= stripWidth) {
			setVisibleCount(items.length);
			return;
		}

		const available = stripWidth - TRIGGER_RESERVE;
		let used = 0;
		let count = 0;
		for (let i = 0; i < widths.length; i += 1) {
			const next = widths[i] + (i > 0 ? ITEM_GAP : 0);
			if (used + next > available && count > 0) {
				break;
			}
			used += next;
			count += 1;
		}
		setVisibleCount(Math.max(1, count));
	}, []);

	useEffect(() => {
		const strip = stripRef.current;
		if (!strip) {
			return undefined;
		}
		const observer = new ResizeObserver(() => measure());
		observer.observe(strip);
		Array.from(strip.children).forEach((child) => observer.observe(child));
		measure();
		return (): void => observer.disconnect();
	}, [measure, itemCount, active]);

	return { stripRef, visibleCount };
}
