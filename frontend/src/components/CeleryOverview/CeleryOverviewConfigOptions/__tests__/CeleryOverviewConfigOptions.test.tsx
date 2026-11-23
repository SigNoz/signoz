import type { GetFieldsValues200 } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, waitFor } from 'tests/test-utils';

import CeleryOverviewConfigOptions from '../CeleryOverviewConfigOptions';

const emptyValues: GetFieldsValues200 = {
	status: 'success',
	data: { complete: true, values: { stringValues: [] } },
};

describe('CeleryOverviewConfigOptions', () => {
	it('scopes the service and span name lookups to their field context', async () => {
		const contextByKey = new Map<string, string | null>();
		server.use(
			rest.get('*/api/v1/fields/values', (req, res, ctx) => {
				contextByKey.set(
					req.url.searchParams.get('name') ?? '',
					req.url.searchParams.get('fieldContext'),
				);
				return res(ctx.status(200), ctx.json(emptyValues));
			}),
		);

		render(<CeleryOverviewConfigOptions />);

		await waitFor(() => expect(contextByKey.size).toBe(6));
		expect(Object.fromEntries(contextByKey)).toStrictEqual({
			'service.name': 'resource',
			name: 'span',
			'messaging.system': null,
			'messaging.destination.name': null,
			'messaging.destination': null,
			kind_string: null,
		});
	});
});
