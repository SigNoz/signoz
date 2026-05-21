import { render, screen, waitFor } from '@testing-library/react';
import ROUTES from 'constants/routes';

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
	default: (): JSX.Element => <div data-testid="custom-time-picker" />,
}));

describe('DateTimeSelectionV2 - Route-Specific Behavior', () => {
	let currentSearchParams: URLSearchParams;

	beforeEach(() => {
		jest.clearAllMocks();
		mockSafeNavigate.mockClear();
		queryClient.clear();
	});

	afterEach(() => {
		__resetSearchParamsGetter();
	});

	describe('Alert Pages', () => {
		it('should set default time for alert overview when no time params', async () => {
			currentSearchParams = new URLSearchParams('otherParam=value');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper
					initialSearchParams="otherParam=value"
					initialPath={ROUTES.ALERT_OVERVIEW}
				>
					<DateTimeSelection showAutoRefresh defaultRelativeTime="6h" />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[0][0] as string;
			expect(navigatedUrl).toContain('relativeTime=6h');
			expect(navigatedUrl).toContain('otherParam=value');
		});

		it('should set default time for alert history when no time params', async () => {
			currentSearchParams = new URLSearchParams('filter=active');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper
					initialSearchParams="filter=active"
					initialPath={ROUTES.ALERT_HISTORY}
				>
					<DateTimeSelection showAutoRefresh defaultRelativeTime="6h" />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
			});

			const navigatedUrl = mockSafeNavigate.mock.calls[0][0] as string;
			expect(navigatedUrl).toContain('relativeTime=6h');
		});

		it('should NOT override existing time params on alert pages', async () => {
			currentSearchParams = new URLSearchParams('relativeTime=1h&filter=active');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper
					initialSearchParams="relativeTime=1h&filter=active"
					initialPath={ROUTES.ALERT_OVERVIEW}
				>
					<DateTimeSelection showAutoRefresh defaultRelativeTime="6h" />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			const calls = mockSafeNavigate.mock.calls;
			if (calls.length > 0) {
				const lastUrl = calls[calls.length - 1][0] as string;
				expect(lastUrl).toContain('relativeTime=1h');
			}
		});
	});

	describe('disableUrlSync Behavior', () => {
		it('should not sync URL on mount when disableUrlSync is true', async () => {
			currentSearchParams = new URLSearchParams('');
			__setSearchParamsGetterForTest(() => currentSearchParams);

			render(
				<TestWrapper initialSearchParams="" initialPath="/services">
					<DateTimeSelection showAutoRefresh disableUrlSync />
				</TestWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
			});

			const syncCalls = mockSafeNavigate.mock.calls.filter((call) => {
				const url = call[0] as string;
				return url.includes('relativeTime=') && !url.includes('services?');
			});

			expect(syncCalls).toHaveLength(0);
		});
	});
});
