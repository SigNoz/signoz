import setupCommonMocks from '../../commonMocks';

setupCommonMocks();

import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import StatefulSetDetails from 'container/InfraMonitoringK8s/StatefulSets/StatefulSetDetails/StatefulSetDetails';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { userEvent } from 'tests/test-utils';

const queryClient = new QueryClient();

const Wrapper = withNuqsTestingAdapter({ searchParams: {} });

describe('StatefulSetDetails', () => {
	const mockStatefulSet = {
		meta: {
			k8s_namespace_name: 'test-namespace',
			k8s_statefulset_name: 'test-stateful-set',
		},
	} as any;
	const mockOnClose = jest.fn();

	it('should render modal with relevant metadata', () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<MemoryRouter>
						<StatefulSetDetails
							statefulSet={mockStatefulSet}
							isModalTimeSelection
							onClose={mockOnClose}
						/>
					</MemoryRouter>
				</QueryClientProvider>
			</Wrapper>,
		);

		const statefulSetNameElements = screen.getAllByText('test-stateful-set');
		expect(statefulSetNameElements.length).toBeGreaterThan(0);
		expect(statefulSetNameElements[0]).toBeInTheDocument();

		const namespaceNameElements = screen.getAllByText('test-namespace');
		expect(namespaceNameElements.length).toBeGreaterThan(0);
		expect(namespaceNameElements[0]).toBeInTheDocument();
	});

	it('should render modal with 4 tabs', () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<MemoryRouter>
						<StatefulSetDetails
							statefulSet={mockStatefulSet}
							isModalTimeSelection
							onClose={mockOnClose}
						/>
					</MemoryRouter>
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
					<MemoryRouter>
						<StatefulSetDetails
							statefulSet={mockStatefulSet}
							isModalTimeSelection
							onClose={mockOnClose}
						/>
					</MemoryRouter>
				</QueryClientProvider>
			</Wrapper>,
		);

		const metricsTab = screen.getByRole('radio', { name: 'Metrics' });
		expect(metricsTab).toBeChecked();
	});

	it('should switch to events tab when events tab is clicked', async () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<MemoryRouter>
						<StatefulSetDetails
							statefulSet={mockStatefulSet}
							isModalTimeSelection
							onClose={mockOnClose}
						/>
					</MemoryRouter>
				</QueryClientProvider>
			</Wrapper>,
		);

		const eventsTab = screen.getByRole('radio', { name: 'Events' });
		expect(eventsTab).not.toBeChecked();
		await userEvent.click(eventsTab, { pointerEventsCheck: 0 });
		expect(eventsTab).toBeChecked();
	});

	it('should close modal when close button is clicked', async () => {
		render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<MemoryRouter>
						<StatefulSetDetails
							statefulSet={mockStatefulSet}
							isModalTimeSelection
							onClose={mockOnClose}
						/>
					</MemoryRouter>
				</QueryClientProvider>
			</Wrapper>,
		);

		const closeButton = screen.getByRole('button', { name: 'Close' });
		await userEvent.click(closeButton);
		expect(mockOnClose).toHaveBeenCalled();
	});
});
