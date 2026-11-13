import {
	RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';

import { getCaretCoordinates } from './getCaretCoordinates';
import type { CaretBox, CaretTrail } from './types';

interface UseComposerCaretResult {
	caret: CaretBox | null;
	isTyping: boolean;
	trails: CaretTrail[];
	removeTrail: (id: number) => void;
}

const TYPING_IDLE_MS = 800;
const MAX_TRAILS = 4;
const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const EDIT_KEYS = new Set(['Backspace', 'Delete']);

export function useComposerCaret(
	textareaRef: RefObject<HTMLTextAreaElement>,
	value: string,
): UseComposerCaretResult {
	const [caret, setCaret] = useState<CaretBox | null>(null);
	const [isTyping, setIsTyping] = useState(false);
	const [trails, setTrails] = useState<CaretTrail[]>([]);
	const lastCaretRef = useRef<CaretBox | null>(null);
	const trailIdRef = useRef(0);
	const typingTimerRef = useRef<number>();

	const measure = useCallback((): CaretBox | null => {
		const el = textareaRef.current;
		if (
			!el ||
			document.activeElement !== el ||
			el.selectionStart !== el.selectionEnd
		) {
			return null;
		}
		const box = getCaretCoordinates(el, el.selectionEnd);
		const top = el.offsetTop + box.top - el.scrollTop;
		const isInView =
			top >= el.offsetTop && top + box.height <= el.offsetTop + el.offsetHeight;
		if (!isInView) {
			return null;
		}
		return {
			left: el.offsetLeft + box.left - el.scrollLeft,
			top,
			height: box.height,
		};
	}, [textareaRef]);

	const update = useCallback((): void => {
		const next = measure();
		lastCaretRef.current = next;
		setCaret(next);
	}, [measure]);

	// Leaves a fading streak over a sideways jump on the same line.
	const addTrail = useCallback((from: CaretBox, to: CaretBox): void => {
		if (Math.abs(to.top - from.top) >= 5 || Math.abs(to.left - from.left) <= 2) {
			return;
		}
		trailIdRef.current += 1;
		const id = trailIdRef.current;
		setTrails((prev) =>
			[
				...prev,
				{
					id,
					left: Math.min(from.left, to.left),
					top: to.top,
					width: Math.abs(to.left - from.left),
					height: to.height,
					faint: prev.length === 0,
				},
			].slice(-MAX_TRAILS),
		);
	}, []);

	const removeTrail = useCallback((id: number): void => {
		setTrails((prev) => prev.filter((trail) => trail.id !== id));
	}, []);

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) {
			return undefined;
		}
		let frame = 0;

		const onKeyDown = (event: KeyboardEvent): void => {
			const isArrow = ARROW_KEYS.has(event.key);
			if (!isArrow && !EDIT_KEYS.has(event.key) && event.key.length !== 1) {
				return;
			}
			setIsTyping(true);
			window.clearTimeout(typingTimerRef.current);
			typingTimerRef.current = window.setTimeout(
				() => setIsTyping(false),
				TYPING_IDLE_MS,
			);
			if (isArrow) {
				const from = lastCaretRef.current;
				cancelAnimationFrame(frame);
				frame = requestAnimationFrame(() => {
					const to = measure();
					if (from && to) {
						addTrail(from, to);
					}
					lastCaretRef.current = to;
					setCaret(to);
				});
			}
		};
		const onSelectionChange = (): void => {
			if (document.activeElement === el) {
				update();
			}
		};
		const hide = (): void => {
			lastCaretRef.current = null;
			setCaret(null);
		};
		const observer = new ResizeObserver(() => update());

		el.addEventListener('keydown', onKeyDown);
		el.addEventListener('focus', update);
		el.addEventListener('blur', hide);
		el.addEventListener('scroll', update);
		document.addEventListener('selectionchange', onSelectionChange);
		observer.observe(el);
		update();

		return (): void => {
			el.removeEventListener('keydown', onKeyDown);
			el.removeEventListener('focus', update);
			el.removeEventListener('blur', hide);
			el.removeEventListener('scroll', update);
			document.removeEventListener('selectionchange', onSelectionChange);
			observer.disconnect();
			cancelAnimationFrame(frame);
			window.clearTimeout(typingTimerRef.current);
		};
	}, [textareaRef, measure, update, addTrail]);

	// Text set from code (prefill, @-mentions, send) moves the caret without a key.
	useLayoutEffect(() => {
		update();
	}, [value, update]);

	return { caret, isTyping, trails, removeTrail };
}
