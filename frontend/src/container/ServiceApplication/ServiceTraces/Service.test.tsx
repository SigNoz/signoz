import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import ServiceTraceTable from './ServiceTraceTable';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: 'localhost:3001/services/',
	}),
}));

const services = [
	{
		serviceName: 'frontend',
		p99: 1261498140,
		avgDuration: 768497850.9803921,
		numCalls: 255,
		callRate: 0.9444444444444444,
		numErrors: 0,
		errorRate: 0,
		num4XX: 0,
		fourXXRate: 0,
	},
	{
		serviceName: 'customer',
		p99: 890150740.0000001,
		avgDuration: 369612035.2941176,
		numCalls: 255,
		callRate: 0.9444444444444444,
		numErrors: 0,
		errorRate: 0,
		num4XX: 0,
		fourXXRate: 0,
	},
];

describe('Metrics Component', () => {
	it('renders without errors', async () => {
		render(
			<BrowserRouter>
				<ServiceTraceTable services={services} loading={false} error={false} />
			</BrowserRouter>,
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
			<BrowserRouter>
				<ServiceTraceTable services={services} loading={false} error={false} />
			</BrowserRouter>,
		);

		expect(screen.getByText('frontend')).toBeInTheDocument();
	});

	it('renders no data when required conditions are met', async () => {
		render(
			<BrowserRouter>
				<ServiceTraceTable services={[]} loading={false} error={false} />
			</BrowserRouter>,
		);

		expect(screen.getByText('No data')).toBeInTheDocument();
	});
});
