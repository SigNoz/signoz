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
import { queryClient, TestWrapper } from './testUtils';

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
					data-testid="select-1h"
					onClick={(): void => onSelect('1h')}
				>
					1h
				</button>
			</div>
		);
	},
}));

describe('DateTimeSelectionV2 - Modal Mode', () => {
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

	it('should call onTimeChange instead of navigating for relative time', async () => {
		currentSearchParams = new URLSearchParams('relativeTime=30m');
		__setSearchParamsGetterForTest(() => currentSearchParams);

		const mockOnTimeChange = jest.fn();

		render(
			<TestWrapper initialSearchParams="relativeTime=30m">
				<DateTimeSelection
					showAutoRefresh
					isModalTimeSelection
					onTimeChange={mockOnTimeChange}
				/>
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
			expect(mockOnTimeChange).toHaveBeenCalledWith('1h');
		});

		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('should call onTimeChange with custom and timestamps for custom date', async () => {
		currentSearchParams = new URLSearchParams('relativeTime=30m');
		__setSearchParamsGetterForTest(() => currentSearchParams);

		const mockOnTimeChange = jest.fn();

		render(
			<TestWrapper initialSearchParams="relativeTime=30m">
				<DateTimeSelection
					showAutoRefresh
					isModalTimeSelection
					onTimeChange={mockOnTimeChange}
				/>
			</TestWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
		});

		const startMoment = { toDate: (): Date => new Date(1700000000000) };
		const endMoment = { toDate: (): Date => new Date(1700003600000) };

		mockSafeNavigate.mockClear();

		act(() => {
			mockOnCustomDateHandler?.([startMoment, endMoment]);
		});

		await waitFor(() => {
			expect(mockOnTimeChange).toHaveBeenCalledWith(
				'custom',
				[1700000000000, 1700003600000],
			);
		});

		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('should call onTimeChange for valid custom date string in modal', async () => {
		currentSearchParams = new URLSearchParams('relativeTime=30m');
		__setSearchParamsGetterForTest(() => currentSearchParams);

		const mockOnTimeChange = jest.fn();

		render(
			<TestWrapper initialSearchParams="relativeTime=30m">
				<DateTimeSelection
					showAutoRefresh
					isModalTimeSelection
					onTimeChange={mockOnTimeChange}
				/>
			</TestWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
		});

		mockSafeNavigate.mockClear();

		act(() => {
			mockOnValidCustomDateChange?.({ timeStr: '4h' });
		});

		await waitFor(() => {
			expect(mockOnTimeChange).toHaveBeenCalledWith('4h');
		});

		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});
});
