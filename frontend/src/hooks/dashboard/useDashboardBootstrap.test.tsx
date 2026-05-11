import { act, render } from '@testing-library/react';
import { Modal } from 'antd';
import { useDashboardBootstrap } from 'hooks/dashboard/useDashboardBootstrap';
import { useTransformDashboardVariables } from 'hooks/dashboard/useTransformDashboardVariables';
import useTabVisibility from 'hooks/useTabFocus';
import { getMinMaxForSelectedTime } from 'lib/getMinMax';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';
import { useDashboardQuery } from './useDashboardQuery';

const mockDispatch = jest.fn();
const mockSetDashboardData = jest.fn();
const mockSetLayouts = jest.fn();
const mockSetPanelMap = jest.fn();
const mockResetDashboardStore = jest.fn();
const mockGetUrlVariables = jest.fn();
const mockUpdateUrlVariable = jest.fn();
const mockRefetch = jest.fn();

let mockGlobalTime = {
	selectedTime: 'custom',
	minTime: 1710000000000000000,
	maxTime: 1710000300000000000,
	isAutoRefreshDisabled: true,
};

let currentQueryData: unknown;

jest.mock('react-i18next', () => ({
	useTranslation: (): { t: (key: string) => string } => ({
		t: (key: string): string => key,
	}),
}));

jest.mock('react-redux', () => ({
	useDispatch: jest.fn(() => mockDispatch),
	useSelector: jest.fn(
		(
			selectorFn: (state: { globalTime: typeof mockGlobalTime }) => unknown,
		): unknown => selectorFn({ globalTime: mockGlobalTime }),
	),
}));

jest.mock('hooks/useTabFocus', () => jest.fn(() => true));
jest.mock('hooks/dashboard/useDashboardVariablesSync', () => ({
	useDashboardVariablesSync: jest.fn(),
}));
jest.mock('./useDashboardQuery', () => ({
	useDashboardQuery: jest.fn(),
}));
jest.mock('hooks/dashboard/useTransformDashboardVariables', () => ({
	useTransformDashboardVariables: jest.fn(),
}));
jest.mock('providers/Dashboard/store/useDashboardStore', () => ({
	useDashboardStore: jest.fn(),
}));
jest.mock('providers/Dashboard/initializeDefaultVariables', () => ({
	initializeDefaultVariables: jest.fn(),
}));
jest.mock('lib/dashboard/getUpdatedLayout', () => ({
	getUpdatedLayout: jest.fn(() => []),
}));
jest.mock('providers/Dashboard/util', () => ({
	sortLayout: jest.fn((layout) => layout),
}));
jest.mock('lib/getMinMax', () => ({
	getMinMaxForSelectedTime: jest.fn(),
}));

function TestComponent({ confirm }: { confirm: typeof Modal.confirm }): null {
	useDashboardBootstrap('dashboard-1', { confirm });
	return null;
}

describe('useDashboardBootstrap', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		mockGlobalTime = {
			selectedTime: 'custom',
			minTime: 1710000000000000000,
			maxTime: 1710000300000000000,
			isAutoRefreshDisabled: true,
		};

		jest.mocked(useDashboardStore as unknown as jest.Mock).mockReturnValue({
			setDashboardData: mockSetDashboardData,
			setLayouts: mockSetLayouts,
			setPanelMap: mockSetPanelMap,
			resetDashboardStore: mockResetDashboardStore,
		});

		jest
			.mocked(useTransformDashboardVariables as unknown as jest.Mock)
			.mockReturnValue({
				getUrlVariables: mockGetUrlVariables,
				updateUrlVariable: mockUpdateUrlVariable,
				transformDashboardVariables: <T,>(data: T): T => data,
			});

		jest.mocked(useTabVisibility as unknown as jest.Mock).mockReturnValue(true);
		jest
			.mocked(useDashboardQuery as unknown as jest.Mock)
			.mockImplementation(() => ({
				data: currentQueryData,
				isLoading: false,
				isError: false,
				isFetching: false,
				error: null,
				refetch: mockRefetch,
			}));
	});

	it('keeps minTime and maxTime unchanged for custom range on refresh confirm', () => {
		const initialDashboard = {
			id: 'dashboard-1',
			updatedAt: '2024-01-01T00:00:00.000Z',
			data: { layout: [], panelMap: {}, variables: {} },
		};

		const updatedDashboard = {
			id: 'dashboard-1',
			updatedAt: '2024-01-01T01:00:00.000Z',
			data: { layout: [], panelMap: {}, variables: {} },
		};

		const mockConfirm = jest.fn<
			ReturnType<typeof Modal.confirm>,
			Parameters<typeof Modal.confirm>
		>(() => ({ destroy: jest.fn(), update: jest.fn() }));

		currentQueryData = { data: initialDashboard };
		const { rerender } = render(<TestComponent confirm={mockConfirm} />);

		expect(mockConfirm).not.toHaveBeenCalled();

		currentQueryData = { data: updatedDashboard };
		rerender(<TestComponent confirm={mockConfirm} />);

		expect(mockConfirm).toHaveBeenCalledTimes(1);
		const firstCall = mockConfirm.mock.calls[0];
		expect(firstCall).toBeDefined();
		const [confirmProps] = firstCall as Parameters<typeof Modal.confirm>;

		act(() => {
			confirmProps.onOk?.();
		});

		expect(getMinMaxForSelectedTime).not.toHaveBeenCalled();
		expect(mockDispatch).toHaveBeenCalledWith({
			type: 'UPDATE_TIME_INTERVAL',
			payload: {
				selectedTime: 'custom',
				minTime: mockGlobalTime.minTime,
				maxTime: mockGlobalTime.maxTime,
			},
		});
	});
});
