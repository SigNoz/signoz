import { useCallback, useEffect, useRef, useState } from 'react';

export const INVALID_FLASH_DURATION_MS = 1200;

interface UseInvalidFlashResult {
	isFlashing: boolean;
	triggerFlash: () => void;
}

/**
 * Drives a one-shot "invalid input" flash that clears itself after
 * `durationMs`, leaving any persistent error styling to the caller.
 *
 * A re-trigger drops the flag for one frame before setting it again: a CSS
 * animation only restarts when the class is genuinely removed and re-added, so
 * without that gap a second failed attempt in a row would not animate.
 */
export function useInvalidFlash(
	durationMs: number = INVALID_FLASH_DURATION_MS,
): UseInvalidFlashResult {
	const [isFlashing, setIsFlashing] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
	const frameRef = useRef<number>();

	const clearPending = useCallback((): void => {
		if (timeoutRef.current !== undefined) {
			clearTimeout(timeoutRef.current);
		}
		if (frameRef.current !== undefined) {
			cancelAnimationFrame(frameRef.current);
		}
	}, []);

	useEffect(() => clearPending, [clearPending]);

	const triggerFlash = useCallback((): void => {
		clearPending();
		setIsFlashing(false);

		frameRef.current = requestAnimationFrame(() => {
			setIsFlashing(true);
			timeoutRef.current = setTimeout(() => setIsFlashing(false), durationMs);
		});
	}, [clearPending, durationMs]);

	return { isFlashing, triggerFlash };
}
