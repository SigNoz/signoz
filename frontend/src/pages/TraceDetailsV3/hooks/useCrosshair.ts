import { RefObject, useCallback, useState } from 'react';

interface UseCrosshairArgs {
	containerRef: RefObject<HTMLElement>;
	enabled?: boolean;
}

interface UseCrosshairReturn {
	/** Cursor X as fraction 0-1 of container width. null = no cursor. Pass to TimelineV3. */
	cursorXPercent: number | null;
	/** Cursor X in absolute pixels relative to container. null = no cursor. For rendering the line. */
	cursorX: number | null;
	/** Attach to container's onMouseMove */
	onMouseMove: (e: React.MouseEvent) => void;
	/** Attach to container's onMouseLeave */
	onMouseLeave: () => void;
}

/**
 * Tracks mouse X position relative to a container element.
 * Returns cursorX (px) and cursorXPercent (0-1) for crosshair rendering.
 * Does NOT render anything — consumers decide how to draw the line
 * (overlay canvas for flamegraph, DOM div for waterfall).
 */
export function useCrosshair({
	containerRef,
	enabled = true,
}: UseCrosshairArgs): UseCrosshairReturn {
	const [cursorX, setCursorX] = useState<number | null>(null);
	const [cursorXPercent, setCursorXPercent] = useState<number | null>(null);

	const onMouseMove = useCallback(
		(e: React.MouseEvent): void => {
			if (!enabled) {
				return;
			}
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect || rect.width === 0) {
				return;
			}

			const x = e.clientX - rect.left;
			setCursorX(x);
			setCursorXPercent(x / rect.width);
		},
		[containerRef, enabled],
	);

	const onMouseLeave = useCallback((): void => {
		setCursorX(null);
		setCursorXPercent(null);
	}, []);

	if (!enabled) {
		return {
			cursorXPercent: null,
			cursorX: null,
			onMouseMove: (): void => {},
			onMouseLeave: (): void => {},
		};
	}

	return { cursorXPercent, cursorX, onMouseMove, onMouseLeave };
}
