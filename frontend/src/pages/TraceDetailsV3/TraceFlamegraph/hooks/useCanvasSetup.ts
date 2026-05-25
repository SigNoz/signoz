import { RefObject, useCallback, useEffect } from 'react';

export function useCanvasSetup(
	canvasRef: RefObject<HTMLCanvasElement>,
	containerRef: RefObject<HTMLDivElement>,
	onDraw: () => void,
	overlayCanvasRef?: RefObject<HTMLCanvasElement>,
): void {
	const updateCanvasSize = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) {
			return;
		}

		const dpr = window.devicePixelRatio || 1;
		const rect = container.getBoundingClientRect();
		const viewportHeight = container.clientHeight;

		canvas.style.width = `${rect.width}px`;
		canvas.style.height = `${viewportHeight}px`;

		const newWidth = Math.floor(rect.width * dpr);
		const newHeight = Math.floor(viewportHeight * dpr);

		if (canvas.width !== newWidth || canvas.height !== newHeight) {
			canvas.width = newWidth;
			canvas.height = newHeight;

			// Sync overlay canvas size with main canvas
			const overlay = overlayCanvasRef?.current;
			if (overlay) {
				overlay.width = newWidth;
				overlay.height = newHeight;
				overlay.style.width = `${rect.width}px`;
				overlay.style.height = `${viewportHeight}px`;
			}

			onDraw();
		}
	}, [canvasRef, containerRef, onDraw, overlayCanvasRef]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return (): void => {};
		}

		const resizeObserver = new ResizeObserver(updateCanvasSize);
		resizeObserver.observe(container);
		updateCanvasSize();

		// when dpr changes, update the canvas size
		const dprQuery = window.matchMedia('(resolution: 1dppx)');
		dprQuery.addEventListener('change', updateCanvasSize);

		return (): void => {
			resizeObserver.disconnect();
			dprQuery.removeEventListener('change', updateCanvasSize);
		};
	}, [containerRef, updateCanvasSize]);

	useEffect(() => {
		onDraw();
	}, [onDraw]);
}
