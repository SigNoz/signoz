/* eslint-disable import/first */
// eslint-disable-next-line import/order
import setupCommonMocks from '../../commonMocks';

setupCommonMocks();

import { fireEvent, render, screen } from '@testing-library/react';
import PodDetails from 'container/InfraMonitoringK8s/Pods/PodDetails/PodDetails';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

const queryClient = new QueryClient();

describe('PodDetails', () => {
	const mockPod = {
		podName: 'test-pod',
		meta: {
			k8s_cluster_name: 'test-cluster',
			k8s_namespace_name: 'test-namespace',
			k8s_node_name: 'test-node',
		},
	} as any;
	const mockOnClose = jest.fn();

	it('should render modal with relevant metadata', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<PodDetails pod={mockPod} isModalTimeSelection onClose={mockOnClose} />
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

		const clusterNameElements = screen.getAllByText('test-cluster');
		expect(clusterNameElements.length).toBeGreaterThan(0);
		expect(clusterNameElements[0]).toBeInTheDocument();

		const namespaceNameElements = screen.getAllByText('test-namespace');
		expect(namespaceNameElements.length).toBeGreaterThan(0);
		expect(namespaceNameElements[0]).toBeInTheDocument();

		const nodeNameElements = screen.getAllByText('test-node');
		expect(nodeNameElements.length).toBeGreaterThan(0);
		expect(nodeNameElements[0]).toBeInTheDocument();
	});

	it('should render modal with 4 tabs', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<PodDetails pod={mockPod} isModalTimeSelection onClose={mockOnClose} />
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
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
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<PodDetails pod={mockPod} isModalTimeSelection onClose={mockOnClose} />
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

		const metricsTab = screen.getByRole('radio', { name: 'Metrics' });
		expect(metricsTab).toBeChecked();
	});

	it('should switch to events tab when events tab is clicked', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<PodDetails pod={mockPod} isModalTimeSelection onClose={mockOnClose} />
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

		const eventsTab = screen.getByRole('radio', { name: 'Events' });
		expect(eventsTab).not.toBeChecked();
		fireEvent.click(eventsTab);
		expect(eventsTab).toBeChecked();
	});

	it('should close modal when close button is clicked', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<PodDetails pod={mockPod} isModalTimeSelection onClose={mockOnClose} />
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

		const closeButton = screen.getByRole('button', { name: 'Close' });
		fireEvent.click(closeButton);
		expect(mockOnClose).toHaveBeenCalled();
	});
});
