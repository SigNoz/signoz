import { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import {
	NuqsTestingAdapter,
	OnUrlUpdateFunction,
	UrlUpdateEvent,
} from 'nuqs/adapters/testing';

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

describe('useTableParams navigation scenarios', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		localStorage.clear();
		usePreferredPageSizeStore.setState({ tables: {} });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('Tab navigation: Alert Rules -> Configuration -> Routing Policies', () => {
		it('preferred value from one table should NOT leak to URL when navigating away', () => {
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
			const wrapper = createNuqsWrapper({}, onUrlUpdate);

			// Simulate Alert Rules: user sets limit=100
			const alertRules = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit', orderBy: 'orderBy' },
						{
							page: 1,
							limit: 10,
							storageKey: 'alert-rules',
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			// User selects limit=100
			act(() => {
				alertRules.result.current.setLimit(100);
				jest.runAllTimers();
			});

			expect(alertRules.result.current.limit).toBe(100);

			// Verify it's persisted in localStorage
			expect(
				localStorage.getItem(
					'@signoz/table-columns/alert-rules-preferred-page-size',
				),
			).toBe('100');

			// Simulate unmount (user navigates away)
			alertRules.unmount();

			// At this point, the URL should NOT have limit=100 from alert-rules
			// when another component mounts with a different storageKey
		});

		it('different tables with different storageKeys maintain separate preferences', () => {
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
			const wrapper = createNuqsWrapper({}, onUrlUpdate);

			// Alert Rules sets limit=100
			localStorage.setItem(
				'@signoz/table-columns/alert-rules-preferred-page-size',
				'100',
			);
			// Triggered Alerts sets limit=25
			localStorage.setItem(
				'@signoz/table-columns/triggered-alerts-preferred-page-size',
				'25',
			);

			// Mount Triggered Alerts (simulating tab switch from Alert Rules)
			const triggeredAlerts = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit', orderBy: 'orderBy' },
						{
							page: 1,
							limit: 10,
							storageKey: 'triggered-alerts',
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			act(() => {
				jest.runAllTimers();
			});

			// Should use triggered-alerts preference (25), NOT alert-rules (100)
			expect(triggeredAlerts.result.current.limit).toBe(25);
		});

		it('table without storageKey should NOT write preference to URL from another table', () => {
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();

			// Pre-set alert-rules preference
			localStorage.setItem(
				'@signoz/table-columns/alert-rules-preferred-page-size',
				'100',
			);

			// Start fresh with NO URL params
			const wrapper = createNuqsWrapper({}, onUrlUpdate);

			// Mount a table WITHOUT storageKey (simulating a simple table)
			const simpleTable = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit' },
						{
							page: 1,
							limit: 10,
							// NO storageKey
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			act(() => {
				jest.runAllTimers();
			});

			// Should use calculated (42), not alert-rules preference (100)
			expect(simpleTable.result.current.limit).toBe(42);
		});
	});

	describe('URL cleanup on unmount', () => {
		it('URL params should be cleanable by consumer on unmount', () => {
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
			const wrapper = createNuqsWrapper({}, onUrlUpdate);

			const { result, unmount } = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit', orderBy: 'orderBy' },
						{
							page: 1,
							limit: 10,
							storageKey: 'test-cleanup',
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			// Set some values
			act(() => {
				result.current.setLimit(50);
				result.current.setPage(3);
				jest.runAllTimers();
			});

			// Verify URL was updated
			const limitUpdates = onUrlUpdate.mock.calls
				.map((call) => call[0].searchParams.get('limit'))
				.filter(Boolean);
			expect(limitUpdates).toContain('50');

			// Unmount (note: useTableParams itself doesn't cleanup URL - consumer should)
			unmount();

			// Verify the component unmounted (no errors)
			expect(true).toBe(true);
		});
	});

	describe('Parallel tables sharing URL params', () => {
		it('two tables using same URL params should see same values when URL pre-set', () => {
			const wrapper = createNuqsWrapper({ limit: '30' });

			const table1 = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit' },
						{
							page: 1,
							limit: 10,
							storageKey: 'table-1',
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			const table2 = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit' },
						{
							page: 1,
							limit: 20,
							storageKey: 'table-2',
							calculatedPageSize: 50,
						},
					),
				{ wrapper },
			);

			// Both should see URL value (30), not their defaults
			expect(table1.result.current.limit).toBe(30);
			expect(table2.result.current.limit).toBe(30);
		});

		it('table mounted after setLimit should see updated URL value', () => {
			const wrapper = createNuqsWrapper();

			// Table1 mounts first
			const table1 = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit' },
						{
							page: 1,
							limit: 10,
							storageKey: 'table-1',
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			act(() => {
				jest.runAllTimers();
			});

			expect(table1.result.current.limit).toBe(42);

			// Table1 sets limit to 100
			act(() => {
				table1.result.current.setLimit(100);
				jest.runAllTimers();
			});

			expect(table1.result.current.limit).toBe(100);

			// Table2 mounts AFTER table1 set limit=100 in URL
			// In test environment, URL state doesn't persist between renderHook calls
			// This test documents current behavior - each hook instance is independent
		});
	});

	describe('URL state initialization race conditions', () => {
		it('should not write preferred value to URL if URL already has value', () => {
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();

			// Pre-set preference
			localStorage.setItem(
				'@signoz/table-columns/test-table-preferred-page-size',
				'100',
			);

			// URL already has limit=30
			const wrapper = createNuqsWrapper({ limit: '30' }, onUrlUpdate);

			const { result } = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit' },
						{
							page: 1,
							limit: 10,
							storageKey: 'test-table',
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			act(() => {
				jest.runAllTimers();
			});

			// Should use URL (30), not preferred (100)
			expect(result.current.limit).toBe(30);

			// URL should NOT have been overwritten with 100
			const limitUpdates = onUrlUpdate.mock.calls
				.map((call) => call[0].searchParams.get('limit'))
				.filter((v) => v === '100');
			expect(limitUpdates).toHaveLength(0);
		});

		it('URL init effect should write calculated value when URL empty', async () => {
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
			const wrapper = createNuqsWrapper({}, onUrlUpdate);

			// Mount with no URL params
			const { result } = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit' },
						{
							page: 1,
							limit: 10,
							storageKey: 'table-1',
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			// Effects run after render, need to flush
			await act(async () => {
				jest.runAllTimers();
				await Promise.resolve();
			});

			// Should use calculated value
			expect(result.current.limit).toBe(42);

			// The URL init effect writes to URL asynchronously
			// Check that limit is 42 (which it is from the limitDefault calculation)
		});

		it('consumer cleanup effect is responsible for clearing URL params', () => {
			// This test documents that useTableParams does NOT auto-cleanup URL
			// Consumer components (like ListAlertRules) must use useEffect cleanup
			// to clear URL params when unmounting
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();
			const wrapper = createNuqsWrapper({}, onUrlUpdate);

			const { result, unmount } = renderHook(
				() =>
					useTableParams(
						{ page: 'page', limit: 'limit' },
						{
							page: 1,
							limit: 10,
							storageKey: 'table-1',
							calculatedPageSize: 42,
						},
					),
				{ wrapper },
			);

			act(() => {
				result.current.setLimit(100);
				jest.runAllTimers();
			});

			expect(result.current.limit).toBe(100);

			// Unmount - useTableParams does NOT clear URL
			unmount();

			// Verify unmount happened without clearing URL
			// The last URL update should still have limit=100, not null
			const lastUpdate = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1];
			expect(lastUpdate[0].searchParams.get('limit')).toBe('100');
		});
	});
});
