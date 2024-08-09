import ROUTES from 'constants/routes';
import { render, screen, waitFor } from 'tests/test-utils';
import { TestWrapper } from 'testUtils';

import { Services } from './__mock__/servicesListMock';
import Metrics from './index';

describe('Metrics Component', () => {
	it('renders without errors', async () => {
		render(
			<TestWrapper path={ROUTES.APPLICATION}>
				<Metrics services={Services} isLoading={false} />,
			</TestWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText(/application/i)).toBeInTheDocument();
			expect(screen.getByText(/p99 latency \(in ms\)/i)).toBeInTheDocument();
			expect(screen.getByText(/error rate \(% of total\)/i)).toBeInTheDocument();
			expect(screen.getByText(/operations per second/i)).toBeInTheDocument();
		});
	});

	it('renders if the data is loaded in the table', async () => {
		render(
			<TestWrapper>
				<Metrics services={Services} isLoading={false} />
			</TestWrapper>,
		);

		expect(screen.getByText('frontend')).toBeInTheDocument();
	});

	it('renders no data when required conditions are met', async () => {
		render(
			<TestWrapper>
				<Metrics services={[]} isLoading={false} />
			</TestWrapper>,
		);

		expect(screen.getByText('No data')).toBeInTheDocument();
	});
});
