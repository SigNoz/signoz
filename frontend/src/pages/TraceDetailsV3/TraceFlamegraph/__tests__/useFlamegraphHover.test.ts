import type React from 'react';
import { act, renderHook } from '@testing-library/react';

import { useFlamegraphHover } from '../hooks/useFlamegraphHover';
import type { SpanRect } from '../types';
import { MOCK_SPAN, MOCK_TRACE_METADATA } from './testUtils';

function createMockCanvas(): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = 800;
	canvas.height = 400;
	canvas.getBoundingClientRect = jest.fn(
		(): DOMRect =>
			({
				left: 0,
				top: 0,
				width: 800,
				height: 400,
				x: 0,
				y: 0,
				bottom: 400,
				right: 800,
				toJSON: (): Record<string, unknown> => ({}),
			}) as DOMRect,
	);
	return canvas;
}

const spanRect: SpanRect = {
	span: { ...MOCK_SPAN, spanId: 'hover-span', name: 'test-span' },
	x: 100,
	y: 50,
	width: 200,
	height: 22,
	level: 0,
};

const defaultArgs = {
	canvasRef: { current: createMockCanvas() },
	spanRectsRef: { current: [spanRect] },
	eventRectsRef: { current: [] as any[] },
	traceMetadata: MOCK_TRACE_METADATA,
	viewStartTs: MOCK_TRACE_METADATA.startTime,
	viewEndTs: MOCK_TRACE_METADATA.endTime,
	isDraggingRef: { current: false },
	onSpanClick: jest.fn(),
	isDarkMode: false,
};

describe('useFlamegraphHover', () => {
	beforeEach(() => {
		Object.defineProperty(window, 'devicePixelRatio', {
			configurable: true,
			value: 1,
		});
		jest.clearAllMocks();
		defaultArgs.spanRectsRef.current = [spanRect];
		defaultArgs.isDraggingRef.current = false;
	});

	it('sets hoveredSpanId and tooltipContent when hovering on span', () => {
		const { result } = renderHook(() => useFlamegraphHover(defaultArgs));

		act(() => {
			result.current.handleHoverMouseMove({
				clientX: 150,
				clientY: 61,
			} as React.MouseEvent);
		});

		expect(result.current.hoveredSpanId).toBe('hover-span');
		expect(result.current.tooltipContent).not.toBeNull();
		expect(result.current.tooltipContent?.spanName).toBe('test-span');
		expect(result.current.tooltipContent?.clientX).toBe(150);
		expect(result.current.tooltipContent?.clientY).toBe(61);
	});

	it('clears hover when moving to empty area', () => {
		const { result } = renderHook(() => useFlamegraphHover(defaultArgs));

		act(() => {
			result.current.handleHoverMouseMove({
				clientX: 150,
				clientY: 61,
			} as React.MouseEvent);
		});

		expect(result.current.hoveredSpanId).toBe('hover-span');

		act(() => {
			result.current.handleHoverMouseMove({
				clientX: 10,
				clientY: 10,
			} as React.MouseEvent);
		});

		expect(result.current.hoveredSpanId).toBeNull();
		expect(result.current.tooltipContent).toBeNull();
	});

	it('clears hover on mouse leave', () => {
		const { result } = renderHook(() => useFlamegraphHover(defaultArgs));

		act(() => {
			result.current.handleHoverMouseMove({
				clientX: 150,
				clientY: 61,
			} as React.MouseEvent);
		});

		act(() => {
			result.current.handleHoverMouseLeave();
		});

		expect(result.current.hoveredSpanId).toBeNull();
		expect(result.current.tooltipContent).toBeNull();
	});

	it('suppresses click when drag distance exceeds threshold', () => {
		const { result } = renderHook(() => useFlamegraphHover(defaultArgs));

		act(() => {
			result.current.handleMouseDownForClick({
				clientX: 100,
				clientY: 50,
			} as React.MouseEvent);
		});

		act(() => {
			result.current.handleClick({
				clientX: 150,
				clientY: 100,
			} as React.MouseEvent);
		});

		expect(defaultArgs.onSpanClick).not.toHaveBeenCalled();
	});

	it('calls onSpanClick when clicking on span', () => {
		const { result } = renderHook(() => useFlamegraphHover(defaultArgs));

		act(() => {
			result.current.handleClick({
				clientX: 150,
				clientY: 61,
			} as React.MouseEvent);
		});

		expect(defaultArgs.onSpanClick).toHaveBeenCalledWith('hover-span');
	});

	it('uses clientX/clientY for tooltip positioning', () => {
		const { result } = renderHook(() => useFlamegraphHover(defaultArgs));

		act(() => {
			result.current.handleHoverMouseMove({
				clientX: 200,
				clientY: 60,
			} as React.MouseEvent);
		});

		expect(result.current.tooltipContent?.clientX).toBe(200);
		expect(result.current.tooltipContent?.clientY).toBe(60);
	});

	it('does not update hover during drag', () => {
		const { result } = renderHook(() => useFlamegraphHover(defaultArgs));
		defaultArgs.isDraggingRef.current = true;

		act(() => {
			result.current.handleHoverMouseMove({
				clientX: 150,
				clientY: 61,
			} as React.MouseEvent);
		});

		expect(result.current.hoveredSpanId).toBeNull();
	});
});
