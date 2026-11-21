import { Querybuildertypesv5ColumnTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ColumnTypeDTO';
import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas/queryRangeV5200';
import type { Querybuildertypesv5RawDataDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RawDataDTO';
import type { Querybuildertypesv5RawRowDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RawRowDTO';
import type { Querybuildertypesv5ScalarDataDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5ScalarDataDTO';
import type { RestHandler } from 'msw';
import { rest } from 'msw';
import type { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

function countResponse(count: number): QueryRangeV5200 {
	const result: Querybuildertypesv5ScalarDataDTO = {
		columns: [
			{
				name: '__result_0',
				queryName: 'A',
				aggregationIndex: 0,
				columnType: Querybuildertypesv5ColumnTypeDTO.aggregation,
			},
		],
		data: [[count]],
	};
	return {
		status: 'success',
		data: {
			type: Querybuildertypesv5RequestTypeDTO.scalar,
			data: { results: [result] },
		},
	};
}

function rowsResponse(rows: Querybuildertypesv5RawRowDTO[]): QueryRangeV5200 {
	const result: Querybuildertypesv5RawDataDTO = { queryName: 'A', rows };
	return {
		status: 'success',
		data: {
			type: Querybuildertypesv5RequestTypeDTO.raw,
			data: { results: [result] },
		},
	};
}

export function queryRangeV5Handler({
	rows,
	count,
	requests,
}: {
	rows: Querybuildertypesv5RawRowDTO[];
	count: number;
	requests?: QueryRangePayloadV5[];
}): RestHandler {
	return rest.post('*/api/v5/query_range', async (req, res, ctx) => {
		const body: QueryRangePayloadV5 = await req.json();
		requests?.push(body);
		return res(
			ctx.status(200),
			ctx.json(
				body.requestType === 'scalar' ? countResponse(count) : rowsResponse(rows),
			),
		);
	});
}
