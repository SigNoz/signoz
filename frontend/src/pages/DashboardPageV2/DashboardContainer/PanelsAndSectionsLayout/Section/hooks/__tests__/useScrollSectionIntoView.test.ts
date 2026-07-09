import type { RefObject } from 'react';
import { renderHook } from '@testing-library/react';

import { useScrollToPanelStore } from '../../../../store/useScrollToPanelStore';
import { useScrollSectionIntoView } from '../useScrollSectionIntoView';

function refWithScroll(scrollIntoView: jest.Mock): RefObject<HTMLElement> {
	return {
		current: { scrollIntoView } as unknown as HTMLElement,
	} as RefObject<HTMLElement>;
}

describe('useScrollSectionIntoView', () => {
	beforeEach(() => {
		useScrollToPanelStore.setState({ scrollToSectionId: null });
	});

	it('scrolls into view and clears the request when the store targets this section', () => {
		const scrollIntoView = jest.fn();
		useScrollToPanelStore.setState({ scrollToSectionId: 'sec-empty-1' });

		renderHook(() =>
			useScrollSectionIntoView('sec-empty-1', refWithScroll(scrollIntoView)),
		);

		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'start',
		});
		expect(useScrollToPanelStore.getState().scrollToSectionId).toBeNull();
	});

	it('does nothing when the store targets a different section', () => {
		const scrollIntoView = jest.fn();
		useScrollToPanelStore.setState({ scrollToSectionId: 'sec-empty-2' });

		renderHook(() =>
			useScrollSectionIntoView('sec-empty-1', refWithScroll(scrollIntoView)),
		);

		expect(scrollIntoView).not.toHaveBeenCalled();
		expect(useScrollToPanelStore.getState().scrollToSectionId).toBe(
			'sec-empty-2',
		);
	});
});
