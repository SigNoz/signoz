import setupCommonMocks from '../../commonMocks';

setupCommonMocks();

import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import ClusterDetails from 'container/InfraMonitoringK8s/Clusters/ClusterDetails/ClusterDetails';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import store from 'store';

const queryClient = new QueryClient();

const Wrapper = withNuqsTestingAdapter({ searchParams: {} });

describe('ClusterDetails', () => {
	const mockCluster = {
		meta: {
			k8s_cluster_name: 'test-cluster',
		},
	} as any;
	const mockOnClose = jest.fn();

	it('should render modal with relevant metadata', () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<MemoryRouter>
							<ClusterDetails
								cluster={mockCluster}
								isModalTimeSelection
								onClose={mockOnClose}
							/>
						</MemoryRouter>
					</Provider>
				</QueryClientProvider>
			</Wrapper>,
		);

		const clusterNameElements = screen.getAllByText('test-cluster');
		expect(clusterNameElements.length).toBeGreaterThan(0);
		expect(clusterNameElements[0]).toBeInTheDocument();
	});

	it('should render modal with 4 tabs', () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<MemoryRouter>
							<ClusterDetails
								cluster={mockCluster}
								isModalTimeSelection
								onClose={mockOnClose}
							/>
						</MemoryRouter>
					</Provider>
				</QueryClientProvider>
			</Wrapper>,
		);

		const metricsTab = screen.getByText('Metrics');
		expect(metricsTab).toBeInTheDocument();

		const eventsTab = screen.getByText('Events');
		expect(eventsTab).toBeInTheDocument();

		const logsTab = screen.getByText('Logs');
		expect(logsTab).toBeInTheDocument();

		const tracesTab = screen.getByText('Traces');
		expect(tracesTab).toBeInTheDocument();
	});

	it('default tab should be metrics', () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<MemoryRouter>
							<ClusterDetails
								cluster={mockCluster}
								isModalTimeSelection
								onClose={mockOnClose}
							/>
						</MemoryRouter>
					</Provider>
				</QueryClientProvider>
			</Wrapper>,
		);

		const metricsTab = screen.getByRole('radio', { name: 'Metrics' });
		expect(metricsTab).toBeChecked();
	});

	it('should switch to events tab when events tab is clicked', () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<MemoryRouter>
							<ClusterDetails
								cluster={mockCluster}
								isModalTimeSelection
								onClose={mockOnClose}
							/>
						</MemoryRouter>
					</Provider>
				</QueryClientProvider>
			</Wrapper>,
		);

		const eventsTab = screen.getByRole('radio', { name: 'Events' });
		expect(eventsTab).not.toBeChecked();
		fireEvent.click(eventsTab);
		expect(eventsTab).toBeChecked();
	});

	it('should close modal when close button is clicked', () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<Provider store={store}>
						<MemoryRouter>
							<ClusterDetails
								cluster={mockCluster}
								isModalTimeSelection
								onClose={mockOnClose}
							/>
						</MemoryRouter>
					</Provider>
				</QueryClientProvider>
			</Wrapper>,
		);

		const closeButton = screen.getByRole('button', { name: 'Close' });
		fireEvent.click(closeButton);
		expect(mockOnClose).toHaveBeenCalled();
	});
});
