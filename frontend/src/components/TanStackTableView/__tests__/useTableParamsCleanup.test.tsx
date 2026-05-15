import { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useQueryStates, parseAsInteger } from 'nuqs';
import {
	NuqsTestingAdapter,
	OnUrlUpdateFunction,
	UrlUpdateEvent,
} from 'nuqs/adapters/testing';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

import { useTableParams } from '../useTableParams';
import { usePreferredPageSizeStore } from '../usePreferredPageSize.store';

function createNuqsWrapper(
	queryParams?: Record<string, string>,
	onUrlUpdate?: OnUrlUpdateFunction,
): ({ children }: { children: ReactNode }) => JSX.Element {
	return function NuqsWrapper({
		children,
	}: {
		children: ReactNode;
	}): JSX.Element {
		return (
			<NuqsTestingAdapter
				searchParams={queryParams}
				onUrlUpdate={onUrlUpdate}
				hasMemory
			>
				{children}
			</NuqsTestingAdapter>
		);
	};
}

const QUERY_PARAMS_CONFIG = {
	orderBy: 'orderBy',
	page: 'page',
	limit: 'limit',
} as const;

type TableParamsWithCleanup = ReturnType<typeof useTableParams> & {
	clearParams: ReturnType<typeof useQueryStates>[1];
};

/**
 * Simulates the cleanup pattern used in ListAlertRules:
 * - Uses useQueryStates to clear URL params on unmount
 */
function useTableParamsWithCleanup(
	storageKey: string,
	calculatedPageSize: number | null,
): TableParamsWithCleanup {
	const result = useTableParams(QUERY_PARAMS_CONFIG, {
		page: 1,
		limit: 10,
		storageKey,
		calculatedPageSize,
	});

	// This mirrors the cleanup effect in ListAlertRules
	const [, setTableQueryParams] = useQueryStates({
		[QUERY_PARAMS_CONFIG.orderBy]: parseAsJsonNoValidate(),
		[QUERY_PARAMS_CONFIG.page]: parseAsInteger,
		[QUERY_PARAMS_CONFIG.limit]: parseAsInteger,
	});

	// Note: We can't use useEffect cleanup in tests easily, but we can verify
	// that calling setTableQueryParams with nulls does clear the URL

	return { ...result, clearParams: setTableQueryParams };
}

describe('URL cleanup pattern (simulating ListAlertRules behavior)', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		localStorage.clear();
		usePreferredPageSizeStore.setState({ tables: {} });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('setTableQueryParams with null values should clear URL params', async () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);

		const { result } = renderHook(
			() => useTableParamsWithCleanup('alert-rules', 42),
			{ wrapper },
		);

		// Set limit to 100
		await act(async () => {
			result.current.setLimit(100);
			jest.runAllTimers();
			await Promise.resolve();
		});

		expect(result.current.limit).toBe(100);

		// Verify limit=100 is in URL
		const limitAfterSet = onUrlUpdate.mock.calls
			.map((call) => call[0].searchParams.get('limit'))
			.filter(Boolean)
			.pop();
		expect(limitAfterSet).toBe('100');

		// Simulate cleanup: clear all params
		await act(async () => {
			void result.current.clearParams({
				orderBy: null,
				page: null,
				limit: null,
			});
			jest.runAllTimers();
			await Promise.resolve();
		});

		// Verify limit was cleared (last update should have limit=null or removed)
		const lastUpdate = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1];
		const finalLimit = lastUpdate[0].searchParams.get('limit');
		expect(finalLimit).toBeNull();
	});

	it('cleanup should work even when limit was set from localStorage preference', async () => {
		// Pre-set preference
		localStorage.setItem(
			'@signoz/table-columns/alert-rules-preferred-page-size',
			'100',
		);

		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);

		const { result } = renderHook(
			() => useTableParamsWithCleanup('alert-rules', 42),
			{ wrapper },
		);

		await act(async () => {
			jest.runAllTimers();
			await Promise.resolve();
		});

		// Should use preferred value
		expect(result.current.limit).toBe(100);

		// Simulate cleanup
		await act(async () => {
			void result.current.clearParams({
				orderBy: null,
				page: null,
				limit: null,
			});
			jest.runAllTimers();
			await Promise.resolve();
		});

		// URL should be cleared
		const lastUpdate = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1];
		const finalLimit = lastUpdate[0].searchParams.get('limit');
		expect(finalLimit).toBeNull();
	});

	it('demonstrates the bug: component without cleanup leaves limit in URL', async () => {
		const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
		const wrapper = createNuqsWrapper({}, onUrlUpdate);

		// Mount TriggeredAlerts-like component (no cleanup)
		const { result, unmount } = renderHook(
			() =>
				useTableParams(QUERY_PARAMS_CONFIG, {
					page: 1,
					limit: 10,
					storageKey: 'triggered-alerts',
					calculatedPageSize: 42,
				}),
			{ wrapper },
		);

		// Set limit to 100
		await act(async () => {
			result.current.setLimit(100);
			jest.runAllTimers();
			await Promise.resolve();
		});

		expect(result.current.limit).toBe(100);

		// Unmount WITHOUT cleanup
		unmount();

		// Verify limit=100 is STILL in URL (this is the bug!)
		const lastUpdate = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1];
		const finalLimit = lastUpdate[0].searchParams.get('limit');
		expect(finalLimit).toBe('100'); // BUG: limit persists after unmount
	});
});
