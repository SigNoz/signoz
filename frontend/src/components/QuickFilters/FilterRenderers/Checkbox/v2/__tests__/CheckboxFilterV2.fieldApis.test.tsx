import { screen } from '@testing-library/react';
import {
	TelemetrytypesSignalDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render } from 'tests/test-utils';

import { QuickFiltersSource } from '../../../../types';

import CheckboxFilterV2 from '../CheckboxFilterV2';
import {
	DEFAULT_FILTER,
	DEFAULT_USE_FIELD_APIS,
	setupServer,
} from '../CheckboxFilterV2.testUtils';

setupServer();

describe('CheckboxFilterV2 - field APIs', () => {
	it('sends the signal and source of the quick filter source to the signal-wide endpoint', async () => {
		const requests: URLSearchParams[] = [];
		server.use(
			rest.get('http://localhost/api/v1/fields/values', (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: { values: { stringValues: ['ingest'] } },
					}),
				);
			}),
		);

		render(
			<CheckboxFilterV2
				filter={DEFAULT_FILTER}
				quickFilterSource={QuickFiltersSource.METER_EXPLORER}
				useFieldApis={DEFAULT_USE_FIELD_APIS}
			/>,
		);

		await expect(screen.findByText('ingest')).resolves.toBeInTheDocument();
		expect(requests[0].get('signal')).toBe(TelemetrytypesSignalDTO.metrics);
		expect(requests[0].get('source')).toBe(TelemetrytypesSourceDTO.meter);
	});
});
