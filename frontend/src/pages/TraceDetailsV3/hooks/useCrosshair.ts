import { RefObject, useCallback, useState } from 'react';

interface UseCrosshairArgs {
	containerRef: RefObject<HTMLElement>;
	enabled?: boolean;
	/**
	 * Symmetric horizontal inset (px) of the content (ruler ticks + bars) inside
	 * the container: shifts the origin right by `insetX` and shrinks the usable
	 * width by `2 * insetX`. The waterfall pads its rows by 15px while the
	 * crosshair container spans the full width, so the crosshair must map the
	 * cursor into that inset content box to line up with 0ms/ticks/bars.
	 * Flamegraph pads its parent instead, so its container is already the content
	 * box → 0 (default).
	 */
	insetX?: number;
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
	insetX = 0,
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

			// Map the cursor into the inset content box so 0% aligns with the first
			// tick / bar origin (not the container edge). Clamp so the dead padding
			// zones don't produce a line/time before 0ms or past the end.
			const contentWidth = Math.max(1, rect.width - insetX * 2);
			const xInContent = Math.max(
				0,
				Math.min(e.clientX - rect.left - insetX, contentWidth),
			);
			setCursorX(xInContent + insetX);
			setCursorXPercent(xInContent / contentWidth);
		},
		[containerRef, enabled, insetX],
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
