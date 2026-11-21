import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';
import type { ServicesList } from 'types/api/metrics/getService';

import ServiceTraces from '../ServiceTraces';

const services: ServicesList[] = [
	{
		serviceName: 'SampleApp',
		p99: 148_250_000,
		avgDuration: 0,
		numCalls: 100,
		callRate: 12.4,
		numErrors: 2,
		errorRate: 1.8,
	},
];

describe('Home ServiceTraces', () => {
	beforeEach(() => {
		server.use(
			rest.post('http://localhost/api/v2/services', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: services })),
			),
		);
	});

	it('shows the traces p99 in ms from ns', async () => {
		render(
			<ServiceTraces
				onUpdateChecklistDoneItem={jest.fn()}
				loadingUserPreferences={false}
			/>,
		);

		await waitFor(() =>
			expect(
				Array.from(
					screen.getByTestId('home-services-table').querySelectorAll('tbody tr td'),
				).map((cell) => cell.textContent),
			).toStrictEqual(['SampleApp', '148.25', '1.80', '12.40']),
		);
	});
});
