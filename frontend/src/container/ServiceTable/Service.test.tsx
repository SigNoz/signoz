import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { Services } from './__mock__/servicesListMock';
import Metrics from './index';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: 'localhost:3001/services/',
	}),
}));

describe('Metrics Component', () => {
	it('renders without errors', async () => {
		render(
			<BrowserRouter>
				<Metrics services={Services} />
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
				<Metrics services={Services} />
			</BrowserRouter>,
		);

		expect(screen.getByText('frontend')).toBeInTheDocument();
	});

	it('renders no data when required conditions are met', async () => {
		render(
			<BrowserRouter>
				<Metrics services={[]} />
			</BrowserRouter>,
		);

		expect(screen.getByText('No data')).toBeInTheDocument();
	});
});
