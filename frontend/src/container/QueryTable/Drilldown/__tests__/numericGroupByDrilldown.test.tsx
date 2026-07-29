import { render, screen } from '@testing-library/react';
import {
	DashboardtypesQueryDTO,
	Querybuildertypesv5BuilderQuerySpecDTO,
	Querybuildertypesv5CompositeQueryDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	fromPerses,
	toPerses,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import { ClickedData } from 'periscope/components/ContextMenu';

import { getGroupContextMenuConfig } from '../contextConfig';
import {
	addFilterToQuery,
	getBaseMeta,
	isNumberDataType,
} from '../drilldownUtils';

const GROUP_KEY = 'panja.pinger.status_code';

/**
 * A saved V2 table panel grouped by a numeric attribute. The backend rewrites `float64` to
 * `number` when it stores the panel, so `number` is what a reload actually carries.
 */
const savedPanelQueries = [
	{
		kind: 'signoz/scalar',
		spec: {
			plugin: {
				kind: 'signoz/CompositeQuery',
				spec: {
					queries: [
						{
							type: 'builder_query',
							spec: {
								name: 'A',
								signal: 'metrics',
								aggregations: [{ metricName: 'probe_checks', spaceAggregation: 'sum' }],
								groupBy: [
									{
										name: GROUP_KEY,
										fieldDataType: 'number',
										fieldContext: 'attribute',
									},
								],
								filter: { expression: '' },
								disabled: false,
							},
						},
					],
				},
			},
		},
	},
] as unknown as DashboardtypesQueryDTO[];

describe('drilldown on a numeric group-by column (V2 table panel)', () => {
	const v1Query = fromPerses(savedPanelQueries, PANEL_TYPES.TABLE);
	const groupByDataType = getBaseMeta(v1Query, GROUP_KEY)?.dataType;

	it('sees the `number` type the panel was stored with', () => {
		expect(groupByDataType).toBe('number');
	});

	it('offers the numeric operators instead of throwing', () => {
		const clickedData: ClickedData = {
			column: { dataIndex: GROUP_KEY },
			record: { key: GROUP_KEY, timestamp: 0 },
		};
		const { items } = getGroupContextMenuConfig({
			query: v1Query,
			clickedData,
			panelType: PANEL_TYPES.TABLE,
			onColumnClick: jest.fn(),
		});
		render(<div>{items}</div>);

		expect(screen.getByText(`Filter by ${GROUP_KEY}`)).toBeInTheDocument();
		expect(screen.getByText('Is this')).toBeInTheDocument();
		expect(screen.getByText('Is greater than or equal to')).toBeInTheDocument();
	});

	it('filters on an unquoted number', () => {
		// What the filter hooks branch on before coercing the clicked value.
		expect(isNumberDataType(groupByDataType)).toBe(true);

		const refined = addFilterToQuery(v1Query, [
			{ filterKey: GROUP_KEY, filterValue: 200, operator: '=' },
		]);
		expect(refined.builder.queryData[0].filter?.expression).toBe(
			`${GROUP_KEY} = 200`,
		);
	});

	it('leaves the stored query shape untouched on the way back out', () => {
		const [envelope] = toPerses(v1Query, PANEL_TYPES.TABLE);
		const composite = envelope.spec.plugin
			.spec as Querybuildertypesv5CompositeQueryDTO;
		const [query] = composite.queries ?? [];
		// The generated envelope union doesn't discriminate `spec` by `type`.
		const spec = query?.spec as Querybuildertypesv5BuilderQuerySpecDTO;

		expect(spec.groupBy?.[0]).toMatchObject({
			name: GROUP_KEY,
			fieldDataType: 'number',
			fieldContext: 'attribute',
		});
	});
});
