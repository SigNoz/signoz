import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { render, screen } from 'tests/test-utils';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import QueryAggregationOptions from '../QueryV2/QueryAggregation/QueryAggregation';

jest.mock('../QueryV2/QueryAggregation/QueryAggregationSelect', () => ({
	__esModule: true,
	default: (): null => null,
}));

const queryData = initialQueriesMap.traces.builder
	.queryData[0] as IBuilderQuery;

function renderFor(panelType: PANEL_TYPES, dataSource: DataSource): void {
	render(
		<QueryAggregationOptions
			dataSource={dataSource}
			panelType={panelType}
			onAggregationIntervalChange={jest.fn()}
			queryData={queryData}
		/>,
	);
}

describe('QueryAggregationOptions step interval', () => {
	it.each([PANEL_TYPES.TABLE, PANEL_TYPES.SCATTER, PANEL_TYPES.PIE])(
		'is hidden for a %s panel over traces, which reduces the whole window',
		(panelType) => {
			renderFor(panelType, DataSource.TRACES);
			expect(screen.queryByText('every')).not.toBeInTheDocument();
		},
	);

	it('stays for a scatter plot over metrics, where it sets the series step', () => {
		renderFor(PANEL_TYPES.SCATTER, DataSource.METRICS);
		expect(screen.getByText('every')).toBeInTheDocument();
	});

	it('stays for a time series over traces', () => {
		renderFor(PANEL_TYPES.TIME_SERIES, DataSource.TRACES);
		expect(screen.getByText('every')).toBeInTheDocument();
	});
});
