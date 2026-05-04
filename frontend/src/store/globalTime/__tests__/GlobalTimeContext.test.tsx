import { act, renderHook, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import set from 'api/browser/localstorage/set';

import { GlobalTimeProvider } from '../GlobalTimeContext';
import { useGlobalTime } from '../hooks';
import { GlobalTimeProviderOptions } from '../types';
import { createCustomTimeRange, NANO_SECOND_MULTIPLIER } from '../utils';

jest.mock('api/browser/localstorage/set');

const createTestQueryClient = (): QueryClient =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const createWrapper = (
	providerProps: GlobalTimeProviderOptions,
	nuqsProps?: { searchParams?: string },
) => {
	const queryClient = createTestQueryClient();

	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>
				<NuqsTestingAdapter searchParams={nuqsProps?.searchParams}>
					<GlobalTimeProvider {...providerProps}>{children}</GlobalTimeProvider>
				</NuqsTestingAdapter>
			</QueryClientProvider>
		);
	};
};

describe('GlobalTimeProvider', () => {
	describe('name prop', () => {
		it('should pass name to store when provided', () => {
			const wrapper = createWrapper({ name: 'test-drawer' });

			const { result } = renderHook(() => useGlobalTime((s) => s.name), {
				wrapper,
			});

			expect(result.current).toBe('test-drawer');
		});

		it('should have undefined name when not provided', () => {
			const wrapper = createWrapper({});

			const { result } = renderHook(() => useGlobalTime((s) => s.name), {
				wrapper,
			});

			expect(result.current).toBeUndefined();
		});
	});

	describe('store isolation', () => {
		it('should create isolated store for each provider', () => {
			const wrapper1 = createWrapper({ initialTime: '1h' });
			const wrapper2 = createWrapper({ initialTime: '15m' });

			const { result: result1 } = renderHook(
				() => useGlobalTime((s) => s.selectedTime),
				{ wrapper: wrapper1 },
			);
			const { result: result2 } = renderHook(
				() => useGlobalTime((s) => s.selectedTime),
				{ wrapper: wrapper2 },
			);

			expect(result1.current).toBe('1h');
			expect(result2.current).toBe('15m');
		});
	});

	describe('inheritGlobalTime', () => {
		it('should inherit time from parent store when inheritGlobalTime is true', () => {
			const queryClient = createTestQueryClient();

			const NestedWrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => (
				<QueryClientProvider client={queryClient}>
					<NuqsTestingAdapter>
						<GlobalTimeProvider initialTime="6h">
							<GlobalTimeProvider inheritGlobalTime>{children}</GlobalTimeProvider>
						</GlobalTimeProvider>
					</NuqsTestingAdapter>
				</QueryClientProvider>
			);

			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper: NestedWrapper,
			});

			// Should inherit '6h' from parent provider
			expect(result.current).toBe('6h');
		});

		it('should use initialTime when inheritGlobalTime is false', () => {
			const queryClient = createTestQueryClient();

			const NestedWrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => (
				<QueryClientProvider client={queryClient}>
					<NuqsTestingAdapter>
						<GlobalTimeProvider initialTime="6h">
							<GlobalTimeProvider inheritGlobalTime={false} initialTime="15m">
								{children}
							</GlobalTimeProvider>
						</GlobalTimeProvider>
					</NuqsTestingAdapter>
				</QueryClientProvider>
			);

			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper: NestedWrapper,
			});

			// Should use its own initialTime, not parent's
			expect(result.current).toBe('15m');
		});

		it('should prefer URL params over inheritGlobalTime when both are present', async () => {
			const queryClient = createTestQueryClient();

			const NestedWrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => (
				<QueryClientProvider client={queryClient}>
					<NuqsTestingAdapter searchParams="?relativeTime=1h">
						<GlobalTimeProvider initialTime="6h">
							<GlobalTimeProvider inheritGlobalTime enableUrlParams>
								{children}
							</GlobalTimeProvider>
						</GlobalTimeProvider>
					</NuqsTestingAdapter>
				</QueryClientProvider>
			);

			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper: NestedWrapper,
			});

			// inheritGlobalTime sets initial value to '6h', but URL sync updates it to '1h'
			await waitFor(() => {
				expect(result.current).toBe('1h');
			});
		});

		it('should use inherited time when URL params are empty', async () => {
			const queryClient = createTestQueryClient();

			const NestedWrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => (
				<QueryClientProvider client={queryClient}>
					<NuqsTestingAdapter searchParams="">
						<GlobalTimeProvider initialTime="6h">
							<GlobalTimeProvider inheritGlobalTime enableUrlParams>
								{children}
							</GlobalTimeProvider>
						</GlobalTimeProvider>
					</NuqsTestingAdapter>
				</QueryClientProvider>
			);

			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper: NestedWrapper,
			});

			// No URL params, should keep inherited value
			expect(result.current).toBe('6h');
		});

		it('should prefer custom time URL params over inheritGlobalTime', async () => {
			const queryClient = createTestQueryClient();
			const startTime = 1700000000000;
			const endTime = 1700003600000;

			const NestedWrapper = ({
				children,
			}: {
				children: React.ReactNode;
			}): JSX.Element => (
				<QueryClientProvider client={queryClient}>
					<NuqsTestingAdapter
						searchParams={`?startTime=${startTime}&endTime=${endTime}`}
					>
						<GlobalTimeProvider initialTime="6h">
							<GlobalTimeProvider inheritGlobalTime enableUrlParams>
								{children}
							</GlobalTimeProvider>
						</GlobalTimeProvider>
					</NuqsTestingAdapter>
				</QueryClientProvider>
			);

			const { result } = renderHook(() => useGlobalTime(), {
				wrapper: NestedWrapper,
			});

			// URL custom time params should override inherited time
			await waitFor(() => {
				const { minTime, maxTime } = result.current.getMinMaxTime();
				expect(minTime).toBe(startTime * NANO_SECOND_MULTIPLIER);
				expect(maxTime).toBe(endTime * NANO_SECOND_MULTIPLIER);
			});
		});
	});

	describe('URL sync', () => {
		it('should read relativeTime from URL on mount', async () => {
			const wrapper = createWrapper(
				{ enableUrlParams: true },
				{ searchParams: '?relativeTime=1h' },
			);

			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper,
			});

			await waitFor(() => {
				expect(result.current).toBe('1h');
			});
		});

		it('should read custom time from URL on mount', async () => {
			const startTime = 1700000000000;
			const endTime = 1700003600000;
			const wrapper = createWrapper(
				{ enableUrlParams: true },
				{ searchParams: `?startTime=${startTime}&endTime=${endTime}` },
			);

			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			await waitFor(() => {
				const { minTime, maxTime } = result.current.getMinMaxTime();
				expect(minTime).toBe(startTime * NANO_SECOND_MULTIPLIER);
				expect(maxTime).toBe(endTime * NANO_SECOND_MULTIPLIER);
			});
		});

		it('should use custom URL keys when provided', async () => {
			const wrapper = createWrapper(
				{
					enableUrlParams: {
						relativeTimeKey: 'modalTime',
					},
				},
				{ searchParams: '?modalTime=3h' },
			);

			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper,
			});

			await waitFor(() => {
				expect(result.current).toBe('3h');
			});
		});

		it('should use custom startTimeKey and endTimeKey when provided', async () => {
			const startTime = 1700000000000;
			const endTime = 1700003600000;
			const wrapper = createWrapper(
				{
					enableUrlParams: {
						startTimeKey: 'customStart',
						endTimeKey: 'customEnd',
					},
				},
				{ searchParams: `?customStart=${startTime}&customEnd=${endTime}` },
			);

			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			await waitFor(() => {
				const { minTime, maxTime } = result.current.getMinMaxTime();
				expect(minTime).toBe(startTime * NANO_SECOND_MULTIPLIER);
				expect(maxTime).toBe(endTime * NANO_SECOND_MULTIPLIER);
			});
		});

		it('should NOT read from URL when enableUrlParams is false', async () => {
			const wrapper = createWrapper(
				{ enableUrlParams: false, initialTime: '15m' },
				{ searchParams: '?relativeTime=1h' },
			);

			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper,
			});

			// Should use initialTime, not URL value
			expect(result.current).toBe('15m');
		});

		it('should prefer startTime/endTime over relativeTime when both present in URL', async () => {
			const startTime = 1700000000000;
			const endTime = 1700003600000;
			const wrapper = createWrapper(
				{ enableUrlParams: true },
				{
					searchParams: `?relativeTime=15m&startTime=${startTime}&endTime=${endTime}`,
				},
			);

			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			await waitFor(() => {
				const { minTime, maxTime } = result.current.getMinMaxTime();
				// Should use startTime/endTime, not relativeTime
				expect(minTime).toBe(startTime * NANO_SECOND_MULTIPLIER);
				expect(maxTime).toBe(endTime * NANO_SECOND_MULTIPLIER);
			});
		});

		it('should use initialTime when URL has invalid time values', async () => {
			const wrapper = createWrapper(
				{ enableUrlParams: true, initialTime: '15m' },
				{ searchParams: '?startTime=invalid&endTime=also-invalid' },
			);

			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper,
			});

			// parseAsInteger returns null for invalid values, so should fallback to initialTime
			expect(result.current).toBe('15m');
		});

		it('should update store when custom time is set from URL with only startTime and endTime', async () => {
			const startTime = 1700000000000;
			const endTime = 1700003600000;
			const wrapper = createWrapper(
				{ enableUrlParams: true },
				{ searchParams: `?startTime=${startTime}&endTime=${endTime}` },
			);

			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			await waitFor(() => {
				// Verify selectedTime is a custom time range string
				expect(result.current.selectedTime).toContain('||_||');
			});
		});

		describe('removeQueryParamsOnUnmount', () => {
			const createUnmountTestWrapper = (
				getQueryString: () => string,
				setQueryString: (qs: string) => void,
			) => {
				return function TestWrapper({
					children,
				}: {
					children: React.ReactNode;
				}): JSX.Element {
					const queryClient = createTestQueryClient();
					return (
						<QueryClientProvider client={queryClient}>
							<NuqsTestingAdapter
								searchParams={getQueryString()}
								onUrlUpdate={(event): void => {
									setQueryString(event.queryString);
								}}
							>
								{children}
							</NuqsTestingAdapter>
						</QueryClientProvider>
					);
				};
			};

			it('should remove URL params when provider unmounts with removeQueryParamsOnUnmount=true', async () => {
				let currentQueryString = 'relativeTime=1h';
				const TestWrapper = createUnmountTestWrapper(
					() => currentQueryString,
					(qs) => {
						currentQueryString = qs;
					},
				);

				const { unmount } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
					wrapper: ({ children }) => (
						<TestWrapper>
							<GlobalTimeProvider enableUrlParams removeQueryParamsOnUnmount>
								{children}
							</GlobalTimeProvider>
						</TestWrapper>
					),
				});

				// Verify initial URL params are present
				expect(currentQueryString).toContain('relativeTime=1h');

				// Unmount the provider
				unmount();

				// URL params should be removed
				await waitFor(() => {
					expect(currentQueryString).not.toContain('relativeTime');
					expect(currentQueryString).not.toContain('startTime');
					expect(currentQueryString).not.toContain('endTime');
				});
			});

			it('should NOT remove URL params when provider unmounts with removeQueryParamsOnUnmount=false', async () => {
				let currentQueryString = 'relativeTime=1h';
				const TestWrapper = createUnmountTestWrapper(
					() => currentQueryString,
					(qs) => {
						currentQueryString = qs;
					},
				);

				const { unmount } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
					wrapper: ({ children }) => (
						<TestWrapper>
							<GlobalTimeProvider enableUrlParams removeQueryParamsOnUnmount={false}>
								{children}
							</GlobalTimeProvider>
						</TestWrapper>
					),
				});

				// Verify initial URL params are present
				expect(currentQueryString).toContain('relativeTime=1h');

				// Unmount the provider
				unmount();

				// Wait a tick to ensure cleanup effects would have run
				await waitFor(() => {
					// URL params should still be present
					expect(currentQueryString).toContain('relativeTime=1h');
				});
			});

			it('should remove custom time URL params on unmount', async () => {
				const startTime = 1700000000000;
				const endTime = 1700003600000;
				let currentQueryString = `startTime=${startTime}&endTime=${endTime}`;
				const TestWrapper = createUnmountTestWrapper(
					() => currentQueryString,
					(qs) => {
						currentQueryString = qs;
					},
				);

				const { unmount } = renderHook(() => useGlobalTime(), {
					wrapper: ({ children }) => (
						<TestWrapper>
							<GlobalTimeProvider enableUrlParams removeQueryParamsOnUnmount>
								{children}
							</GlobalTimeProvider>
						</TestWrapper>
					),
				});

				// Verify initial URL params are present
				expect(currentQueryString).toContain('startTime');
				expect(currentQueryString).toContain('endTime');

				// Unmount the provider
				unmount();

				// URL params should be removed
				await waitFor(() => {
					expect(currentQueryString).not.toContain('startTime');
					expect(currentQueryString).not.toContain('endTime');
				});
			});

			it('should remove custom URL key params on unmount', async () => {
				let currentQueryString = 'modalTime=3h';
				const TestWrapper = createUnmountTestWrapper(
					() => currentQueryString,
					(qs) => {
						currentQueryString = qs;
					},
				);

				const { unmount } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
					wrapper: ({ children }) => (
						<TestWrapper>
							<GlobalTimeProvider
								enableUrlParams={{
									relativeTimeKey: 'modalTime',
								}}
								removeQueryParamsOnUnmount
							>
								{children}
							</GlobalTimeProvider>
						</TestWrapper>
					),
				});

				// Verify initial URL params are present
				expect(currentQueryString).toContain('modalTime=3h');

				// Unmount the provider
				unmount();

				// URL params should be removed
				await waitFor(() => {
					expect(currentQueryString).not.toContain('modalTime');
				});
			});

			it('should NOT remove URL params when enableUrlParams is false', async () => {
				let currentQueryString = 'relativeTime=1h';
				const TestWrapper = createUnmountTestWrapper(
					() => currentQueryString,
					(qs) => {
						currentQueryString = qs;
					},
				);

				const { unmount } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
					wrapper: ({ children }) => (
						<TestWrapper>
							<GlobalTimeProvider enableUrlParams={false} removeQueryParamsOnUnmount>
								{children}
							</GlobalTimeProvider>
						</TestWrapper>
					),
				});

				// Verify initial URL params are present
				expect(currentQueryString).toContain('relativeTime=1h');

				// Unmount the provider
				unmount();

				// Wait a tick
				await waitFor(() => {
					// URL params should still be present (enableUrlParams is false)
					expect(currentQueryString).toContain('relativeTime=1h');
				});
			});
		});
	});

	describe('localStorage persistence', () => {
		const mockSet = set as jest.MockedFunction<typeof set>;

		beforeEach(() => {
			localStorage.clear();
			mockSet.mockClear();
			mockSet.mockReturnValue(true);
		});

		it('should read from localStorage on mount', () => {
			localStorage.setItem('test-time-key', '6h');

			const wrapper = createWrapper({ localStoragePersistKey: 'test-time-key' });
			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper,
			});

			expect(result.current).toBe('6h');
		});

		it('should write to localStorage on selectedTime change', async () => {
			const wrapper = createWrapper({
				localStoragePersistKey: 'test-persist-key',
			});
			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			mockSet.mockClear();

			act(() => {
				result.current.setSelectedTime('12h');
			});

			await waitFor(() => {
				expect(mockSet).toHaveBeenCalledWith('test-persist-key', '12h');
			});
		});

		it('should NOT write to localStorage when persistKey is undefined', async () => {
			const wrapper = createWrapper({ initialTime: '15m' });
			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			mockSet.mockClear();

			act(() => {
				result.current.setSelectedTime('1h');
			});

			// Wait a tick to ensure any async operations complete
			await waitFor(() => {
				expect(result.current.selectedTime).toBe('1h');
			});

			expect(mockSet).not.toHaveBeenCalled();
		});

		it('should only write to localStorage when selectedTime changes, not other state', async () => {
			const wrapper = createWrapper({
				localStoragePersistKey: 'test-key',
				initialTime: '15m',
			});
			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			mockSet.mockClear();

			// Change refreshInterval (not selectedTime)
			act(() => {
				result.current.setRefreshInterval(5000);
			});

			// Wait to ensure subscription handler had a chance to run
			await waitFor(() => {
				expect(result.current.refreshInterval).toBe(5000);
			});

			// Should NOT have written to localStorage for refreshInterval change
			expect(mockSet).not.toHaveBeenCalled();

			// Now change selectedTime
			act(() => {
				result.current.setSelectedTime('1h');
			});

			await waitFor(() => {
				expect(mockSet).toHaveBeenCalledWith('test-key', '1h');
			});
		});

		it('should fallback to initialTime when localStorage contains empty string', () => {
			localStorage.setItem('test-key', '');

			const wrapper = createWrapper({
				localStoragePersistKey: 'test-key',
				initialTime: '15m',
			});
			const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
				wrapper,
			});

			// Empty string is falsy, should use initialTime
			expect(result.current).toBe('15m');
		});

		it('should write custom time range to localStorage', async () => {
			const wrapper = createWrapper({
				localStoragePersistKey: 'test-custom-key',
				initialTime: '15m',
			});
			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			mockSet.mockClear();

			const customTime = createCustomTimeRange(1000000000, 2000000000);
			act(() => {
				result.current.setSelectedTime(customTime);
			});

			await waitFor(() => {
				expect(mockSet).toHaveBeenCalledWith('test-custom-key', customTime);
			});
		});
	});

	describe('refreshInterval', () => {
		it('should initialize with provided refreshInterval', () => {
			const wrapper = createWrapper({ refreshInterval: 5000 });
			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			expect(result.current.refreshInterval).toBe(5000);
			expect(result.current.isRefreshEnabled).toBe(true);
		});
	});
});
