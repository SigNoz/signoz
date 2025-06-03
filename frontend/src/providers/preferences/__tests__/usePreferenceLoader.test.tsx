/* eslint-disable sonarjs/no-duplicate-string */
import { renderHook, waitFor } from '@testing-library/react';
import { DataSource } from 'types/common/queryBuilder';

import logsLoaderConfig from '../configs/logsLoaderConfig';
import { usePreferenceLoader } from '../loader/usePreferenceLoader';

// Mock the config loaders
jest.mock('../configs/logsLoaderConfig', () => ({
	__esModule: true,
	default: {
		priority: ['local', 'url', 'default'],
		local: jest.fn().mockResolvedValue({
			columns: [{ name: 'local-column' }],
			formatting: { maxLines: 5, format: 'table', fontSize: 'medium', version: 1 },
		}),
		url: jest.fn().mockResolvedValue({
			columns: [{ name: 'url-column' }],
			formatting: { maxLines: 3, format: 'table', fontSize: 'small', version: 1 },
		}),
		default: jest.fn().mockResolvedValue({
			columns: [{ name: 'default-column' }],
			formatting: { maxLines: 2, format: 'table', fontSize: 'small', version: 1 },
		}),
	},
}));

jest.mock('../configs/tracesLoaderConfig', () => ({
	__esModule: true,
	default: {
		priority: ['local', 'url', 'default'],
		local: jest.fn().mockResolvedValue({
			columns: [{ name: 'local-trace-column' }],
		}),
		url: jest.fn().mockResolvedValue({
			columns: [{ name: 'url-trace-column' }],
		}),
		default: jest.fn().mockResolvedValue({
			columns: [{ name: 'default-trace-column' }],
		}),
	},
}));

describe('usePreferenceLoader', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should load logs preferences based on priority order', async () => {
		const { result } = renderHook(() =>
			usePreferenceLoader({ dataSource: DataSource.LOGS, reSync: 0 }),
		);

		// Initially it should be loading
		expect(result.current.loading).toBe(true);
		expect(result.current.preferences).toBe(null);
		expect(result.current.error).toBe(null);

		// Wait for the loader to complete
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Should have loaded from local storage (highest priority)
		expect(result.current.preferences).toEqual({
			columns: [{ name: 'local-column' }],
			formatting: { maxLines: 5, format: 'table', fontSize: 'medium', version: 1 },
		});
		expect(result.current.error).toBe(null);
	});

	it('should load traces preferences', async () => {
		const { result } = renderHook(() =>
			usePreferenceLoader({ dataSource: DataSource.TRACES, reSync: 0 }),
		);

		// Wait for the loader to complete
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Should have loaded trace columns
		expect(result.current.preferences).toEqual({
			columns: [{ name: 'local-trace-column' }],
		});
	});

	it('should re-load preferences when reSync changes', async () => {
		const { result, rerender } = renderHook(
			({ dataSource, reSync }) => usePreferenceLoader({ dataSource, reSync }),
			{ initialProps: { dataSource: DataSource.LOGS, reSync: 0 } },
		);

		// Wait for the first load to complete
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Trigger a reSync
		rerender({ dataSource: DataSource.LOGS, reSync: 1 });

		// Should start loading again
		expect(result.current.loading).toBe(true);

		// Wait for the second load to complete
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Should have reloaded from local storage
		expect(result.current.preferences).toEqual({
			columns: [{ name: 'local-column' }],
			formatting: { maxLines: 5, format: 'table', fontSize: 'medium', version: 1 },
		});
	});

	it('should handle errors during loading', async () => {
		// Mock an error in the loader using jest.spyOn
		const localSpy = jest.spyOn(logsLoaderConfig, 'local');
		localSpy.mockRejectedValueOnce(new Error('Loading failed'));

		const { result } = renderHook(() =>
			usePreferenceLoader({ dataSource: DataSource.LOGS, reSync: 0 }),
		);

		// Wait for the loader to complete
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Should have set the error
		expect(result.current.error).toBeInstanceOf(Error);
		expect(result.current.error?.message).toBe('Loading failed');
		expect(result.current.preferences).toBe(null);

		// Restore original implementation
		localSpy.mockRestore();
	});
});
