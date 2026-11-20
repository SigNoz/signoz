import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { encode } from 'js-base64';
import { navigate } from 'lib/router/navigation';
import {
	fieldStringValuesResponse,
	metricFieldKeysResponse,
} from 'mocks-server/__mockdata__/fields';
import { rest, server } from 'mocks-server/server';
import { TestRouter } from 'tests/router';

import ResourceProvider from '../ResourceProvider';
import useResourceAttribute from '../useResourceAttribute';

const mockSafeNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

function createWrapper({
	initialRoute,
}: {
	initialRoute: string;
}): ({ children }: { children: ReactNode }) => JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>
				<TestRouter initialRoute={initialRoute}>
					<ResourceProvider>{children}</ResourceProvider>
				</TestRouter>
			</QueryClientProvider>
		);
	};
}

let keysRequests: URLSearchParams[];
let valuesRequests: URLSearchParams[];

function serveKeys(names: string[]): void {
	server.use(
		rest.get('*/api/v1/fields/keys', (req, res, ctx) => {
			keysRequests.push(req.url.searchParams);
			return res(ctx.status(200), ctx.json(metricFieldKeysResponse(names)));
		}),
	);
}

function serveValues(values: string[]): void {
	server.use(
		rest.get('*/api/v1/fields/values', (req, res, ctx) => {
			valuesRequests.push(req.url.searchParams);
			return res(ctx.status(200), ctx.json(fieldStringValuesResponse(values)));
		}),
	);
}

