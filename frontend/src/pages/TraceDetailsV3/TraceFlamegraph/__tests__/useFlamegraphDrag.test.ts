import React from 'react';
import { act, renderHook } from '@testing-library/react';

import { useFlamegraphDrag } from '../hooks/useFlamegraphDrag';
import { MOCK_TRACE_METADATA } from './testUtils';

function createMockCanvas(): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
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
			} as DOMRect),
	);
	return canvas;
}

function createMockContainer(): HTMLDivElement {
	const div = document.createElement('div');
	Object.defineProperty(div, 'clientHeight', { value: 400 });
	return div;
}

const defaultArgs = {
	canvasRef: { current: createMockCanvas() },
	containerRef: { current: createMockContainer() },
	traceMetadata: MOCK_TRACE_METADATA,
	viewStartRef: { current: 0 },
	viewEndRef: { current: 1000 },
	setViewStartTs: jest.fn(),
	setViewEndTs: jest.fn(),
	scrollTopRef: { current: 0 },
	setScrollTop: jest.fn(),
	totalHeight: 1000,
};

describe('useFlamegraphDrag', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		defaultArgs.viewStartRef.current = 0;
		defaultArgs.viewEndRef.current = 1000;
		defaultArgs.scrollTopRef.current = 0;
	});

	it('starts drag state on mousedown', () => {
		const { result } = renderHook(() => useFlamegraphDrag(defaultArgs));

		act(() => {
			result.current.handleMouseDown(({
				button: 0,
				clientX: 100,
				clientY: 50,
				preventDefault: jest.fn(),
			} as unknown) as React.MouseEvent);
		});

		expect(result.current.isDraggingRef.current).toBe(true);
	});

	it('ignores non-left button mousedown', () => {
		const { result } = renderHook(() => useFlamegraphDrag(defaultArgs));

		act(() => {
			result.current.handleMouseDown(({
				button: 1,
				clientX: 100,
				clientY: 50,
				preventDefault: jest.fn(),
			} as unknown) as React.MouseEvent);
		});

		expect(result.current.isDraggingRef.current).toBe(false);
	});

	it('updates pan/scroll on mousemove', () => {
		const { result } = renderHook(() => useFlamegraphDrag(defaultArgs));

		act(() => {
			result.current.handleMouseDown(({
				button: 0,
				clientX: 100,
				clientY: 50,
				preventDefault: jest.fn(),
			} as unknown) as React.MouseEvent);
		});

		act(() => {
			result.current.handleMouseMove(({
				clientX: 150,
				clientY: 100,
			} as unknown) as React.MouseEvent);
		});

		expect(defaultArgs.setViewStartTs).toHaveBeenCalled();
		expect(defaultArgs.setViewEndTs).toHaveBeenCalled();
		expect(defaultArgs.setScrollTop).toHaveBeenCalled();
	});

	it('resets drag state on mouseup', () => {
		const { result } = renderHook(() => useFlamegraphDrag(defaultArgs));

		act(() => {
			result.current.handleMouseDown(({
				button: 0,
				clientX: 100,
				clientY: 50,
				preventDefault: jest.fn(),
			} as unknown) as React.MouseEvent);
		});

		act(() => {
			result.current.handleMouseUp();
		});

		expect(result.current.isDraggingRef.current).toBe(false);
	});

	it('cancels drag on mouseleave', () => {
		const { result } = renderHook(() => useFlamegraphDrag(defaultArgs));

		act(() => {
			result.current.handleMouseDown(({
				button: 0,
				clientX: 100,
				clientY: 50,
				preventDefault: jest.fn(),
			} as unknown) as React.MouseEvent);
		});

		act(() => {
			result.current.handleDragMouseLeave();
		});

		expect(result.current.isDraggingRef.current).toBe(false);
	});
});
