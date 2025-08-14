/* eslint-disable import/first */
// eslint-disable-next-line import/order
import setupCommonMocks from '../../commonMocks';

setupCommonMocks();

import { fireEvent, render, screen } from '@testing-library/react';
import JobDetails from 'container/InfraMonitoringK8s/Jobs/JobDetails/JobDetails';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

const queryClient = new QueryClient();

describe('JobDetails', () => {
	const mockJob = {
		meta: {
			k8s_job_name: 'test-job',
			k8s_namespace_name: 'test-namespace',
		},
	} as any;
	const mockOnClose = jest.fn();

	it('should render modal with relevant metadata', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<JobDetails job={mockJob} isModalTimeSelection onClose={mockOnClose} />
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

		const jobNameElements = screen.getAllByText('test-job');
		expect(jobNameElements.length).toBeGreaterThan(0);
		expect(jobNameElements[0]).toBeInTheDocument();

		const namespaceNameElements = screen.getAllByText('test-namespace');
		expect(namespaceNameElements.length).toBeGreaterThan(0);
		expect(namespaceNameElements[0]).toBeInTheDocument();
	});

	it('should render modal with 4 tabs', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<JobDetails job={mockJob} isModalTimeSelection onClose={mockOnClose} />
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
						<JobDetails job={mockJob} isModalTimeSelection onClose={mockOnClose} />
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
						<JobDetails job={mockJob} isModalTimeSelection onClose={mockOnClose} />
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
						<JobDetails job={mockJob} isModalTimeSelection onClose={mockOnClose} />
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

		const closeButton = screen.getByRole('button', { name: 'Close' });
		fireEvent.click(closeButton);
		expect(mockOnClose).toHaveBeenCalled();
	});
});
