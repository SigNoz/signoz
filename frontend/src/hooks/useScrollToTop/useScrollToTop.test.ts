import { act, renderHook } from '@testing-library/react';

import useScrollToTop from './index';

// window.scrollTo / window.pageYOffset are read-only accessors in the browser,
// so stub them with spies instead of assigning (global does not exist here).
function stubScrollPosition(yOffset: number): void {
	vi.spyOn(window, 'pageYOffset', 'get').mockReturnValue(yOffset);
}

function dispatchScroll(): void {
	window.dispatchEvent(new Event('scroll'));
	vi.advanceTimersByTime(300);
}

describe('useScrollToTop hook', () => {
	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should change visibility and scroll to top on call', () => {
		const { result } = renderHook(() => useScrollToTop(100));

		// Simulate scrolling 150px down
		act(() => {
			stubScrollPosition(150);
			dispatchScroll();
		});
		expect(result.current.isVisible).toBe(true);

		// Simulate scrolling to top
		act(() => {
			result.current.scrollToTop();
		});

		expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
	});

	it('should be invisible when scrolled less than offset', () => {
		const { result } = renderHook(() => useScrollToTop(100));

		// Simulate scrolling 50px down
		act(() => {
			stubScrollPosition(50);
			dispatchScroll();
		});

		expect(result.current.isVisible).toBe(false);
	});

	it('should be visible when scrolled more than offset', () => {
		const { result } = renderHook(() => useScrollToTop(100));

		// Simulate scrolling 50px down
		act(() => {
			stubScrollPosition(200);
			dispatchScroll();
		});

		expect(result.current.isVisible).toBe(true);
	});
});
