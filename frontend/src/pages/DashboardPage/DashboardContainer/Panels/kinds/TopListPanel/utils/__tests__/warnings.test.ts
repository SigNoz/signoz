import {
	Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType,
	type Querybuildertypesv5ColumnDescriptorDTO,
	type Querybuildertypesv5QueryRangeRequestDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import {
	groupColumn as group,
	requestWith,
	scalarResponse,
	topListPanel,
	valueColumn as aggregation,
} from '../../__tests__/fixtures';
import { getTopListDataWarning } from '../warnings';

const panel = topListPanel();

function dataWith(
	columns: Querybuildertypesv5ColumnDescriptorDTO[],
	rows: unknown[][],
	legend = '',
	requestPayload?: Querybuildertypesv5QueryRangeRequestDTO,
): PanelQueryData {
	return {
		response: scalarResponse([{ queryName: 'A', columns, data: rows }]),
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
			requestWith([
				{
					type: Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType.clickhouse_sql,
					spec: { name: 'A', query: 'SELECT 1' },
				},
			]),
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
