import { RefObject } from 'react';
import { renderHook } from '@testing-library/react';
import type { TableVirtuosoHandle } from 'react-virtuoso';

import { useResetScroll } from '../useResetScroll';

function createMockRef(scrollTo: jest.Mock): RefObject<TableVirtuosoHandle> {
	return {
		current: {
			scrollToIndex: jest.fn(),
			scrollIntoView: jest.fn(),
			scrollTo,
			scrollBy: jest.fn(),
		},
	};
}

describe('useResetScroll', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('does not call scrollTo on initial mount', () => {
		const scrollTo = jest.fn();
		const ref = createMockRef(scrollTo);

		renderHook(() => useResetScroll(ref, 'initial-key'));

		expect(scrollTo).not.toHaveBeenCalled();
	});

	it('calls scrollTo when key changes', () => {
		const scrollTo = jest.fn();
		const ref = createMockRef(scrollTo);

		const { rerender } = renderHook(
			({ resetKey }) => useResetScroll(ref, resetKey),
			{ initialProps: { resetKey: 'key-1' } },
		);

		expect(scrollTo).not.toHaveBeenCalled();

		rerender({ resetKey: 'key-2' });

		expect(scrollTo).toHaveBeenCalledWith({ left: 0 });
	});

	it('calls scrollTo once per key change', () => {
		const scrollTo = jest.fn();
		const ref = createMockRef(scrollTo);

		const { rerender } = renderHook(
			({ resetKey }) => useResetScroll(ref, resetKey),
			{ initialProps: { resetKey: 'key-1' } },
		);

		rerender({ resetKey: 'key-2' });
		rerender({ resetKey: 'key-3' });
		rerender({ resetKey: 'key-4' });

		expect(scrollTo).toHaveBeenCalledTimes(3);
	});

	it('does not call scrollTo when key unchanged', () => {
		const scrollTo = jest.fn();
		const ref = createMockRef(scrollTo);

		const { rerender } = renderHook(
			({ resetKey }) => useResetScroll(ref, resetKey),
			{ initialProps: { resetKey: 'same-key' } },
		);

		rerender({ resetKey: 'same-key' });
		rerender({ resetKey: 'same-key' });

		expect(scrollTo).not.toHaveBeenCalled();
	});

	it('handles null ref.current gracefully', () => {
		const ref: RefObject<TableVirtuosoHandle | null> = { current: null };

		const { rerender } = renderHook(
			({ resetKey }) => useResetScroll(ref, resetKey),
			{ initialProps: { resetKey: 'key-1' } },
		);

		expect(() => rerender({ resetKey: 'key-2' })).not.toThrow();
	});

	it('calls scrollTo when changing from undefined to defined', () => {
		const scrollTo = jest.fn();
		const ref = createMockRef(scrollTo);

		const { rerender } = renderHook(
			({ resetKey }) => useResetScroll(ref, resetKey),
			{ initialProps: { resetKey: undefined as string | undefined } },
		);

		rerender({ resetKey: 'new-key' });

		expect(scrollTo).toHaveBeenCalledWith({ left: 0 });
	});
});
