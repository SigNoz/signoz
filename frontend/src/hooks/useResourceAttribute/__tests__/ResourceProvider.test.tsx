import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Router } from 'react-router-dom';
import { act, renderHook, waitFor } from '@testing-library/react';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { createMemoryHistory, MemoryHistory } from 'history';
import { encode } from 'js-base64';
import { AppContext } from 'providers/App/App';
import { IAppContext } from 'providers/App/types';
import { getAppContextMock } from 'tests/test-utils';

import ResourceProvider from '../ResourceProvider';
import useResourceAttribute from '../useResourceAttribute';

const mockSafeNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: {
			search: '',
			pathname: '/',
		},
	},
}));

jest.mock('api/metrics/getResourceAttributes', () => ({
	getResourceAttributesTagKeys: jest.fn(),
	getResourceAttributesTagValues: jest.fn(),
}));

// eslint-disable-next-line import/first, import/order
import {
	getResourceAttributesTagKeys,
	getResourceAttributesTagValues,
	// eslint-disable-next-line import/newline-after-import
} from 'api/metrics/getResourceAttributes';
// eslint-disable-next-line import/first, import/order
import history from 'lib/history';

const mockTagKeys = getResourceAttributesTagKeys as jest.MockedFunction<
	typeof getResourceAttributesTagKeys
>;
const mockTagValues = getResourceAttributesTagValues as jest.MockedFunction<
	typeof getResourceAttributesTagValues
>;

function createWrapper({
	routerHistory,
	appContextOverrides,
}: {
	routerHistory: MemoryHistory;
	appContextOverrides?: Partial<IAppContext>;
}): ({ children }: { children: ReactNode }) => JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>
				<AppContext.Provider
					value={getAppContextMock('ADMIN', appContextOverrides)}
				>
					<Router history={routerHistory}>
						<ResourceProvider>{children}</ResourceProvider>
					</Router>
				</AppContext.Provider>
			</QueryClientProvider>
		);
	};
}

function mockLibHistory(search = '', pathname = '/'): void {
	(history.location as { search: string; pathname: string }).search = search;
	(history.location as { search: string; pathname: string }).pathname = pathname;
}

type TagKeysPayload = Parameters<typeof mockTagKeys.mockResolvedValue>[0];
type TagValuesPayload = Parameters<typeof mockTagValues.mockResolvedValue>[0];

function successTagKeysPayload(keys: string[]): TagKeysPayload {
	return {
		statusCode: 200,
		error: null,
		message: 'ok',
		payload: {
			data: {
				attributeKeys: keys.map((key) => ({
					key,
					dataType: 'string',
					type: 'resource',
					isColumn: false,
				})),
			},
		},
	} as unknown as TagKeysPayload;
}

function successTagValuesPayload(values: string[]): TagValuesPayload {
	return {
		statusCode: 200,
		error: null,
		message: 'ok',
		payload: {
			data: {
				stringAttributeValues: values,
			},
		},
	} as unknown as TagValuesPayload;
}

