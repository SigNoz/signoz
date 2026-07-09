import type { RefObject } from 'react';
import { renderHook } from '@testing-library/react';

import { useScrollToPanelStore } from '../../../../store/useScrollToPanelStore';
import { useScrollPanelIntoView } from '../useScrollPanelIntoView';

function refWithScroll(scrollIntoView: jest.Mock): RefObject<HTMLElement> {
	return {
		current: { scrollIntoView } as unknown as HTMLElement,
	} as RefObject<HTMLElement>;
}

describe('useScrollPanelIntoView', () => {
	beforeEach(() => {
		useScrollToPanelStore.setState({ scrollToPanelId: null });
	});

	it('scrolls into view and clears the request when the store targets this panel', () => {
		const scrollIntoView = jest.fn();
		useScrollToPanelStore.setState({ scrollToPanelId: 'p1' });

		renderHook(() => useScrollPanelIntoView('p1', refWithScroll(scrollIntoView)));

		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
		});
		expect(useScrollToPanelStore.getState().scrollToPanelId).toBeNull();
	});

	it('does nothing when the store targets a different panel', () => {
		const scrollIntoView = jest.fn();
		useScrollToPanelStore.setState({ scrollToPanelId: 'other' });

		renderHook(() => useScrollPanelIntoView('p1', refWithScroll(scrollIntoView)));

		expect(scrollIntoView).not.toHaveBeenCalled();
		expect(useScrollToPanelStore.getState().scrollToPanelId).toBe('other');
	});
});
