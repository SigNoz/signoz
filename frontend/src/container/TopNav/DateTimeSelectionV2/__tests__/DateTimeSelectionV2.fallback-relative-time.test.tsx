import { render, screen, waitFor } from '@testing-library/react';
import { LOCALSTORAGE } from 'constants/localStorage';

import DateTimeSelection from '../index';
import type { Time } from '../types';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
} from 'utils/getUnstableCurrentSearchParams';
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

const DASHBOARD_PATH = '/dashboard/abc';

function navigatedUrls(): string[] {
	return mockSafeNavigate.mock.calls.map((call) => call[0] as string);
}

function lastNavigatedUrl(): string {
	const urls = navigatedUrls();
	return urls[urls.length - 1];
}

function picker(fallbackRelativeTime?: string, searchParams = ''): JSX.Element {
	return (
		<TestWrapper initialSearchParams={searchParams} initialPath={DASHBOARD_PATH}>
			<DateTimeSelection
				showAutoRefresh
				fallbackRelativeTime={fallbackRelativeTime as Time | undefined}
			/>
		</TestWrapper>
	);
}

// The picker writes its choice to the URL, so a browser would hand the next
// render those params back. The stubbed getter has to do the same.
function adoptNavigatedUrl(target: URLSearchParams): void {
	const query = lastNavigatedUrl().split('?')[1] ?? '';
	Array.from(target.keys()).forEach((key) => target.delete(key));
	new URLSearchParams(query).forEach((value, key) => target.set(key, value));
}

async function renderAndGetNavigatedUrl(
	searchParams: string,
	fallbackRelativeTime?: string,
): Promise<string> {
	const currentSearchParams = new URLSearchParams(searchParams);
	__setSearchParamsGetterForTest(() => currentSearchParams);

	render(picker(fallbackRelativeTime, searchParams));

	await waitFor(() => {
		expect(mockSafeNavigate).toHaveBeenCalled();
	});

	return lastNavigatedUrl();
}

describe('DateTimeSelectionV2 - fallbackRelativeTime', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		queryClient.clear();
		localStorage.clear();
	});

	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it('selects the fallback when the URL and local storage carry no time', async () => {
		const url = await renderAndGetNavigatedUrl('', '1h');
		expect(url).toContain('relativeTime=1h');
	});

	it('prefers the relative time in the URL over the fallback', async () => {
		const url = await renderAndGetNavigatedUrl('relativeTime=15m', '1h');
		expect(url).toContain('relativeTime=15m');
	});

	it('prefers the time persisted for the route over the fallback', async () => {
		localStorage.setItem(
			LOCALSTORAGE.METRICS_TIME_IN_DURATION,
			JSON.stringify({ [DASHBOARD_PATH]: '1d' }),
		);

		const url = await renderAndGetNavigatedUrl('', '1h');
		expect(url).toContain('relativeTime=1d');
	});

	// Perses accepts compound durations; the picker's own format does not, so an
	// unparseable fallback must fall through to the route default rather than throw.
	it('ignores a fallback the picker cannot parse', async () => {
		const url = await renderAndGetNavigatedUrl('', '1h30m');
		expect(url).toContain('relativeTime=30m');
	});

	// A stored zero window would collapse the query range to a single instant.
	it('ignores a zero-length fallback', async () => {
		const url = await renderAndGetNavigatedUrl('', '0m');
		expect(url).toContain('relativeTime=30m');
	});

	it('keeps the route default when no fallback is given', async () => {
		const url = await renderAndGetNavigatedUrl('');
		expect(url).toContain('relativeTime=30m');
	});

	// Saving the setting refetches the dashboard, which changes the prop. `connect`
	// rebuilds updateTimeInterval on own-prop changes, so the route effect can
	// rerun; the selection survives because the URL written on mount wins.
	it('does not reset the selection when the fallback changes after mount', async () => {
		const currentSearchParams = new URLSearchParams('');
		__setSearchParamsGetterForTest(() => currentSearchParams);

		const { rerender } = render(picker('1h'));

		await waitFor(() => {
			expect(mockSafeNavigate).toHaveBeenCalled();
		});
		expect(lastNavigatedUrl()).toContain('relativeTime=1h');

		adoptNavigatedUrl(currentSearchParams);
		rerender(picker('1d'));

		await waitFor(() => {
			expect(screen.getByTestId('custom-time-picker')).toBeInTheDocument();
		});

		expect(
			navigatedUrls().filter((url) => url.includes('relativeTime=1d')),
		).toHaveLength(0);
		expect(lastNavigatedUrl()).toContain('relativeTime=1h');
	});
});
