import { Querybuildertypesv5ColumnTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ColumnTypeDTO';
import { Querybuildertypesv5QueryEnvelopeBuilderDTOType } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryEnvelopeBuilderDTOType';
import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryRangeRequestDTO';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas/queryRangeV5200';
import { rest, server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import {
	CeleryTaskState,
	CeleryTaskStateGraphConfig,
} from '../CeleryTaskStateGraphConfig';

const COUNT_PER_STATE: Record<string, number> = {
	FAILURE: 12,
	RETRY: 30,
	SUCCESS: 958,
};

const stateOf = (body: Querybuildertypesv5QueryRangeRequestDTO): string => {
	const [envelope] = body.compositeQuery?.queries ?? [];
	const expression =
		envelope?.type ===
		Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query
			? (envelope.spec?.filter?.expression ?? '')
			: '';

	return /celery\.state = '(\w+)'/.exec(expression)?.[1] ?? '';
};

const scalarResponse = (value: number): QueryRangeV5200 => ({
	status: 'success',
	data: {
		type: Querybuildertypesv5RequestTypeDTO.scalar,
		data: {
			results: [
				{
					columns: [
						{
							name: '__result_0',
							queryName: 'A',
							aggregationIndex: 0,
							columnType: Querybuildertypesv5ColumnTypeDTO.aggregation,
						},
					],
					data: [[value]],
				},
			],
		},
	},
});

describe('CeleryTaskStateGraphConfig', () => {
	beforeEach(() => {
		server.use(
			rest.post('*/api/v5/query_range', async (req, res, ctx) => {
				const body: Querybuildertypesv5QueryRangeRequestDTO = await req.json();

				return res(
					ctx.status(200),
					ctx.json(scalarResponse(COUNT_PER_STATE[stateOf(body)] ?? 1000)),
				);
			}),
		);
	});

	it('shows the v5 count for each task state', async () => {
		render(
			<CeleryTaskStateGraphConfig
				barState={CeleryTaskState.All}
				setBarState={jest.fn()}
			/>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('celery-state-value-all')).toHaveTextContent(
				'1000',
			),
		);
		expect(screen.getByTestId('celery-state-value-failed')).toHaveTextContent(
			'12',
		);
		expect(screen.getByTestId('celery-state-value-retry')).toHaveTextContent(
			'30',
		);
		expect(screen.getByTestId('celery-state-value-successful')).toHaveTextContent(
			'958',
		);
	});
});
