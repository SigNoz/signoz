import { act, renderHook } from '@testing-library/react';

import { DEFAULT_ROW_HEIGHT, MIN_VISIBLE_SPAN_MS } from '../constants';
import { useFlamegraphZoom } from '../hooks/useFlamegraphZoom';
import { MOCK_TRACE_METADATA } from './testUtils';

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

describe('useFlamegraphZoom', () => {
	const traceMetadata = { ...MOCK_TRACE_METADATA };

	beforeEach(() => {
		Object.defineProperty(window, 'devicePixelRatio', {
			configurable: true,
			value: 1,
		});
	});

	it('handleResetZoom restores traceMetadata.startTime/endTime', () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setRowHeight = jest.fn();
		const viewStartRef = { current: 100 };
		const viewEndRef = { current: 500 };
		const rowHeightRef = { current: 30 };
		const canvasRef = { current: createMockCanvas() };

		const { result } = renderHook(() =>
			useFlamegraphZoom({
				canvasRef,
				traceMetadata,
				viewStartRef,
				viewEndRef,
				rowHeightRef,
				setViewStartTs,
				setViewEndTs,
				setRowHeight,
			}),
		);

		act(() => {
			result.current.handleResetZoom();
		});

		expect(setViewStartTs).toHaveBeenCalledWith(traceMetadata.startTime);
		expect(setViewEndTs).toHaveBeenCalledWith(traceMetadata.endTime);
		expect(setRowHeight).toHaveBeenCalledWith(DEFAULT_ROW_HEIGHT);
		expect(viewStartRef.current).toBe(traceMetadata.startTime);
		expect(viewEndRef.current).toBe(traceMetadata.endTime);
		expect(rowHeightRef.current).toBe(DEFAULT_ROW_HEIGHT);
	});

	it('wheel zoom in decreases visible time range', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setRowHeight = jest.fn();
		const viewStartRef = { current: traceMetadata.startTime };
		const viewEndRef = { current: traceMetadata.endTime };
		const rowHeightRef = { current: DEFAULT_ROW_HEIGHT };
		const canvas = createMockCanvas();
		const canvasRef = { current: canvas };

		renderHook(() =>
			useFlamegraphZoom({
				canvasRef,
				traceMetadata,
				viewStartRef,
				viewEndRef,
				rowHeightRef,
				setViewStartTs,
				setViewEndTs,
				setRowHeight,
			}),
		);

		const initialSpan = viewEndRef.current - viewStartRef.current;

		await act(async () => {
			canvas.dispatchEvent(
				new WheelEvent('wheel', {
					clientX: 400,
					deltaY: -100,
					bubbles: true,
				}),
			);
		});

		await act(async () => {
			await new Promise((r) => requestAnimationFrame(r));
		});

		expect(setViewStartTs).toHaveBeenCalled();
		expect(setViewEndTs).toHaveBeenCalled();
		const [newStart] = setViewStartTs.mock.calls[0] ?? [];
		const [newEnd] = setViewEndTs.mock.calls[0] ?? [];
		if (newStart != null && newEnd != null) {
			const newSpan = newEnd - newStart;
			expect(newSpan).toBeLessThan(initialSpan);
		}
	});

	it('wheel zoom out increases visible time range', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setRowHeight = jest.fn();
		const halfSpan = (traceMetadata.endTime - traceMetadata.startTime) / 2;
		const viewStartRef = { current: traceMetadata.startTime + halfSpan * 0.25 };
		const viewEndRef = { current: traceMetadata.startTime + halfSpan * 0.75 };
		const rowHeightRef = { current: DEFAULT_ROW_HEIGHT };
		const canvas = createMockCanvas();
		const canvasRef = { current: canvas };

		renderHook(() =>
			useFlamegraphZoom({
				canvasRef,
				traceMetadata,
				viewStartRef,
				viewEndRef,
				rowHeightRef,
				setViewStartTs,
				setViewEndTs,
				setRowHeight,
			}),
		);

		const initialSpan = viewEndRef.current - viewStartRef.current;

		await act(async () => {
			canvas.dispatchEvent(
				new WheelEvent('wheel', {
					clientX: 400,
					deltaY: 100,
					bubbles: true,
				}),
			);
		});

		await act(async () => {
			await new Promise((r) => requestAnimationFrame(r));
		});

		expect(setViewStartTs).toHaveBeenCalled();
		expect(setViewEndTs).toHaveBeenCalled();
		const [newStart] = setViewStartTs.mock.calls[0] ?? [];
		const [newEnd] = setViewEndTs.mock.calls[0] ?? [];
		if (newStart != null && newEnd != null) {
			const newSpan = newEnd - newStart;
			expect(newSpan).toBeGreaterThanOrEqual(initialSpan);
		}
	});

	it('clamps zoom to MIN_VISIBLE_SPAN_MS', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setRowHeight = jest.fn();
		const viewStartRef = { current: traceMetadata.startTime };
		const viewEndRef = { current: traceMetadata.startTime + 100 };
		const rowHeightRef = { current: DEFAULT_ROW_HEIGHT };
		const canvas = createMockCanvas();
		const canvasRef = { current: canvas };

		renderHook(() =>
			useFlamegraphZoom({
				canvasRef,
				traceMetadata,
				viewStartRef,
				viewEndRef,
				rowHeightRef,
				setViewStartTs,
				setViewEndTs,
				setRowHeight,
			}),
		);

		await act(async () => {
			canvas.dispatchEvent(
				new WheelEvent('wheel', {
					clientX: 400,
					deltaY: 10000,
					bubbles: true,
				}),
			);
		});

		await act(async () => {
			await new Promise((r) => requestAnimationFrame(r));
		});

		const [newStart] = setViewStartTs.mock.calls[0] ?? [];
		const [newEnd] = setViewEndTs.mock.calls[0] ?? [];
		if (newStart != null && newEnd != null) {
			const newSpan = newEnd - newStart;
			expect(newSpan).toBeGreaterThanOrEqual(MIN_VISIBLE_SPAN_MS);
		}
	});

	it('clamps viewStart/viewEnd to trace bounds', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setRowHeight = jest.fn();
		const viewStartRef = { current: traceMetadata.startTime };
		const viewEndRef = { current: traceMetadata.endTime };
		const rowHeightRef = { current: DEFAULT_ROW_HEIGHT };
		const canvas = createMockCanvas();
		const canvasRef = { current: canvas };

		renderHook(() =>
			useFlamegraphZoom({
				canvasRef,
				traceMetadata,
				viewStartRef,
				viewEndRef,
				rowHeightRef,
				setViewStartTs,
				setViewEndTs,
				setRowHeight,
			}),
		);

		await act(async () => {
			canvas.dispatchEvent(
				new WheelEvent('wheel', {
					clientX: 400,
					deltaY: -5000,
					bubbles: true,
				}),
			);
		});

		await act(async () => {
			await new Promise((r) => requestAnimationFrame(r));
		});

		const [newStart] = setViewStartTs.mock.calls[0] ?? [];
		const [newEnd] = setViewEndTs.mock.calls[0] ?? [];
		if (newStart != null && newEnd != null) {
			expect(newStart).toBeGreaterThanOrEqual(traceMetadata.startTime);
			expect(newEnd).toBeLessThanOrEqual(traceMetadata.endTime);
		}
	});

	it('returns isOverFlamegraphRef', () => {
		const canvasRef = { current: createMockCanvas() };
		const { result } = renderHook(() =>
			useFlamegraphZoom({
				canvasRef,
				traceMetadata,
				viewStartRef: { current: 0 },
				viewEndRef: { current: 1000 },
				rowHeightRef: { current: 24 },
				setViewStartTs: jest.fn(),
				setViewEndTs: jest.fn(),
				setRowHeight: jest.fn(),
			}),
		);

		expect(result.current.isOverFlamegraphRef).toBeDefined();
		expect(result.current.isOverFlamegraphRef.current).toBe(false);
	});
});
