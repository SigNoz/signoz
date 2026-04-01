import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { MemoryRouter } from 'react-router-dom-v5-compat';
import { FeatureKeys } from 'constants/features';
import K8sVolumesList from 'container/InfraMonitoringK8s/Volumes/K8sVolumesList';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { IAppContext, IUser } from 'providers/App/types';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
// eslint-disable-next-line no-restricted-imports
import { applyMiddleware, legacy_createStore as createStore } from 'redux';
import thunk from 'redux-thunk';
import reducers from 'store/reducers';
import { act, render, screen, userEvent, waitFor } from 'tests/test-utils';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { LicenseResModel } from 'types/api/licensesV3/getActive';

import { INFRA_MONITORING_K8S_PARAMS_KEYS } from '../../constants';

const SERVER_URL = 'http://localhost/api';

// jsdom does not implement IntersectionObserver — provide a no-op stub
const mockObserver = {
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
};
global.IntersectionObserver = jest
	.fn()
	.mockImplementation(() => mockObserver) as any;

const mockVolume = {
	persistentVolumeClaimName: 'test-pvc',
	volumeAvailable: 1000000,
	volumeCapacity: 5000000,
	volumeInodes: 100,
	volumeInodesFree: 50,
	volumeInodesUsed: 50,
	volumeUsage: 4000000,
	meta: {
		k8s_cluster_name: 'test-cluster',
		k8s_namespace_name: 'test-namespace',
		k8s_node_name: 'test-node',
		k8s_persistentvolumeclaim_name: 'test-pvc',
		k8s_pod_name: 'test-pod',
		k8s_pod_uid: 'test-pod-uid',
		k8s_statefulset_name: '',
	},
};

const mockVolumesResponse = {
	status: 'success',
	data: {
		type: '',
		records: [mockVolume],
		groups: null,
		total: 1,
		sentAnyHostMetricsData: false,
		isSendingK8SAgentMetrics: false,
	},
};

/** Renders K8sVolumesList with a real Redux store so dispatched actions affect state. */
function renderWithRealStore(
	initialEntries?: Record<string, any>,
): { testStore: ReturnType<typeof createStore> } {
	const testStore = createStore(reducers, applyMiddleware(thunk as any));
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	render(
		<NuqsTestingAdapter searchParams={initialEntries}>
			<QueryClientProvider client={queryClient}>
				<QueryBuilderProvider>
					<MemoryRouter>
						<K8sVolumesList
							isFiltersVisible={false}
							handleFilterVisibilityChange={jest.fn()}
							quickFiltersLastUpdated={-1}
						/>
					</MemoryRouter>
				</QueryBuilderProvider>
			</QueryClientProvider>
		</NuqsTestingAdapter>,
	);

	return { testStore };
}

describe('K8sVolumesList - useGetAggregateKeys Category Regression', () => {
	let requestsMade: Array<{
		url: string;
		params: URLSearchParams;
		body?: any;
	}> = [];

	beforeEach(() => {
		requestsMade = [];

		server.use(
			rest.get(`${SERVER_URL}/v3/autocomplete/attribute_keys`, (req, res, ctx) => {
				const url = req.url.toString();
				const params = req.url.searchParams;

				requestsMade.push({
					url,
					params,
				});

				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							attributeKeys: [],
						},
					}),
				);
			}),
			rest.post(`${SERVER_URL}/v1/pvcs/list`, (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							type: 'list',
							records: [],
							groups: null,
							total: 0,
							sentAnyHostMetricsData: false,
							isSendingK8SAgentMetrics: false,
						},
					}),
				),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('should call aggregate keys API with k8s_volume_capacity', async () => {
		renderWithRealStore();

		await waitFor(() => {
			expect(requestsMade.length).toBeGreaterThan(0);
		});

		// Find the attribute_keys request
		const attributeKeysRequest = requestsMade.find((req) =>
			req.url.includes('/autocomplete/attribute_keys'),
		);

		expect(attributeKeysRequest).toBeDefined();

		const aggregateAttribute = attributeKeysRequest?.params.get(
			'aggregateAttribute',
		);

		expect(aggregateAttribute).toBe('k8s_volume_capacity');
	});

	it('should call aggregate keys API with k8s.volume.capacity when dotMetrics enabled', async () => {
		jest
			.spyOn(await import('providers/App/App'), 'useAppContext')
			.mockReturnValue({
				featureFlags: [
					{
						name: FeatureKeys.DOT_METRICS_ENABLED,
						active: true,
						usage: 0,
						usage_limit: 0,
						route: '',
					},
				],
				user: { role: 'ADMIN' } as IUser,
				activeLicense: (null as unknown) as LicenseResModel,
			} as IAppContext);

		renderWithRealStore();

		await waitFor(() => {
			expect(requestsMade.length).toBeGreaterThan(0);
		});

		const attributeKeysRequest = requestsMade.find((req) =>
			req.url.includes('/autocomplete/attribute_keys'),
		);

		expect(attributeKeysRequest).toBeDefined();

		const aggregateAttribute = attributeKeysRequest?.params.get(
			'aggregateAttribute',
		);

		expect(aggregateAttribute).toBe('k8s.volume.capacity');
	});
});

