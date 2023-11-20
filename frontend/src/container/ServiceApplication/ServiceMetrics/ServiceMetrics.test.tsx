import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { act, render, screen } from 'tests/test-utils';

import ServicesUsingMetrics from './index';

describe('ServicesUsingMetrics', () => {
	test('should render the ServicesUsingMetrics component', async () => {
		await act(() => {
			render(<ServicesUsingMetrics />);
		});
		const applicationHeader = await screen.findByText(/application/i);
		expect(applicationHeader).toBeInTheDocument();
		const p99LatencyHeader = await screen.findByText(/p99 latency \(in ns\)/i);
		expect(p99LatencyHeader).toBeInTheDocument();
		const errorRateHeader = await screen.findByText(/error rate \(% of total\)/i);
		expect(errorRateHeader).toBeInTheDocument();
	});

	test('should render the ServicesUsingMetrics component with loading', async () => {
		await act(() => {
			render(<ServicesUsingMetrics />);
		});
		const loadingText = await screen.findByText(/Testapp/i);
		expect(loadingText).toBeInTheDocument();
	});

	test('should not render is the data is not prsent', async () => {
		server.use(
			rest.post(
				'http://localhost/api/v1/service/top_level_operations',
				(req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							SampleApp: ['GET'],
							TestApp: ['GET'],
						}),
					),
			),
		);
		render(<ServicesUsingMetrics />);
		const sampleAppText = await screen.findByText(/SampleApp/i);
		expect(sampleAppText).toBeInTheDocument();
		const testAppText = await screen.findByText(/TestApp/i);
		expect(testAppText).toBeInTheDocument();
	});
});
