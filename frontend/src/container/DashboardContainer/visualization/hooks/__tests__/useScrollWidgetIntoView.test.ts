import { renderHook } from '@testing-library/react';
import { useDashboard } from 'providers/Dashboard/Dashboard';

import { useScrollWidgetIntoView } from '../useScrollWidgetIntoView';

jest.mock('providers/Dashboard/Dashboard');

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
	const mockedUseDashboard = useDashboard as jest.MockedFunction<
		typeof useDashboard
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

		mockedUseDashboard.mockReturnValue(({
			toScrollWidgetId: 'widget-id',
			setToScrollWidgetId,
		} as unknown) as ReturnType<typeof useDashboard>);

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

		mockedUseDashboard.mockReturnValue(({
			toScrollWidgetId: 'other-widget',
			setToScrollWidgetId,
		} as unknown) as ReturnType<typeof useDashboard>);

		renderHook(() => useScrollWidgetIntoView('widget-id', ref));

		expect(mockElement.scrollIntoView).not.toHaveBeenCalled();
		expect(mockElement.focus).not.toHaveBeenCalled();
		expect(setToScrollWidgetId).not.toHaveBeenCalled();
	});
});
