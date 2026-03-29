import setupCommonMocks from '../commonMocks';

setupCommonMocks();

import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import { FeatureKeys } from 'constants/features';
import K8sVolumesList from 'container/InfraMonitoringK8s/Volumes/K8sVolumesList';
import { rest, server } from 'mocks-server/server';
import { IAppContext, IUser } from 'providers/App/types';
import store from 'store';
import { LicenseResModel } from 'types/api/licensesV3/getActive';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			cacheTime: 0,
		},
	},
});

const SERVER_URL = 'http://localhost/api';

describe('K8sVolumesList - useGetAggregateKeys Category Regression', () => {
	let requestsMade: Array<{
		url: string;
		params: URLSearchParams;
		body?: any;
	}> = [];

	beforeEach(() => {
		requestsMade = [];
		queryClient.clear();

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
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<K8sVolumesList
							isFiltersVisible={false}
							handleFilterVisibilityChange={jest.fn()}
							quickFiltersLastUpdated={-1}
						/>
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

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

		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<K8sVolumesList
							isFiltersVisible={false}
							handleFilterVisibilityChange={jest.fn()}
							quickFiltersLastUpdated={-1}
						/>
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

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