describe('ResourceProvider', () => {
	beforeEach(() => {
		mockSafeNavigate.mockReset();
		keysRequests = [];
		valuesRequests = [];
	});

	describe('initial state', () => {
		it('starts loading with empty staging, selectedQuery, and queries', () => {
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			expect(result.current.loading).toBe(true);
			expect(result.current.queries).toStrictEqual([]);
			expect(result.current.staging).toStrictEqual([]);
			expect(result.current.selectedQuery).toStrictEqual([]);
			expect(result.current.optionsData).toStrictEqual({
				mode: undefined,
				options: [],
			});
		});

		it('hydrates queries from the resourceAttribute URL param on mount', () => {
			const seeded = [
				{
					id: 'abc',
					tagKey: 'resource_service_name',
					operator: 'IN',
					tagValue: ['frontend'],
				},
			];
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({
					initialRoute: `/?resourceAttribute=${encode(JSON.stringify(seeded))}`,
				}),
			});

			expect(result.current.queries).toStrictEqual(seeded);
		});
	});

	describe('state-machine transitions via handleFocus / handleChange', () => {
		it('Idle → TagKey fetches tag keys and populates options', async () => {
			serveKeys(['resource_service_name']);
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			act(() => {
				result.current.handleFocus();
			});

			await waitFor(() => {
				expect(keysRequests).toHaveLength(1);
				expect(Object.fromEntries(keysRequests[0])).toStrictEqual({
					signal: 'metrics',
					metricName: 'signoz_calls_total',
					searchText: 'resource_',
				});
				expect(result.current.loading).toBe(false);
				expect(result.current.optionsData.options).toStrictEqual([
					{ label: 'service.name', value: 'resource_service_name' },
				]);
			});
		});

		it('TagKey → Operator sets OperatorSchema on handleChange (no mode)', async () => {
			serveKeys(['resource_service_name']);
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			act(() => {
				result.current.handleFocus();
			});
			await waitFor(() => expect(result.current.loading).toBe(false));

			act(() => {
				result.current.handleChange('resource_service_name');
			});

			expect(result.current.staging).toStrictEqual(['resource_service_name']);
			expect(result.current.optionsData.options).toStrictEqual([
				{ label: 'IN', value: 'IN' },
				{ label: 'Not IN', value: 'Not IN' },
			]);
		});

		it('Operator → TagValue fetches values using staging[0]', async () => {
			serveKeys(['resource_service_name']);
			serveValues(['frontend', 'backend']);
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			act(() => {
				result.current.handleFocus();
			});
			await waitFor(() => expect(result.current.loading).toBe(false));
			act(() => {
				result.current.handleChange('resource_service_name');
			});
			act(() => {
				result.current.handleChange('IN');
			});

			await waitFor(() => {
				expect(valuesRequests).toHaveLength(1);
				expect(Object.fromEntries(valuesRequests[0])).toStrictEqual({
					signal: 'metrics',
					metricName: 'signoz_calls_total',
					name: 'resource_service_name',
				});
				expect(result.current.optionsData.mode).toBe('multiple');
				expect(result.current.optionsData.options).toStrictEqual([
					{ label: 'frontend', value: 'frontend' },
					{ label: 'backend', value: 'backend' },
				]);
			});
		});

		it('handleChange with mode updates selectedQuery instead of staging', async () => {
			serveKeys(['resource_service_name']);
			serveValues(['frontend']);
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			act(() => {
				result.current.handleFocus();
			});
			await waitFor(() => expect(result.current.loading).toBe(false));
			act(() => {
				result.current.handleChange('resource_service_name');
			});
			act(() => {
				result.current.handleChange('IN');
			});
			await waitFor(() =>
				expect(result.current.optionsData.mode).toBe('multiple'),
			);

			act(() => {
				// In multiple mode, handleChange treats value as iterable of selected values.
				result.current.handleChange('frontend' as unknown as string);
			});

			expect(result.current.selectedQuery).toStrictEqual([
				'f',
				'r',
				'o',
				'n',
				't',
				'e',
				'n',
				'd',
			]);
			// Staging not advanced by mode-mode handleChange
			expect(result.current.staging).toStrictEqual([
				'resource_service_name',
				'IN',
			]);
		});
	});

	describe('handleBlur', () => {
		it('commits a query when TagValue staging is complete and selectedQuery non-empty', async () => {
			serveKeys(['resource_service_name']);
			serveValues(['frontend']);
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/svc' }),
			});

			act(() => {
				result.current.handleFocus();
			});
			await waitFor(() => expect(result.current.loading).toBe(false));
			act(() => result.current.handleChange('resource_service_name'));
			act(() => result.current.handleChange('IN'));
			await waitFor(() =>
				expect(result.current.optionsData.mode).toBe('multiple'),
			);
			act(() => {
				// Build selectedQuery = ['frontend']
				result.current.handleChange(['frontend'] as unknown as string);
			});

			act(() => {
				result.current.handleBlur();
			});

			await waitFor(() => {
				expect(result.current.queries).toHaveLength(1);
				expect(result.current.queries[0]).toMatchObject({
					tagKey: 'resource_service_name',
					operator: 'IN',
					tagValue: ['frontend'],
				});
				expect(result.current.staging).toStrictEqual([]);
				expect(result.current.selectedQuery).toStrictEqual([]);
				expect(mockSafeNavigate).toHaveBeenCalled();
			});
		});

		it('resets state without committing when staging is incomplete', async () => {
			serveKeys(['resource_service_name']);
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			act(() => {
				result.current.handleFocus();
			});
			await waitFor(() => expect(result.current.loading).toBe(false));
			act(() => result.current.handleChange('resource_service_name'));

			act(() => {
				result.current.handleBlur();
			});

			expect(result.current.queries).toStrictEqual([]);
			expect(result.current.staging).toStrictEqual([]);
			expect(mockSafeNavigate).not.toHaveBeenCalled();
		});
	});

	describe('handleClose / handleClearAll', () => {
		it('handleClose removes the matching query and navigates', async () => {
			const seeded = [
				{ id: 'a', tagKey: 'resource_a', operator: 'IN', tagValue: ['x'] },
				{ id: 'b', tagKey: 'resource_b', operator: 'IN', tagValue: ['y'] },
			];
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({
					initialRoute: `/?resourceAttribute=${encode(JSON.stringify(seeded))}`,
				}),
			});

			expect(result.current.queries).toHaveLength(2);

			act(() => {
				result.current.handleClose('a');
			});

			await waitFor(() => {
				expect(result.current.queries).toStrictEqual([seeded[1]]);
				expect(mockSafeNavigate).toHaveBeenCalled();
			});
		});

		it('handleClearAll wipes queries, staging, selectedQuery, options', async () => {
			const seeded = [
				{ id: 'a', tagKey: 'resource_a', operator: 'IN', tagValue: ['x'] },
			];
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({
					initialRoute: `/?resourceAttribute=${encode(JSON.stringify(seeded))}`,
				}),
			});

			act(() => {
				result.current.handleClearAll();
			});

			await waitFor(() => {
				expect(result.current.queries).toStrictEqual([]);
				expect(result.current.staging).toStrictEqual([]);
				expect(result.current.optionsData).toStrictEqual({
					mode: undefined,
					options: [],
				});
			});
		});
	});

	describe('handleEnvironmentChange', () => {
		it('adds a dotted environment query when envs are provided', async () => {
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			act(() => {
				result.current.handleEnvironmentChange(['production']);
			});

			await waitFor(() => {
				expect(result.current.queries).toHaveLength(1);
				expect(result.current.queries[0]).toMatchObject({
					tagKey: 'resource_deployment.environment',
					operator: 'IN',
					tagValue: ['production'],
				});
			});
		});

		it('clears the environment query when an empty array is passed', async () => {
			const seeded = [
				{
					id: 'env',
					tagKey: 'resource_deployment.environment',
					operator: 'IN',
					tagValue: ['production'],
				},
				{
					id: 'svc',
					tagKey: 'resource_service_name',
					operator: 'IN',
					tagValue: ['frontend'],
				},
			];
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({
					initialRoute: `/?resourceAttribute=${encode(JSON.stringify(seeded))}`,
				}),
			});

			act(() => {
				result.current.handleEnvironmentChange([]);
			});

			await waitFor(() => {
				const tagKeys = result.current.queries.map((q) => q.tagKey);
				expect(tagKeys).not.toContain('resource_deployment.environment');
				expect(tagKeys).toContain('resource_service_name');
			});
		});

		it('replaces an existing environment query rather than appending', async () => {
			const seeded = [
				{
					id: 'env',
					tagKey: 'resource_deployment.environment',
					operator: 'IN',
					tagValue: ['production'],
				},
			];
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({
					initialRoute: `/?resourceAttribute=${encode(JSON.stringify(seeded))}`,
				}),
			});

			act(() => {
				result.current.handleEnvironmentChange(['staging']);
			});

			await waitFor(() => {
				const envQueries = result.current.queries.filter(
					(q) => q.tagKey === 'resource_deployment.environment',
				);
				expect(envQueries).toHaveLength(1);
				expect(envQueries[0].tagValue).toStrictEqual(['staging']);
			});
		});

		it('preserves unrelated query params when dispatching', async () => {
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/?tab=overview' }),
			});

			act(() => {
				result.current.handleEnvironmentChange(['production']);
			});

			await waitFor(() => {
				expect(mockSafeNavigate).toHaveBeenCalled();
				const calledWith = mockSafeNavigate.mock.calls[0][0] as string;
				expect(calledWith).toContain('tab=overview');
				expect(calledWith).toContain('resourceAttribute=');
			});
		});
	});

	describe('SERVICE_MAP', () => {
		const seeded = [
			{
				id: 'a',
				tagKey: 'resource_service_name',
				operator: 'IN',
				tagValue: ['frontend'],
			},
			{
				id: 'b',
				tagKey: 'resource_k8s_cluster_name',
				operator: 'IN',
				tagValue: ['prod'],
			},
		];

		it('exposes every query from the URL, including ones the map cannot apply', () => {
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({
					initialRoute: `${ROUTES.SERVICE_MAP}?resourceAttribute=${encode(
						JSON.stringify(seeded),
					)}`,
				}),
			});

			expect(result.current.queries).toStrictEqual(seeded);
		});

		it('returns all queries on non-SERVICE_MAP routes', () => {
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({
					initialRoute: `/services?resourceAttribute=${encode(
						JSON.stringify(seeded),
					)}`,
				}),
			});

			expect(result.current.queries).toHaveLength(2);
		});

		it('filters fetched tag keys through whilelistedKeys on SERVICE_MAP', async () => {
			serveKeys(['resource_service_name', 'resource_k8s_cluster_name']);
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: ROUTES.SERVICE_MAP }),
			});

			act(() => {
				result.current.handleFocus();
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
				expect(result.current.optionsData.options).toStrictEqual([
					{
						label: 'k8s.cluster.name',
						value: 'resource_k8s_cluster_name',
					},
				]);
			});
		});
	});

	describe('URL re-hydration and in-flight loading', () => {
		it('re-hydrates queries when the router URL changes mid-session', async () => {
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			expect(result.current.queries).toStrictEqual([]);

			const seeded = [
				{
					id: 'z',
					tagKey: 'resource_service_name',
					operator: 'IN',
					tagValue: ['api'],
				},
			];
			const encoded = encode(JSON.stringify(seeded));

			// The effect that re-hydrates reads the URL through lib/router/navigation,
			// which drives the same router the tree renders in, so one navigation
			// drives both.
			act(() => {
				navigate(`/?resourceAttribute=${encoded}`);
			});

			await waitFor(() => {
				expect(result.current.queries).toStrictEqual(seeded);
			});
		});

		it('clears optionsData and keeps loading=true while GetTagKeys is in flight', async () => {
			// First cycle: complete a fetch so we have non-empty options to prove clearing later.
			serveKeys(['resource_service_name']);
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			act(() => {
				result.current.handleFocus();
			});
			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(result.current.optionsData.options).toHaveLength(1);

			// Reset step back to Idle via blur.
			act(() => {
				result.current.handleBlur();
			});
			await waitFor(() => expect(result.current.staging).toStrictEqual([]));

			// Second cycle: hold the response — capture state while in flight.
			let releaseTagKeys: () => void = (): void => {};
			const released = new Promise<void>((resolve) => {
				releaseTagKeys = resolve;
			});
			server.use(
				rest.get('*/api/v1/fields/keys', async (_req, res, ctx) => {
					await released;
					return res(
						ctx.status(200),
						ctx.json(metricFieldKeysResponse(['resource_service_name'])),
					);
				}),
			);

			act(() => {
				result.current.handleFocus();
			});

			expect(result.current.loading).toBe(true);
			expect(result.current.optionsData).toStrictEqual({
				mode: undefined,
				options: [],
			});

			// Clean up so the held request doesn't leak past the test.
			await act(async () => {
				releaseTagKeys();
			});
			await waitFor(() => expect(result.current.loading).toBe(false));
		});

		it('flips loading back to false when the keys request fails', async () => {
			// GetTagKeys catches the failed request and returns [].
			server.use(
				rest.get('*/api/v1/fields/keys', (_req, res, ctx) => res(ctx.status(500))),
			);

			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ initialRoute: '/' }),
			});

			act(() => {
				result.current.handleFocus();
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
				expect(result.current.optionsData.options).toStrictEqual([]);
			});
		});
	});
});
