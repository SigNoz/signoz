/* eslint-disable import/first */
// eslint-disable-next-line import/order
import setupCommonMocks from '../../commonMocks';

setupCommonMocks();

import { fireEvent, render, screen } from '@testing-library/react';
import VolumeDetails from 'container/InfraMonitoringK8s/Volumes/VolumeDetails/VolumeDetails';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

const queryClient = new QueryClient();

describe('VolumeDetails', () => {
	const mockVolume = {
		persistentVolumeClaimName: 'test-volume',
		meta: {
			k8s_cluster_name: 'test-cluster',
			k8s_namespace_name: 'test-namespace',
		},
	} as any;
	const mockOnClose = jest.fn();

	it('should render modal with relevant metadata', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<VolumeDetails
							volume={mockVolume}
							isModalTimeSelection
							onClose={mockOnClose}
						/>
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

		const volumeNameElements = screen.getAllByText('test-volume');
		expect(volumeNameElements.length).toBeGreaterThan(0);
		expect(volumeNameElements[0]).toBeInTheDocument();

		const clusterNameElements = screen.getAllByText('test-cluster');
		expect(clusterNameElements.length).toBeGreaterThan(0);
		expect(clusterNameElements[0]).toBeInTheDocument();

		const namespaceNameElements = screen.getAllByText('test-namespace');
		expect(namespaceNameElements.length).toBeGreaterThan(0);
		expect(namespaceNameElements[0]).toBeInTheDocument();
	});

	it('should close modal when close button is clicked', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<MemoryRouter>
						<VolumeDetails
							volume={mockVolume}
							isModalTimeSelection
							onClose={mockOnClose}
						/>
					</MemoryRouter>
				</Provider>
			</QueryClientProvider>,
		);

		const closeButton = screen.getByRole('button', { name: 'Close' });
		fireEvent.click(closeButton);
		expect(mockOnClose).toHaveBeenCalled();
	});
});
