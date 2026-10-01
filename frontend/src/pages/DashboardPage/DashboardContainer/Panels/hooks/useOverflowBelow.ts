import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';

// Within this distance of the end counts as "at the bottom", so the pill isn't
// kept alive by sub-pixel rounding or a trailing margin.
const BOTTOM_EPSILON_PX = 16;

interface UseOverflowBelowResult<T extends HTMLElement> {
	scrollRef: RefObject<T>;
	/** Content extends below the fold and the user isn't at the bottom yet. */
	hasMoreBelow: boolean;
	scrollToBottom: () => void;
}

/**
 * Tracks whether a scroll container has unseen content below the fold. Re-measures
 * on scroll, on container resize, and on every commit — the cheap way to follow
 * content growth (a live preview re-rendering as the body is typed) without
 * observing the subtree.
 */
export function useOverflowBelow<
	T extends HTMLElement,
>(): UseOverflowBelowResult<T> {
	const scrollRef = useRef<T>(null);
	const [hasMoreBelow, setHasMoreBelow] = useState(false);

	const measure = useCallback((): void => {
		const el = scrollRef.current;
		if (!el) {
			return;
		}
		const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
		setHasMoreBelow(remaining > BOTTOM_EPSILON_PX);
	}, []);

	// No deps on purpose: runs after every commit. setState bails on unchanged
	// values, so this settles instead of looping.
	useEffect(() => {
		measure();
	});

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) {
			return undefined;
		}
		el.addEventListener('scroll', measure, { passive: true });
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return (): void => {
			el.removeEventListener('scroll', measure);
			observer.disconnect();
		};
	}, [measure]);

	const scrollToBottom = useCallback((): void => {
		const el = scrollRef.current;
		el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
	}, []);

	return { scrollRef, hasMoreBelow, scrollToBottom };
}
