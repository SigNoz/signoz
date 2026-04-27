import { act } from '@testing-library/react';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';

import {
	createGlobalTimeStore,
	defaultGlobalTimeStore,
} from '../globalTimeStore';
import { createCustomTimeRange } from '../utils';

describe('createGlobalTimeStore', () => {
	describe('factory function', () => {
		it('should create independent store instances', () => {
			const store1 = createGlobalTimeStore();
			const store2 = createGlobalTimeStore();

			store1.getState().setSelectedTime('1h');

			expect(store1.getState().selectedTime).toBe('1h');
			expect(store2.getState().selectedTime).toBe(DEFAULT_TIME_RANGE);
		});

		it('should accept initial state', () => {
			const store = createGlobalTimeStore({
				selectedTime: '15m',
				refreshInterval: 5000,
			});

			expect(store.getState().selectedTime).toBe('15m');
			expect(store.getState().refreshInterval).toBe(5000);
			expect(store.getState().isRefreshEnabled).toBe(true);
		});

		it('should compute isRefreshEnabled correctly for custom time', () => {
			const customTime = createCustomTimeRange(1000000000, 2000000000);
			const store = createGlobalTimeStore({
				selectedTime: customTime,
				refreshInterval: 5000,
			});

			expect(store.getState().isRefreshEnabled).toBe(false);
		});
	});

	describe('defaultGlobalTimeStore', () => {
		it('should be a singleton', () => {
			expect(defaultGlobalTimeStore).toBeDefined();
			expect(defaultGlobalTimeStore.getState().selectedTime).toBeDefined();
		});
	});

	describe('setRefreshInterval', () => {
		it('should update refresh interval and enable refresh', () => {
			const store = createGlobalTimeStore();

			act(() => {
				store.getState().setRefreshInterval(10000);
			});

			expect(store.getState().refreshInterval).toBe(10000);
			expect(store.getState().isRefreshEnabled).toBe(true);
		});

		it('should disable refresh when interval is 0', () => {
			const store = createGlobalTimeStore({ refreshInterval: 5000 });

			act(() => {
				store.getState().setRefreshInterval(0);
			});

			expect(store.getState().refreshInterval).toBe(0);
			expect(store.getState().isRefreshEnabled).toBe(false);
		});

		it('should not enable refresh for custom time range', () => {
			const customTime = createCustomTimeRange(1000000000, 2000000000);
			const store = createGlobalTimeStore({ selectedTime: customTime });

			act(() => {
				store.getState().setRefreshInterval(10000);
			});

			expect(store.getState().refreshInterval).toBe(10000);
			expect(store.getState().isRefreshEnabled).toBe(false);
		});
	});

	describe('store name', () => {
		it('should store name when provided', () => {
			const store = createGlobalTimeStore({ name: 'drawer' });
			expect(store.getState().name).toBe('drawer');
		});

		it('should have undefined name when not provided', () => {
			const store = createGlobalTimeStore();
			expect(store.getState().name).toBeUndefined();
		});
	});

	describe('getAutoRefreshQueryKey', () => {
		it('should generate key without name for unnamed store', () => {
			const store = createGlobalTimeStore();
			const key = store
				.getState()
				.getAutoRefreshQueryKey('15m', 'MY_QUERY', 'param1');

			expect(key).toStrictEqual([
				REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
				'MY_QUERY',
				'param1',
				'15m',
			]);
		});

		it('should generate key with name for named store', () => {
			const store = createGlobalTimeStore({ name: 'drawer' });
			const key = store
				.getState()
				.getAutoRefreshQueryKey('15m', 'MY_QUERY', 'param1');

			expect(key).toStrictEqual([
				REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
				'drawer',
				'MY_QUERY',
				'param1',
				'15m',
			]);
		});

		it('should handle no query parts for named store', () => {
			const store = createGlobalTimeStore({ name: 'test' });
			const key = store.getState().getAutoRefreshQueryKey('1h');

			expect(key).toStrictEqual([
				REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
				'test',
				'1h',
			]);
		});

		it('should handle no query parts for unnamed store', () => {
			const store = createGlobalTimeStore();
			const key = store.getState().getAutoRefreshQueryKey('1h');

			expect(key).toStrictEqual([REACT_QUERY_KEY.AUTO_REFRESH_QUERY, '1h']);
		});
	});
});
