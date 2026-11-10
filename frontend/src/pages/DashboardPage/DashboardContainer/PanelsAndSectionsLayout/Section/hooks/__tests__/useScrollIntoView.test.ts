import type { RefObject } from 'react';
import { renderHook } from '@testing-library/react';

import { useScrollIntoViewStore } from '../../../../store/useScrollIntoViewStore';
import { useScrollIntoView } from '../useScrollIntoView';

function refWithScroll(scrollIntoView: jest.Mock): RefObject<HTMLElement> {
	return {
		current: { scrollIntoView } as unknown as HTMLElement,
	} as RefObject<HTMLElement>;
}

describe('useScrollIntoView', () => {
	beforeEach(() => {
		useScrollIntoViewStore.setState({ scrollTargetId: null });
	});

	it('scrolls into view and clears the request when the store targets this id', () => {
		const scrollIntoView = jest.fn();
		useScrollIntoViewStore.setState({ scrollTargetId: 'p1' });

		renderHook(() => useScrollIntoView('p1', refWithScroll(scrollIntoView)));

		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
		});
		expect(useScrollIntoViewStore.getState().scrollTargetId).toBeNull();
	});

	it('reveals a section id the same way (one hook for panels and sections)', () => {
		const scrollIntoView = jest.fn();
		useScrollIntoViewStore.setState({ scrollTargetId: 'sec-empty-1' });

		renderHook(() =>
			useScrollIntoView('sec-empty-1', refWithScroll(scrollIntoView)),
		);

		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
		});
		expect(useScrollIntoViewStore.getState().scrollTargetId).toBeNull();
	});

	it('honours the caller-provided block alignment', () => {
		const scrollIntoView = jest.fn();
		useScrollIntoViewStore.setState({ scrollTargetId: 'p1' });

		renderHook(() =>
			useScrollIntoView('p1', refWithScroll(scrollIntoView), 'center'),
		);

		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
		});
	});

	it('does nothing when the store targets a different id', () => {
		const scrollIntoView = jest.fn();
		useScrollIntoViewStore.setState({ scrollTargetId: 'other' });

		renderHook(() => useScrollIntoView('p1', refWithScroll(scrollIntoView)));

		expect(scrollIntoView).not.toHaveBeenCalled();
		expect(useScrollIntoViewStore.getState().scrollTargetId).toBe('other');
	});
});
