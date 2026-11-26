import {
	initialQueriesMap,
	initialQueryAIWithType,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { getActiveBuilder } from 'lib/query/builderSlot';
import { render, screen } from 'tests/test-utils';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { QueryBuilderV2 } from '../QueryBuilderV2';

jest.mock('../QueryV2/QueryV2', () => ({
	QueryV2: ({ query }: { query: IBuilderQuery }): JSX.Element => (
		<div data-testid="query-v2">{query.queryName}</div>
	),
}));
jest.mock('../QueryV2/QueryFooter/QueryFooter', () => (): null => null);

function renderWith(currentQuery: Query): void {
	render(<QueryBuilderV2 panelType={PANEL_TYPES.TIME_SERIES} />, undefined, {
		queryBuilderOverrides: {
			currentQuery,
			panelType: PANEL_TYPES.TIME_SERIES,
			initialDataSource: null,
			handleSetConfig: jest.fn(),
			addNewBuilderQuery: jest.fn(),
			addNewFormula: jest.fn(),
			addTraceOperator: jest.fn(),
			handleRunQuery: jest.fn(),
		},
	});
}

const builderWithQuery = (
	builder: Query['builder'],
	queryName: string,
): Query['builder'] => ({
	...builder,
	queryData: [{ ...builder.queryData[0], queryName }],
});

const query: Query = {
	...initialQueriesMap.metrics,
	builder: builderWithQuery(initialQueriesMap.metrics.builder, 'MAIN'),
	builder_ai_query: builderWithQuery(
		getActiveBuilder(initialQueryAIWithType),
		'AI',
	),
};

describe('QueryBuilderV2 builder slot', () => {
	it('renders the AI slot when AI is the query type', () => {
		renderWith({ ...query, queryType: EQueryType.AI_QUERY_BUILDER });

		expect(screen.getByTestId('query-v2')).toHaveTextContent('AI');
	});

	it('renders builder when Query Builder is the query type', () => {
		renderWith(query);

		expect(screen.getByTestId('query-v2')).toHaveTextContent('MAIN');
	});
});
