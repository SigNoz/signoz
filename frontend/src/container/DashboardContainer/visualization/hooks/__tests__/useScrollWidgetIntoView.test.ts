import { renderHook } from '@testing-library/react';
import { useScrollToWidgetIdStore } from 'providers/Dashboard/helpers/scrollToWidgetIdHelper';

import { useScrollWidgetIntoView } from '../useScrollWidgetIntoView';

jest.mock('providers/Dashboard/helpers/scrollToWidgetIdHelper');

type MockHTMLElement = {
	scrollIntoView: jest.Mock;
	focus: jest.Mock;
};

function createMockElement(): MockHTMLElement {
	return {
		scrollIntoView: jest.fn(),
		focus: jest.fn(),
	};
}

describe('useScrollWidgetIntoView', () => {
	const mockedUseScrollToWidgetIdStore = useScrollToWidgetIdStore as jest.MockedFunction<
		typeof useScrollToWidgetIdStore
	>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('scrolls into view and focuses when toScrollWidgetId matches widget id', () => {
		const setToScrollWidgetId = jest.fn();
		const mockElement = createMockElement();
		const ref = ({
			current: mockElement,
		} as unknown) as React.RefObject<HTMLDivElement>;

		mockedUseScrollToWidgetIdStore.mockReturnValue(({
			toScrollWidgetId: 'widget-id',
			setToScrollWidgetId,
		} as unknown) as ReturnType<typeof useScrollToWidgetIdStore>);

		renderHook(() => useScrollWidgetIntoView('widget-id', ref));

		expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
		});
		expect(mockElement.focus).toHaveBeenCalled();
		expect(setToScrollWidgetId).toHaveBeenCalledWith('');
	});

	it('does nothing when toScrollWidgetId does not match widget id', () => {
		const setToScrollWidgetId = jest.fn();
		const mockElement = createMockElement();
		const ref = ({
			current: mockElement,
		} as unknown) as React.RefObject<HTMLDivElement>;

		mockedUseScrollToWidgetIdStore.mockReturnValue(({
			toScrollWidgetId: 'other-widget',
			setToScrollWidgetId,
		} as unknown) as ReturnType<typeof useScrollToWidgetIdStore>);

		renderHook(() => useScrollWidgetIntoView('widget-id', ref));

		expect(mockElement.scrollIntoView).not.toHaveBeenCalled();
		expect(mockElement.focus).not.toHaveBeenCalled();
		expect(setToScrollWidgetId).not.toHaveBeenCalled();
	});
});
