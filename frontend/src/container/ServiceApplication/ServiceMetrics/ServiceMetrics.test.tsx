import type { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import { Querybuildertypesv5ColumnTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ColumnTypeDTO';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas/queryRangeV5200';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';

import ServicesUsingMetrics from './index';

const topLevelOperations: ServiceDataProps = {
	SampleApp: ['GET'],
	TestApp: ['POST'],
};

// A = p99, D = ops/s, F1 = error rate
const metricsByService: Record<string, [number, number, number]> = {
	SampleApp: [100, 50, 2.5],
	TestApp: [200, 10, 0],
};

const scalarTable = (service: string): QueryRangeV5200 => ({
	status: 'success',
	data: {
		type: Querybuildertypesv5RequestTypeDTO.scalar,
		data: {
			results: [
				{
					columns: [
						{
							name: 'service.name',
							queryName: 'A',
							aggregationIndex: 0,
							columnType: Querybuildertypesv5ColumnTypeDTO.group,
						},
						...['A', 'D', 'F1'].map((queryName) => ({
							name: '__result_0',
							queryName,
							aggregationIndex: 0,
							columnType: Querybuildertypesv5ColumnTypeDTO.aggregation,
						})),
					],
					data: [[service, ...metricsByService[service]]],
				},
			],
		},
	},
});

const mockTopLevelOperations = (operations: ServiceDataProps): void => {
	server.use(
		rest.post(
			'http://localhost/api/v1/service/top_level_operations',
			(_, res, ctx) => res(ctx.status(200), ctx.json(operations)),
		),
	);
};

const table = (): HTMLElement => screen.getByTestId('services-table');

const rowCells = (service: string): (string | null)[] =>
	Array.from(table().querySelectorAll(`tr[data-row-key="${service}"] td`)).map(
		(cell) => cell.textContent,
	);

describe('ServicesUsingMetrics', () => {
	beforeEach(() => {
		server.use(
			rest.post('http://localhost/api/v5/query_range', async (req, res, ctx) => {
				const body = JSON.stringify(await req.json());
				const service = Object.keys(metricsByService).find((name) =>
					body.includes(`'${name}'`),
				);

				return res(ctx.status(200), ctx.json(scalarTable(service ?? '')));
			}),
		);
	});

	it('fills each row from the v5 table', async () => {
		mockTopLevelOperations(topLevelOperations);
		render(<ServicesUsingMetrics />);

		await waitFor(() =>
			expect(rowCells('SampleApp')).toStrictEqual([
				'SampleApp',
				'100.00',
				'2.50',
				'50.00',
			]),
		);
		expect(rowCells('TestApp')).toStrictEqual([
			'TestApp',
			'200.00',
			'0.00',
			'10.00',
		]);
	});

	it('labels the span-metrics p99 in ms', async () => {
		mockTopLevelOperations(topLevelOperations);
		render(<ServicesUsingMetrics />);

		await waitFor(() =>
			expect(
				Array.from(table().querySelectorAll('thead th')).map(
					(cell) => cell.textContent,
				),
			).toContain('P99 latency (in ms)'),
		);
	});

	it('renders an empty list when no service has top level operations', async () => {
		mockTopLevelOperations({});
		render(<ServicesUsingMetrics />);

		await waitFor(() =>
			expect(table().querySelectorAll('tr[data-row-key]')).toHaveLength(0),
		);
	});
});