describe('K8sVolumesList', () => {
	beforeEach(() => {
		server.use(
			rest.post('http://localhost/api/v1/pvcs/list', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(mockVolumesResponse)),
			),
			rest.get(
				'http://localhost/api/v3/autocomplete/attribute_keys',
				(_req, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: { attributeKeys: [] } })),
			),
		);
	});

	it('renders volume rows from API response', async () => {
		renderWithRealStore();

		await waitFor(async () => {
			const elements = await screen.findAllByText('test-pvc');

			expect(elements.length).toBeGreaterThan(0);
		});
	});

	it('opens VolumeDetails when a volume row is clicked', async () => {
		const user = userEvent.setup();
		renderWithRealStore();

		const pvcCells = await screen.findAllByText('test-pvc');
		expect(pvcCells.length).toBeGreaterThan(0);

		const row = pvcCells[0].closest('tr');
		expect(row).not.toBeNull();
		await user.click(row!);

		await waitFor(async () => {
			const cells = await screen.findAllByText('test-pvc');
			expect(cells.length).toBeGreaterThan(1);
		});
	});

	it.skip('closes VolumeDetails when the close button is clicked', async () => {
		const user = userEvent.setup();
		renderWithRealStore();

		const pvcCells = await screen.findAllByText('test-pvc');
		expect(pvcCells.length).toBeGreaterThan(0);

		const row = pvcCells[0].closest('tr');
		await user.click(row!);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: 'Close' }));

		await waitFor(() => {
			expect(
				screen.queryByRole('button', { name: 'Close' }),
			).not.toBeInTheDocument();
		});
	});

	it('does not re-fetch the volumes list when time range changes after selecting a volume', async () => {
		const user = userEvent.setup();
		let apiCallCount = 0;
		server.use(
			rest.post('http://localhost/api/v1/pvcs/list', async (_req, res, ctx) => {
				apiCallCount += 1;
				return res(ctx.status(200), ctx.json(mockVolumesResponse));
			}),
		);

		const { testStore } = renderWithRealStore();

		await waitFor(() => expect(apiCallCount).toBe(1));

		const pvcCells = await screen.findAllByText('test-pvc');
		const row = pvcCells[0].closest('tr');
		await user.click(row!);
		await waitFor(async () => {
			const cells = await screen.findAllByText('test-pvc');
			expect(cells.length).toBeGreaterThan(1);
		});

		// Wait for nuqs URL state to fully propagate to the component
		// The selectedVolumeUID is managed via nuqs (async URL state),
		// so we need to ensure the state has settled before dispatching time changes
		await act(async () => {
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
		});

		const countAfterClick = apiCallCount;

		// There's a specific component causing the min/max time to be updated
		// After the volume loads, it triggers the change again
		// And then the query to fetch data for the selected volume enters in a loop
		act(() => {
			testStore.dispatch({
				type: UPDATE_TIME_INTERVAL,
				payload: {
					minTime: Date.now() * 1000000 - 30 * 60 * 1000 * 1000000,
					maxTime: Date.now() * 1000000,
					selectedTime: '30m',
				},
			} as any);
		});

		// Allow any potential re-fetch to settle
		await new Promise((resolve) => {
			setTimeout(resolve, 500);
		});

		expect(apiCallCount).toBe(countAfterClick);
	});

	it('does not re-fetch groupedByRowData when time range changes after expanding a volume row with groupBy', async () => {
		const user = userEvent.setup();
		const groupByValue = [{ key: 'k8s_namespace_name' }];

		let groupedByRowDataCallCount = 0;
		server.use(
			rest.post('http://localhost/api/v1/pvcs/list', async (req, res, ctx) => {
				const body = await req.json();
				// Check for both underscore and dot notation keys since dotMetricsEnabled
				// may be true or false depending on test order
				const isGroupedByRowDataRequest = body.filters?.items?.some(
					(item: { key?: { key?: string }; value?: string }) =>
						(item.key?.key === 'k8s_namespace_name' ||
							item.key?.key === 'k8s.namespace.name') &&
						item.value === 'test-namespace',
				);
				if (isGroupedByRowDataRequest) {
					groupedByRowDataCallCount += 1;
				}
				return res(ctx.status(200), ctx.json(mockVolumesResponse));
			}),
			rest.get(
				'http://localhost/api/v3/autocomplete/attribute_keys',
				(_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							data: {
								attributeKeys: [{ key: 'k8s_namespace_name', dataType: 'string' }],
							},
						}),
					),
			),
		);

		const { testStore } = renderWithRealStore({
			[INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY]: JSON.stringify(groupByValue),
		});

		await waitFor(async () => {
			const elements = await screen.findAllByText('test-namespace');
			return expect(elements.length).toBeGreaterThan(0);
		});

		const row = (await screen.findAllByText('test-namespace'))[0].closest('tr');
		expect(row).not.toBeNull();
		user.click(row as HTMLElement);
		await waitFor(() => expect(groupedByRowDataCallCount).toBe(1));

		const countAfterExpand = groupedByRowDataCallCount;

		act(() => {
			testStore.dispatch({
				type: UPDATE_TIME_INTERVAL,
				payload: {
					minTime: Date.now() * 1000000 - 30 * 60 * 1000 * 1000000,
					maxTime: Date.now() * 1000000,
					selectedTime: '30m',
				},
			} as any);
		});

		// Allow any potential re-fetch to settle
		await new Promise((resolve) => {
			setTimeout(resolve, 500);
		});

		expect(groupedByRowDataCallCount).toBe(countAfterExpand);
	});
});
