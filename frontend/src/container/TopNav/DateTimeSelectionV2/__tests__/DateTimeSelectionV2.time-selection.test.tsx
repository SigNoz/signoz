import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';

import DateTimeSelection from '../index';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
} from '../utils/getUnstableCurrentSearchParams';
import { queryClient, TestWrapper, createMockMoment } from './testUtils';

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

jest.mock('container/NewExplorerCTA', () => ({
	__esModule: true,
	default: (): null => null,
}));

let mockOnCustomDateHandler: ((range: [unknown, unknown]) => void) | null =
	null;
let mockOnValidCustomDateChange: ((data: { timeStr: string }) => void) | null =
	null;

jest.mock('components/CustomTimePicker/CustomTimePicker', () => ({
	__esModule: true,
	default: ({
		onSelect,
		onCustomDateHandler,
		onValidCustomDateChange,
	}: {
		onSelect: (value: string) => void;
		onCustomDateHandler?: (range: [unknown, unknown]) => void;
		onValidCustomDateChange?: (data: { timeStr: string }) => void;
	}): JSX.Element => {
		mockOnCustomDateHandler = onCustomDateHandler || null;
		mockOnValidCustomDateChange = onValidCustomDateChange || null;

		return (
			<div data-testid="custom-time-picker">
				<button
					type="button"
					data-testid="select-15m"
					onClick={(): void => onSelect('15m')}
				>
					15m
				</button>
				<button
					type="button"
					data-testid="select-1h"
					onClick={(): void => onSelect('1h')}
				>
					1h
				</button>
				<button
					type="button"
					data-testid="select-6h"
					onClick={(): void => onSelect('6h')}
				>
					6h
				</button>
			</div>
		);
	},
}));

describe('DateTimeSelectionV2 - Time Selection', () => {
	let currentSearchParams: URLSearchParams;

	beforeEach(() => {
		jest.clearAllMocks();
		mockSafeNavigate.mockClear();
		queryClient.clear();
		mockOnCustomDateHandler = null;
		mockOnValidCustomDateChange = null;
	});

	afterEach(() => {
		__resetSearchParamsGetter();
	});

	describe('Relative Time', () => {
		it('should update relativeTime and remove startTime/endTime', async () => {
			currentSearchParams = new URLSearchParams(
				'startTime=1000&endTime=2000&otherParam=keep',
			);
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="startTime=1000&endTime=2000&otherParam=keep">
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			mockSafeNavigate.mockClear();

			act(() => {
				fireEvent.click(screen.getByTestId('select-15m'));
			});

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[
				mockSafeNavigate.mock.calls.length - 1
			][0] as string;

			expect(navigatedUrl).toContain('relativeTime=15m');
			expect(navigatedUrl).not.toContain('startTime=');
			expect(navigatedUrl).not.toContain('endTime=');
			expect(navigatedUrl).toContain('otherParam=keep');
		});

		it('should remove activeLogId param on time change', async () => {
			currentSearchParams = new URLSearchParams(
				'relativeTime=30m&activeLogId=log123',
			);
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="relativeTime=30m&activeLogId=log123">
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			mockSafeNavigate.mockClear();

			act(() => {
				fireEvent.click(screen.getByTestId('select-1h'));
			});

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[
				mockSafeNavigate.mock.calls.length - 1
			][0] as string;

			expect(navigatedUrl).toContain('relativeTime=1h');
			expect(navigatedUrl).not.toContain('activeLogId');
		});

		it('should update compositeQuery with new ID when present', async () => {
			const compositeQuery = encodeURIComponent(
				JSON.stringify({ id: 'old-id', builder: { queryData: [] } }),
			);
			currentSearchParams = new URLSearchParams(
				`relativeTime=30m&compositeQuery=${compositeQuery}`,
			);
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper
					initialSearchParams={`relativeTime=30m&compositeQuery=${compositeQuery}`}
				>
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			mockSafeNavigate.mockClear();

			act(() => {
				fireEvent.click(screen.getByTestId('select-6h'));
			});

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[
				mockSafeNavigate.mock.calls.length - 1
			][0] as string;

			expect(navigatedUrl).toContain('compositeQuery=');
			expect(navigatedUrl).not.toContain('old-id');
		});

		it('should preserve all non-time URL params', async () => {
			currentSearchParams = new URLSearchParams(
				'relativeTime=30m&param1=a&param2=b&param3=c',
			);
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="relativeTime=30m&param1=a&param2=b&param3=c">
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			mockSafeNavigate.mockClear();

			act(() => {
				fireEvent.click(screen.getByTestId('select-1h'));
			});

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[
				mockSafeNavigate.mock.calls.length - 1
			][0] as string;

			expect(navigatedUrl).toContain('relativeTime=1h');
			expect(navigatedUrl).toContain('param1=a');
			expect(navigatedUrl).toContain('param2=b');
			expect(navigatedUrl).toContain('param3=c');
		});
	});

	describe('Custom Date Range', () => {
		it('should set startTime/endTime and remove relativeTime', async () => {
			currentSearchParams = new URLSearchParams('relativeTime=30m&keepThis=yes');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="relativeTime=30m&keepThis=yes">
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			const startMoment = createMockMoment(1700000000000);
			const endMoment = createMockMoment(1700003600000);

			mockSafeNavigate.mockClear();

			act(() => {
				mockOnCustomDateHandler?.([startMoment, endMoment]);
			});

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[
				mockSafeNavigate.mock.calls.length - 1
			][0] as string;

			expect(navigatedUrl).toContain('startTime=1700000000000');
			expect(navigatedUrl).toContain('endTime=1700003600000');
			expect(navigatedUrl).not.toContain('relativeTime=');
			expect(navigatedUrl).toContain('keepThis=yes');
		});

		it('should update compositeQuery when present for custom date', async () => {
			const compositeQuery = encodeURIComponent(
				JSON.stringify({ id: 'old-id', builder: { queryData: [] } }),
			);
			currentSearchParams = new URLSearchParams(
				`relativeTime=30m&compositeQuery=${compositeQuery}`,
			);
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper
					initialSearchParams={`relativeTime=30m&compositeQuery=${compositeQuery}`}
				>
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			const startMoment = createMockMoment(1700000000000);
			const endMoment = createMockMoment(1700003600000);

			mockSafeNavigate.mockClear();

			act(() => {
				mockOnCustomDateHandler?.([startMoment, endMoment]);
			});

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[
				mockSafeNavigate.mock.calls.length - 1
			][0] as string;

			expect(navigatedUrl).toContain('compositeQuery=');
			expect(navigatedUrl).not.toContain('old-id');
		});
	});

	describe('Valid Custom Date String', () => {
		it('should handle shorthand date format and preserve params', async () => {
			currentSearchParams = new URLSearchParams('relativeTime=30m&filter=active');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="relativeTime=30m&filter=active">
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			mockSafeNavigate.mockClear();

			act(() => {
				mockOnValidCustomDateChange?.({ timeStr: '2h' });
			});

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[
				mockSafeNavigate.mock.calls.length - 1
			][0] as string;

			expect(navigatedUrl).toContain('relativeTime=2h');
			expect(navigatedUrl).toContain('filter=active');
			expect(navigatedUrl).not.toContain('startTime=');
			expect(navigatedUrl).not.toContain('endTime=');
		});
	});
});
