/* eslint-disable sonarjs/no-identical-functions */
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
		const setReSync = jest.fn();
		const { result } = renderHook(() =>
			usePreferenceLoader({
				dataSource: DataSource.LOGS,
				reSync: false,
				setReSync,
			}),
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
		expect(setReSync).not.toHaveBeenCalled(); // Should not call setReSync when reSync is false
	});

	it('should load traces preferences', async () => {
		const setReSync = jest.fn();
		const { result } = renderHook(() =>
			usePreferenceLoader({
				dataSource: DataSource.TRACES,
				reSync: false,
				setReSync,
			}),
		);

		// Wait for the loader to complete
		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Should have loaded trace columns
		expect(result.current.preferences).toEqual({
			columns: [{ name: 'local-trace-column' }],
		});
		expect(setReSync).not.toHaveBeenCalled(); // Should not call setReSync when reSync is false
	});

	it('should call setReSync when reSync is true', async () => {
		const setReSync = jest.fn();

		// Test that the hook calls setReSync(false) when reSync is true
		// We'll unmount quickly to avoid the infinite loop
		const { unmount } = renderHook(() =>
			usePreferenceLoader({
				dataSource: DataSource.LOGS,
				reSync: true,
				setReSync,
			}),
		);
		// Wait for the effect to run
		await waitFor(() => {
			expect(setReSync).toHaveBeenCalled();
		});

		// Unmount to stop the effect
		unmount();

		// Should have called setReSync(false) to reset the reSync flag
		expect(setReSync).toHaveBeenCalledWith(false);
	});

	it('should handle errors during loading', async () => {
		// Mock an error in the loader using jest.spyOn
		const localSpy = jest.spyOn(logsLoaderConfig, 'local');
		localSpy.mockRejectedValueOnce(new Error('Loading failed'));

		const setReSync = jest.fn();
		const { result } = renderHook(() =>
			usePreferenceLoader({
				dataSource: DataSource.LOGS,
				reSync: false,
				setReSync,
			}),
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
