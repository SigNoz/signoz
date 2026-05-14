import { RefObject, useCallback, useEffect } from 'react';
import { useIsDarkMode } from 'hooks/useDarkMode';

interface UseFlamegraphCrosshairArgs {
	overlayCanvasRef: RefObject<HTMLCanvasElement>;
	cursorX: number | null;
}

/**
 * Draws the crosshair vertical line on the flamegraph overlay canvas.
 * Separated from useFlamegraphDraw (which handles the main canvas)
 * to keep span rendering and crosshair rendering independent.
 */
export function useFlamegraphCrosshair({
	overlayCanvasRef,
	cursorX,
}: UseFlamegraphCrosshairArgs): void {
	const isDarkMode = useIsDarkMode();

	const drawCrosshair = useCallback((): void => {
		const overlay = overlayCanvasRef.current;
		if (!overlay) {
			return;
		}

		const dpr = window.devicePixelRatio || 1;
		const ctx = overlay.getContext('2d');
		if (!ctx) {
			return;
		}

		const cssWidth = overlay.width / dpr;
		const cssHeight = overlay.height / dpr;

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, cssWidth, cssHeight);

		if (cursorX === null) {
			return;
		}

		// Vertical solid line — matches --l3-background token used by the time badge
		ctx.strokeStyle = isDarkMode ? '#2d313a' : '#e8e8ec';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(cursorX, 0);
		ctx.lineTo(cursorX, cssHeight);
		ctx.stroke();
	}, [overlayCanvasRef, cursorX, isDarkMode]);

	// Redraw whenever cursorX or dependencies change
	useEffect(() => {
		drawCrosshair();
	}, [drawCrosshair]);
}
