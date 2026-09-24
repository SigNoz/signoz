import { MutableRefObject, useEffect } from 'react';

import { SpanRect } from '../types';

/**
 * E2E test hook for the canvas flamegraph. The flamegraph is `<canvas>`, so
 * individual bars have no DOM nodes to target — but `spanRectsRef` already
 * holds the live span→rectangle map (CSS pixels) used for hit-testing. This
 * exposes a thin, read-only view of it on `window.__sigTraceFlame__` so a
 * Playwright spec can resolve a span's on-screen point and drive real
 * hover/click events at it (see tests/e2e/helpers/trace-details.ts).
 *
 * Gated on `window.__SIGNOZ_E2E__` (set by Playwright via addInitScript), so
 * nothing is attached in normal runtime — the e2e build is a production build,
 * so this must be a RUNTIME flag, not a NODE_ENV/mode check.
 */

interface Point {
	x: number;
	y: number;
}

interface FlamegraphTestApi {
	getSpanPoint: (spanId: string) => Point | null;
	isSpanInView: (spanId: string) => boolean;
	// Resting group color of a span's bar — changes when colour-by changes.
	getSpanColor: (spanId: string) => string | null;
}

declare global {
	interface Window {
		__SIGNOZ_E2E__?: boolean;
		__sigTraceFlame__?: FlamegraphTestApi;
	}
}

// Inverse of `getCanvasPointer` in useFlamegraphHover: a CSS-space span rect
// maps back to a viewport point at the bar's center.
function rectToViewportCenter(canvas: HTMLCanvasElement, r: SpanRect): Point {
	const box = canvas.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;
	const cssWidth = canvas.width / dpr;
	const cssHeight = canvas.height / dpr;
	const cssX = r.x + r.width / 2;
	const cssY = r.y + r.height / 2;
	return {
		x: box.left + cssX * (box.width / cssWidth),
		y: box.top + cssY * (box.height / cssHeight),
	};
}

interface UseFlamegraphTestHookParams {
	canvasRef: MutableRefObject<HTMLCanvasElement | null>;
	containerRef: MutableRefObject<HTMLDivElement | null>;
	spanRectsRef: MutableRefObject<SpanRect[]>;
}

export function useFlamegraphTestHook({
	canvasRef,
	containerRef,
	spanRectsRef,
}: UseFlamegraphTestHookParams): void {
	useEffect(() => {
		if (!window.__SIGNOZ_E2E__) {
			return undefined;
		}

		// Reads `.current` at call time, so it always reflects the latest draw.
		const findRect = (spanId: string): SpanRect | undefined =>
			spanRectsRef.current.find((r) => r.span.spanId === spanId);

		window.__sigTraceFlame__ = {
			getSpanPoint: (spanId): Point | null => {
				const canvas = canvasRef.current;
				const rect = findRect(spanId);
				return canvas && rect ? rectToViewportCenter(canvas, rect) : null;
			},
			isSpanInView: (spanId): boolean => {
				const canvas = canvasRef.current;
				const container = containerRef.current;
				const rect = findRect(spanId);
				if (!canvas || !container || !rect) {
					return false;
				}
				const pt = rectToViewportCenter(canvas, rect);
				const box = container.getBoundingClientRect();
				return (
					pt.x >= box.left &&
					pt.x <= box.right &&
					pt.y >= box.top &&
					pt.y <= box.bottom
				);
			},
			getSpanColor: (spanId): string | null => findRect(spanId)?.color ?? null,
		};

		return (): void => {
			delete window.__sigTraceFlame__;
		};
	}, [canvasRef, containerRef, spanRectsRef]);
}
