import { act, renderHook } from '@testing-library/react';
import { RefObject } from 'react';

import { useCrosshair } from '../useCrosshair';

// Container spanning [left, left+width]; getBoundingClientRect is all the hook reads.
function mockContainer(left: number, width: number): RefObject<HTMLElement> {
	const el = document.createElement('div');
	el.getBoundingClientRect = jest.fn(
		(): DOMRect =>
			({
				left,
				width,
				top: 0,
				height: 0,
				x: left,
				y: 0,
				right: left + width,
				bottom: 0,
				toJSON: (): Record<string, unknown> => ({}),
			}) as DOMRect,
	);
	return { current: el };
}

function move(clientX: number): React.MouseEvent {
	return { clientX } as React.MouseEvent;
}

describe('useCrosshair', () => {
	it('maps the cursor to 0 at the container edge with no inset', () => {
		const containerRef = mockContainer(100, 1000);
		const { result } = renderHook(() => useCrosshair({ containerRef }));

		act(() => result.current.onMouseMove(move(600)));

		expect(result.current.cursorX).toBe(500);
		expect(result.current.cursorXPercent).toBeCloseTo(0.5);
	});

	it('offsets and rescales by insetX so 0% aligns with the content start', () => {
		const containerRef = mockContainer(100, 1000); // content = [115, 1085], width 970
		const { result } = renderHook(() =>
			useCrosshair({ containerRef, insetX: 15 }),
		);

		// At the content start (left + inset) → 0ms, line sits at the inset.
		act(() => result.current.onMouseMove(move(115)));
		expect(result.current.cursorX).toBe(15);
		expect(result.current.cursorXPercent).toBe(0);

		// Halfway through the 970px content → 50%.
		act(() => result.current.onMouseMove(move(600)));
		expect(result.current.cursorX).toBe(500);
		expect(result.current.cursorXPercent).toBeCloseTo(485 / 970);
	});

	it('clamps the dead padding zones to [0, 1]', () => {
		const containerRef = mockContainer(100, 1000);
		const { result } = renderHook(() =>
			useCrosshair({ containerRef, insetX: 15 }),
		);

		// Left of the content (inside the left padding) → clamped to start.
		act(() => result.current.onMouseMove(move(100)));
		expect(result.current.cursorX).toBe(15);
		expect(result.current.cursorXPercent).toBe(0);

		// Right of the content (container right edge) → clamped to end.
		act(() => result.current.onMouseMove(move(1100)));
		expect(result.current.cursorXPercent).toBe(1);
	});

	it('resets on mouse leave', () => {
		const containerRef = mockContainer(0, 800);
		const { result } = renderHook(() => useCrosshair({ containerRef }));

		act(() => result.current.onMouseMove(move(400)));
		expect(result.current.cursorX).not.toBeNull();

		act(() => result.current.onMouseLeave());
		expect(result.current.cursorX).toBeNull();
		expect(result.current.cursorXPercent).toBeNull();
	});

	it('is inert when disabled', () => {
		const containerRef = mockContainer(0, 800);
		const { result } = renderHook(() =>
			useCrosshair({ containerRef, enabled: false }),
		);

		act(() => result.current.onMouseMove(move(400)));
		expect(result.current.cursorX).toBeNull();
		expect(result.current.cursorXPercent).toBeNull();
	});
});
