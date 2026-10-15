import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { render, screen } from 'tests/test-utils';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderField } from '../queryBuilderFields.types';
import QueryAggregationOptions from '../QueryV2/QueryAggregation/QueryAggregation';

jest.mock('../QueryV2/QueryAggregation/QueryAggregationSelect', () => ({
	__esModule: true,
	default: (): null => null,
}));

const queryData = initialQueriesMap.traces.builder
	.queryData[0] as IBuilderQuery;

describe('QueryAggregationOptions step interval placeholder', () => {
	it('shows the configured placeholder', () => {
		render(
			<QueryAggregationOptions
				dataSource={DataSource.TRACES}
				panelType={PANEL_TYPES.TIME_SERIES}
				onAggregationIntervalChange={jest.fn()}
				queryData={queryData}
				fieldsConfig={{
					[QueryBuilderField.StepInterval]: {
						state: 'pinned',
						placeholder: 'Default 60',
					},
				}}
			/>,
		);
		expect(screen.getByPlaceholderText('Default 60')).toBeInTheDocument();
	});

	it('falls back to Auto', () => {
		render(
			<QueryAggregationOptions
				dataSource={DataSource.TRACES}
				panelType={PANEL_TYPES.TIME_SERIES}
				onAggregationIntervalChange={jest.fn()}
				queryData={queryData}
			/>,
		);
		expect(screen.getByPlaceholderText('Auto')).toBeInTheDocument();
	});
});
