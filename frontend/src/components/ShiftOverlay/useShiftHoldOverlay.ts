import { useEffect, useRef, useState } from 'react';

const HOLD_DELAY_MS = 500;

function isTypingContext(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	const tag = target.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

interface UseShiftHoldOverlayOptions {
	disabled?: boolean;
	isModalOpen?: boolean;
}

export function useShiftHoldOverlay({
	disabled = false,
	isModalOpen = false,
}: UseShiftHoldOverlayOptions): boolean {
	const [visible, setVisible] = useState<boolean>(false);

	const timerRef = useRef<number | null>(null);
	const isHoldingRef = useRef<boolean>(false);

	useEffect((): (() => void) | void => {
		if (disabled) {
			return;
		}

		function cleanup(): void {
			isHoldingRef.current = false;

			if (timerRef.current !== null) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}

			setVisible(false);
		}

		function onKeyDown(e: KeyboardEvent): void {
			if (e.key !== 'Shift') {
				return;
			}
			if (e.repeat) {
				return;
			}

			// Suppress in bad contexts
			if (
				isModalOpen ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey ||
				isTypingContext(e.target)
			) {
				return;
			}

			isHoldingRef.current = true;

			timerRef.current = window.setTimeout(() => {
				if (isHoldingRef.current) {
					setVisible(true);
				}
			}, HOLD_DELAY_MS);
		}

		function onKeyUp(e: KeyboardEvent): void {
			if (e.key !== 'Shift') {
				return;
			}
			cleanup();
		}

		function onBlur(): void {
			cleanup();
		}

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
		document.addEventListener('visibilitychange', cleanup);

		return (): void => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
			document.removeEventListener('visibilitychange', cleanup);
		};
	}, [disabled, isModalOpen]);

	return visible;
}
