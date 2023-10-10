import { act, render, screen } from 'tests/test-utils';

import ServiceTraces from '.';

jest.mock('hooks/useResourceAttribute', () => ({
	__esModule: true,
	default: jest.fn().mockReturnValue({
		queries: [],
	}),
}));

describe('ServicesTraces', () => {
	test('Should render the component', async () => {
		await act(() => {
			render(<ServiceTraces />);
		});
		const applicationHeader = screen.getByText(/application/i);
		expect(applicationHeader).toBeInTheDocument();
		const p99LatencyHeader = screen.getByText(/p99 latency \(in ms\)/i);
		expect(p99LatencyHeader).toBeInTheDocument();
		const errorRateHeader = screen.getByText(/error rate \(% of total\)/i);
		expect(errorRateHeader).toBeInTheDocument();
	});

	test('Should render the Services with Services', async () => {
		act(() => {
			render(<ServiceTraces />);
		});
		const servierName = await screen.findByText(/TestService/i);
		expect(servierName).toBeInTheDocument();
		const p99Latency = await screen.findByText(/8\.11/i);
		expect(p99Latency).toBeInTheDocument();
	});
});