describe('ResourceProvider', () => {
	beforeEach(() => {
		mockSafeNavigate.mockReset();
		mockTagKeys.mockReset();
		mockTagValues.mockReset();
		mockLibHistory('', '/');
	});

	describe('initial state', () => {
		it('starts loading with empty staging, selectedQuery, and queries', () => {
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
			mockLibHistory(`?resourceAttribute=${encode(JSON.stringify(seeded))}`, '/');

			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
			});

			expect(result.current.queries).toStrictEqual(seeded);
		});
	});

	describe('state-machine transitions via handleFocus / handleChange', () => {
		it('Idle → TagKey fetches tag keys and populates options', async () => {
			mockTagKeys.mockResolvedValue(
				successTagKeysPayload(['resource_service_name']),
			);
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
			});

			act(() => {
				result.current.handleFocus();
			});

			await waitFor(() => {
				expect(mockTagKeys).toHaveBeenCalledTimes(1);
				expect(result.current.loading).toBe(false);
				expect(result.current.optionsData.options).toStrictEqual([
					{ label: 'service.name', value: 'resource_service_name' },
				]);
			});
		});

		it('TagKey → Operator sets OperatorSchema on handleChange (no mode)', async () => {
			mockTagKeys.mockResolvedValue(
				successTagKeysPayload(['resource_service_name']),
			);
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
			mockTagKeys.mockResolvedValue(
				successTagKeysPayload(['resource_service_name']),
			);
			mockTagValues.mockResolvedValue(
				successTagValuesPayload(['frontend', 'backend']),
			);
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
				expect(mockTagValues).toHaveBeenCalledWith(
					expect.objectContaining({ tagKey: 'resource_service_name' }),
				);
				expect(result.current.optionsData.mode).toBe('multiple');
				expect(result.current.optionsData.options).toStrictEqual([
					{ label: 'frontend', value: 'frontend' },
					{ label: 'backend', value: 'backend' },
				]);
			});
		});

		it('handleChange with mode updates selectedQuery instead of staging', async () => {
			mockTagKeys.mockResolvedValue(
				successTagKeysPayload(['resource_service_name']),
			);
			mockTagValues.mockResolvedValue(successTagValuesPayload(['frontend']));
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
			mockTagKeys.mockResolvedValue(
				successTagKeysPayload(['resource_service_name']),
			);
			mockTagValues.mockResolvedValue(successTagValuesPayload(['frontend']));
			const routerHistory = createMemoryHistory({ initialEntries: ['/svc'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
			mockTagKeys.mockResolvedValue(
				successTagKeysPayload(['resource_service_name']),
			);
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
			mockLibHistory(`?resourceAttribute=${encode(JSON.stringify(seeded))}`, '/');

			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
			mockLibHistory(`?resourceAttribute=${encode(JSON.stringify(seeded))}`, '/');

			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
		it('adds an environment query when envs are provided', async () => {
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
			});

			act(() => {
				result.current.handleEnvironmentChange(['production']);
			});

			await waitFor(() => {
				expect(result.current.queries).toHaveLength(1);
				expect(result.current.queries[0]).toMatchObject({
					tagKey: 'resource_deployment_environment',
					operator: 'IN',
					tagValue: ['production'],
				});
			});
		});

		it('clears the environment query when an empty array is passed', async () => {
			const seeded = [
				{
					id: 'env',
					tagKey: 'resource_deployment_environment',
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
			mockLibHistory(`?resourceAttribute=${encode(JSON.stringify(seeded))}`, '/');

			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
			});

			act(() => {
				result.current.handleEnvironmentChange([]);
			});

			await waitFor(() => {
				const tagKeys = result.current.queries.map((q) => q.tagKey);
				expect(tagKeys).not.toContain('resource_deployment_environment');
				expect(tagKeys).toContain('resource_service_name');
			});
		});

		it('replaces an existing environment query rather than appending', async () => {
			const seeded = [
				{
					id: 'env',
					tagKey: 'resource_deployment_environment',
					operator: 'IN',
					tagValue: ['production'],
				},
			];
			mockLibHistory(`?resourceAttribute=${encode(JSON.stringify(seeded))}`, '/');

			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
			});

			act(() => {
				result.current.handleEnvironmentChange(['staging']);
			});

			await waitFor(() => {
				const envQueries = result.current.queries.filter(
					(q) => q.tagKey === 'resource_deployment_environment',
				);
				expect(envQueries).toHaveLength(1);
				expect(envQueries[0].tagValue).toStrictEqual(['staging']);
			});
		});

		it('uses the dotted deployment env key when DOT_METRICS_ENABLED is active', async () => {
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({
					routerHistory,
					appContextOverrides: {
						featureFlags: [
							{
								name: FeatureKeys.DOT_METRICS_ENABLED,
								active: true,
								usage: 0,
								usage_limit: -1,
								route: '',
							},
						],
					},
				}),
			});

			act(() => {
				result.current.handleEnvironmentChange(['production']);
			});

			await waitFor(() => {
				expect(result.current.queries[0].tagKey).toBe(
					'resource_deployment.environment',
				);
			});
		});

		it('preserves unrelated query params when dispatching', async () => {
			const routerHistory = createMemoryHistory({
				initialEntries: ['/?tab=overview'],
			});
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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

	describe('getVisibleQueries (SERVICE_MAP filtering)', () => {
		it('filters queries down to whitelisted keys on SERVICE_MAP', () => {
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
			mockLibHistory(
				`?resourceAttribute=${encode(JSON.stringify(seeded))}`,
				ROUTES.SERVICE_MAP,
			);

			const routerHistory = createMemoryHistory({
				initialEntries: [ROUTES.SERVICE_MAP],
			});
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
			});

			expect(result.current.queries).toStrictEqual([seeded[1]]);
		});

		it('returns all queries on non-SERVICE_MAP routes', () => {
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
			mockLibHistory(
				`?resourceAttribute=${encode(JSON.stringify(seeded))}`,
				'/services',
			);

			const routerHistory = createMemoryHistory({ initialEntries: ['/services'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
			});

			expect(result.current.queries).toHaveLength(2);
		});

		it('filters fetched tag keys through whilelistedKeys on SERVICE_MAP', async () => {
			mockTagKeys.mockResolvedValue(
				successTagKeysPayload([
					'resource_service_name',
					'resource_k8s_cluster_name',
				]),
			);
			mockLibHistory('', ROUTES.SERVICE_MAP);

			const routerHistory = createMemoryHistory({
				initialEntries: [ROUTES.SERVICE_MAP],
			});
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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

			// The useEffect that re-hydrates reads from lib/history (mocked singleton)
			// but is triggered by urlQuery, which comes from the router.
			// Update both to simulate a real URL change.
			mockLibHistory(`?resourceAttribute=${encoded}`, '/');
			act(() => {
				routerHistory.push(`/?resourceAttribute=${encoded}`);
			});

			await waitFor(() => {
				expect(result.current.queries).toStrictEqual(seeded);
			});
		});

		it('clears optionsData and keeps loading=true while GetTagKeys is in flight', async () => {
			// First cycle: complete a fetch so we have non-empty options to prove clearing later.
			mockTagKeys.mockResolvedValueOnce(
				successTagKeysPayload(['resource_service_name']),
			);
			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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

			// Second cycle: pending promise — capture state while in flight.
			let resolveTagKeys: (v: TagKeysPayload) => void = (): void => {};
			const pending = new Promise<TagKeysPayload>((resolve) => {
				resolveTagKeys = resolve;
			});
			mockTagKeys.mockReturnValueOnce(
				pending as unknown as ReturnType<typeof mockTagKeys>,
			);

			act(() => {
				result.current.handleFocus();
			});

			expect(result.current.loading).toBe(true);
			expect(result.current.optionsData).toStrictEqual({
				mode: undefined,
				options: [],
			});

			// Clean up so the pending promise doesn't leak past the test.
			await act(async () => {
				resolveTagKeys(successTagKeysPayload(['resource_service_name']));
				await pending;
			});
			await waitFor(() => expect(result.current.loading).toBe(false));
		});

		it('flips loading back to false when the API returns an error payload', async () => {
			// getResourceAttributesTagKeys catches axios errors internally and
			// returns an ErrorResponse with payload null. GetTagKeys then returns [].
			// This exercises the actually-reachable API-error path.
			mockTagKeys.mockResolvedValueOnce({
				statusCode: 500,
				error: 'server error',
				message: 'boom',
				payload: null,
			} as unknown as TagKeysPayload);

			const routerHistory = createMemoryHistory({ initialEntries: ['/'] });
			const { result } = renderHook(() => useResourceAttribute(), {
				wrapper: createWrapper({ routerHistory }),
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
