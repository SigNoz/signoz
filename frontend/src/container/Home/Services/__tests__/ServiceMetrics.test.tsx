import type { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { Querybuildertypesv5ColumnTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ColumnTypeDTO';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas/queryRangeV5200';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';

import ServiceMetrics from '../ServiceMetrics';

const topLevelOperations: ServiceDataProps = { SampleApp: ['GET'] };

// A = p99 (ms), D = ops/s, F1 = error rate
const scalarTable: QueryRangeV5200 = {
	status: 'success',
	data: {
		type: Querybuildertypesv5RequestTypeDTO.scalar,
		data: {
			results: [
				{
					columns: ['A', 'D', 'F1'].map((queryName) => ({
						name: '__result_0',
						queryName,
						aggregationIndex: 0,
						columnType: Querybuildertypesv5ColumnTypeDTO.aggregation,
					})),
					data: [[148.25, 12.4, 1.8]],
				},
			],
		},
	},
};

describe('Home ServiceMetrics', () => {
	beforeEach(() => {
		server.use(
			rest.post(
				'http://localhost/api/v1/service/top_level_operations',
				(_, res, ctx) => res(ctx.status(200), ctx.json(topLevelOperations)),
			),
			rest.post('http://localhost/api/v5/query_range', (_, res, ctx) =>
				res(ctx.status(200), ctx.json(scalarTable)),
			),
		);
	});

	it('shows the span-metrics p99 in ms as sent', async () => {
		render(
			<ServiceMetrics
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
