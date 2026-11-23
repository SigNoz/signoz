import type { GetFieldsValues200 } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, waitFor } from 'tests/test-utils';

import MessagingQueuesConfigOptions from '../MQConfigOptions';

const emptyValues: GetFieldsValues200 = {
	status: 'success',
	data: { values: {}, complete: true },
};

describe('MessagingQueuesConfigOptions', () => {
	let requests: URLSearchParams[];

	beforeEach(() => {
		requests = [];
		server.use(
			rest.get('*/api/v1/fields/values', (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(ctx.status(200), ctx.json(emptyValues));
			}),
		);
	});

	it('reads group, topic and partition values off the consumer lag metric', async () => {
		render(<MessagingQueuesConfigOptions />);

		await waitFor(() => expect(requests).toHaveLength(3));

		expect(
			requests
				.map((params) => ({
					signal: params.get('signal'),
					name: params.get('name'),
					metricName: params.get('metricName'),
				}))
				.sort((a, b) => String(a.name).localeCompare(String(b.name))),
		).toStrictEqual([
			{ signal: 'metrics', name: 'group', metricName: 'kafka.consumer_group.lag' },
			{
				signal: 'metrics',
				name: 'partition',
				metricName: 'kafka.consumer_group.lag',
			},
			{ signal: 'metrics', name: 'topic', metricName: 'kafka.consumer_group.lag' },
		]);
	});
});
