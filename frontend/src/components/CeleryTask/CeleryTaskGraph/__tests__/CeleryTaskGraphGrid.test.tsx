import { Querybuildertypesv5ColumnTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ColumnTypeDTO';
import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryRangeRequestDTO';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas/queryRangeV5200';
import { rest, server } from 'mocks-server/server';
import store from 'store';
import { render, screen, waitFor } from 'tests/test-utils';

import CeleryTaskGraphGrid from '../CeleryTaskGraphGrid';

const workerCountResponse = (workers: string[]): QueryRangeV5200 => ({
	status: 'success',
	data: {
		type: Querybuildertypesv5RequestTypeDTO.scalar,
		data: {
			results: [
				{
					columns: [
						{
							name: 'worker',
							queryName: 'A',
							columnType: Querybuildertypesv5ColumnTypeDTO.group,
						},
						{
							name: '__result_0',
							queryName: 'A',
							aggregationIndex: 0,
							columnType: Querybuildertypesv5ColumnTypeDTO.aggregation,
						},
					],
					data: workers.map((worker) => [worker, 4]),
				},
			],
		},
	},
});

describe('CeleryTaskGraphGrid worker count', () => {
	let requests: Querybuildertypesv5QueryRangeRequestDTO[];

	beforeEach(() => {
		requests = [];
		server.use(
			rest.post('*/api/v5/query_range', async (req, res, ctx) => {
				requests.push(await req.json());
				return res(
					ctx.status(200),
					ctx.json(workerCountResponse(['worker-a', 'worker-b', ''])),
				);
			}),
		);
	});

	it('counts the workers that reported in the selected range', async () => {
		render(<CeleryTaskGraphGrid onClick={jest.fn()} queryEnabled={false} />);

		await waitFor(() =>
			expect(screen.getByTestId('celery-worker-count')).toHaveTextContent('2'),
		);

		const { minTime, maxTime } = store.getState().globalTime;
		expect(
			requests.filter((request) =>
				request.compositeQuery?.queries?.some(
					(query) => (query.spec as { signal?: string }).signal === 'metrics',
				),
			),
		).toStrictEqual([
			{
				schemaVersion: 'v1',
				start: Math.floor(minTime / 1e6),
				end: Math.floor(maxTime / 1e6),
				requestType: 'scalar',
				compositeQuery: {
					queries: [
						{
							type: 'builder_query',
							spec: {
								name: 'A',
								signal: 'metrics',
								aggregations: [
									{
										metricName: 'flower_task_runtime_seconds_sum',
										timeAggregation: 'count',
										spaceAggregation: 'sum',
										reduceTo: 'sum',
									},
								],
								groupBy: [{ name: 'worker' }],
							},
						},
					],
				},
			},
		]);
	});
});
