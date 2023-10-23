import { render, screen, waitFor } from 'tests/test-utils';

import { services } from './__mocks__/getServices';
import ServiceTraceTable from './ServiceTracesTable';

describe('Metrics Component', () => {
	it('renders without errors', async () => {
		render(<ServiceTraceTable services={services} loading={false} />);

		await waitFor(() => {
			expect(screen.getByText(/application/i)).toBeInTheDocument();
			expect(screen.getByText(/p99 latency \(in ms\)/i)).toBeInTheDocument();
			expect(screen.getByText(/error rate \(% of total\)/i)).toBeInTheDocument();
			expect(screen.getByText(/operations per second/i)).toBeInTheDocument();
		});
	});

	it('renders if the data is loaded in the table', async () => {
		render(<ServiceTraceTable services={services} loading={false} />);

		expect(screen.getByText('frontend')).toBeInTheDocument();
	});

	it('renders no data when required conditions are met', async () => {
		render(<ServiceTraceTable services={[]} loading={false} />);

		expect(screen.getByText('No data')).toBeInTheDocument();
	});
});
