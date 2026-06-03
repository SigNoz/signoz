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

jest.mock('components/CustomTimePicker/CustomTimePicker', () => ({
	__esModule: true,
	default: ({
		onSelect,
	}: {
		onSelect: (value: string) => void;
	}): JSX.Element => (
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
			<button
				type="button"
				data-testid="select-custom"
				onClick={(): void => onSelect('custom')}
			>
				Custom
			</button>
		</div>
	),
}));

describe('DateTimeSelectionV2 - Edge Cases', () => {
	let currentSearchParams: URLSearchParams;

	beforeEach(() => {
		jest.clearAllMocks();
		mockSafeNavigate.mockClear();
		queryClient.clear();
	});

	afterEach(() => {
		__resetSearchParamsGetter();
	});

	describe('Fresh Params at Navigation Time (Core Fix)', () => {
		it('should read params at navigation time, not render time', async () => {
			currentSearchParams = new URLSearchParams('relativeTime=30m');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper
					initialSearchParams="relativeTime=30m"
					onUrlUpdate={(event): void => {
						currentSearchParams = event.searchParams;
					}}
				>
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			currentSearchParams = new URLSearchParams(
				'relativeTime=30m&externalParam=addedLater',
			);

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
			expect(navigatedUrl).toContain('externalParam=addedLater');
		});

		it('should preserve multiple externally added params', async () => {
			currentSearchParams = new URLSearchParams('relativeTime=30m');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="relativeTime=30m">
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			currentSearchParams = new URLSearchParams(
				'relativeTime=30m&yAxisUnit=bytes&groupBy=host&view=table',
			);

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

			expect(navigatedUrl).toContain('relativeTime=6h');
			expect(navigatedUrl).toContain('yAxisUnit=bytes');
			expect(navigatedUrl).toContain('groupBy=host');
			expect(navigatedUrl).toContain('view=table');
		});
	});

	describe('Empty and Special Values', () => {
		it('should handle empty URL params gracefully', async () => {
			currentSearchParams = new URLSearchParams('');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="">
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
		});

		it('should handle special characters in preserved params', async () => {
			currentSearchParams = new URLSearchParams(
				'relativeTime=30m&filter=name%3D%22test%22',
			);
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="relativeTime=30m&filter=name%3D%22test%22">
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
			expect(navigatedUrl).toContain('filter=');
		});

		it('should not navigate when selecting custom (opens picker instead)', async () => {
			currentSearchParams = new URLSearchParams('relativeTime=30m');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="relativeTime=30m">
					<DateTimeSelection showAutoRefresh />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			mockSafeNavigate.mockClear();

			act(() => {
				fireEvent.click(screen.getByTestId('select-custom'));
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const customNavigationCalls = mockSafeNavigate.mock.calls.filter((call) => {
				const url = call[0] as string;
				return url.includes('startTime=') || url.includes('endTime=');
			});

			expect(customNavigationCalls).toHaveLength(0);
		});
	});
});
