import setupCommonMocks from './commonMocks';

setupCommonMocks();

import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import K8sHeader from 'container/InfraMonitoringK8s/K8sHeader';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';

import { INFRA_MONITORING_K8S_PARAMS_KEYS, K8sCategory } from '../constants';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

describe('K8sHeader URL Parameter Parsing', () => {
	const defaultProps = {
		selectedGroupBy: [],
		groupByOptions: [],
		isLoadingGroupByFilters: false,
		handleFiltersChange: jest.fn(),
		handleGroupByChange: jest.fn(),
		defaultAddedColumns: [],
		handleFilterVisibilityChange: jest.fn(),
		isFiltersVisible: true,
		entity: K8sCategory.PODS,
		showAutoRefresh: true,
	};

	const renderComponent = (
		searchParams?: string | Record<string, string>,
	): ReturnType<typeof render> => {
		const Wrapper = withNuqsTestingAdapter({ searchParams: searchParams ?? {} });
		return render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<MemoryRouter>
						<K8sHeader {...defaultProps} />
					</MemoryRouter>
				</QueryClientProvider>
			</Wrapper>,
		);
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render without crashing when no URL params', () => {
		expect(() => renderComponent()).not.toThrow();
		expect(screen.getByText('Group by')).toBeInTheDocument();
	});

	it('should render without crashing with valid filters in URL', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { key: 'k8s_namespace_name' },
					op: '=',
					value: 'kube-system',
				},
			],
			op: 'AND',
		};

		expect(() =>
			renderComponent({
				[INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS]: JSON.stringify(filters),
			}),
		).not.toThrow();
	});

	it('should render without crashing with malformed filters JSON', () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		expect(() =>
			renderComponent({
				[INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS]: 'invalid-json',
			}),
		).not.toThrow();

		consoleSpy.mockRestore();
	});

	it('should handle filters with K8s container image values', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { key: 'k8s_container_image' },
					op: '=',
					value: 'registry.k8s.io/coredns/coredns:v1.10.1',
				},
			],
			op: 'AND',
		};

		expect(() =>
			renderComponent({
				[INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS]: JSON.stringify(filters),
			}),
		).not.toThrow();
	});

	it('should handle filters with percent signs in values', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { key: 'k8s_label' },
					op: '=',
					value: 'cpu-usage-50%',
				},
			],
			op: 'AND',
		};

		expect(() =>
			renderComponent({
				[INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS]: JSON.stringify(filters),
			}),
		).not.toThrow();
	});
});
