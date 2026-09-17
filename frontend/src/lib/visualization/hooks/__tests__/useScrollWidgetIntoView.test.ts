import type { Mock, MockedFunction } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollToWidgetIdStore } from 'providers/Dashboard/helpers/scrollToWidgetIdHelper';

import { useScrollWidgetIntoView } from 'lib/visualization/hooks/useScrollWidgetIntoView';

vi.mock('providers/Dashboard/helpers/scrollToWidgetIdHelper');

type MockHTMLElement = {
	scrollIntoView: Mock;
	focus: Mock;
};

function createMockElement(): MockHTMLElement {
	return {
		scrollIntoView: vi.fn(),
		focus: vi.fn(),
	};
}

describe('useScrollWidgetIntoView', () => {
	const mockedUseScrollToWidgetIdStore =
		useScrollToWidgetIdStore as MockedFunction<typeof useScrollToWidgetIdStore>;

	let mockElement: MockHTMLElement;
	let ref: React.RefObject<HTMLDivElement>;
	let setToScrollWidgetId: Mock;

	function mockStore(toScrollWidgetId: string): void {
		const storeState = { toScrollWidgetId, setToScrollWidgetId };
		mockedUseScrollToWidgetIdStore.mockImplementation(
			(selector) =>
				selector(
					storeState as unknown as Parameters<typeof selector>[0],
				) as ReturnType<typeof useScrollToWidgetIdStore>,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockElement = createMockElement();
		ref = {
			current: mockElement,
		} as unknown as React.RefObject<HTMLDivElement>;
		setToScrollWidgetId = vi.fn();
	});

	it('scrolls into view and focuses when toScrollWidgetId matches widget id', () => {
		mockStore('widget-id');

		renderHook(() => useScrollWidgetIntoView('widget-id', ref));

		expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
		});
		expect(mockElement.focus).toHaveBeenCalled();
		expect(setToScrollWidgetId).toHaveBeenCalledWith('');
	});

	it('does nothing when toScrollWidgetId does not match widget id', () => {
		mockStore('other-widget');

		renderHook(() => useScrollWidgetIntoView('widget-id', ref));

		expect(mockElement.scrollIntoView).not.toHaveBeenCalled();
		expect(mockElement.focus).not.toHaveBeenCalled();
		expect(setToScrollWidgetId).not.toHaveBeenCalled();
	});
});
