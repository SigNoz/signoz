import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { getTopListDataWarning } from '../warnings';

const panel = {} as PanelOfKind<'signoz/TopListPanel'>;

interface Column {
	name: string;
	columnType: 'group' | 'aggregation';
	aggregationIndex?: number;
}

const group = (name: string): Column => ({ name, columnType: 'group' });
const aggregation = (name: string, aggregationIndex = 0): Column => ({
	name,
	columnType: 'aggregation',
	aggregationIndex,
});

function dataWith(
	columns: Column[],
	rows: unknown[][],
	legend = '',
	requestPayload?: Querybuildertypesv5QueryRangeRequestDTO,
): PanelQueryData {
	return {
		response: {
			status: 'success',
			data: {
				type: 'scalar',
				data: {
					results: [
						{
							queryName: 'A',
							columns: columns.map((column) => ({ ...column, queryName: 'A' })),
							data: rows,
						},
					],
				},
			},
		} as unknown as QueryRangeV5200,
		requestPayload,
		legendMap: legend ? { A: legend } : {},
	};
}

describe('getTopListDataWarning', () => {
	it('stays quiet for a grouped single-value result', () => {
		const data = dataWith(
			[group('service.name'), aggregation('__result')],
			[
				['checkout', 2],
				['auth', 1],
			],
		);

		expect(getTopListDataWarning(panel, data)).toBeNull();
	});

	it('stays quiet when there are no rows', () => {
		expect(getTopListDataWarning(panel, dataWith([], []))).toBeNull();
	});

	it('warns when the query has no group by', () => {
		const data = dataWith([aggregation('__result')], [[42]]);

		expect(getTopListDataWarning(panel, data)?.messages).toStrictEqual([
			'The query has no group by, so the list shows a single total. Add a group by to rank its groups.',
		]);
	});

	it('names the value columns the ranking ignores', () => {
		const data = dataWith(
			[
				group('host'),
				aggregation('p99'),
				aggregation('p50', 1),
				aggregation('p90', 2),
			],
			[['a', 1, 2, 3]],
			'',
			// ClickHouse value columns keep their SQL alias as their name.
			{
				compositeQuery: {
					queries: [
						{ type: 'clickhouse_sql', spec: { name: 'A', query: 'SELECT 1' } },
					],
				},
			} as unknown as Querybuildertypesv5QueryRangeRequestDTO,
		);

		expect(getTopListDataWarning(panel, data)?.messages).toStrictEqual([
			'The list ranks the first value column only; "p50", "p90" are not shown.',
		]);
	});

	it('warns when every row shares one label', () => {
		const data = dataWith(
			[group('service.name'), aggregation('__result')],
			[
				['checkout', 2],
				['auth', 1],
			],
			'requests',
		);

		expect(getTopListDataWarning(panel, data)?.messages).toStrictEqual([
			'Every row has the same label. Use {{group-by key}} variables in the legend to tell rows apart.',
		]);
	});
});
