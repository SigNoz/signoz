import {
	initialQueriesMap,
	initialQueryAIWithType,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { render, screen } from 'tests/test-utils';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { QueryBuilderV2 } from '../QueryBuilderV2';

jest.mock('hooks/queryBuilder/useQueryBuilder');
jest.mock('../QueryV2/QueryV2', () => ({
	QueryV2: ({ query }: { query: IBuilderQuery }): JSX.Element => (
		<div data-testid="query-v2">{query.queryName}</div>
	),
}));
jest.mock('../QueryV2/QueryFooter/QueryFooter', () => (): null => null);

const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);

function renderWith(currentQuery: Query): void {
	mockedUseQueryBuilder.mockReturnValue({
		currentQuery,
		panelType: PANEL_TYPES.TIME_SERIES,
		initialDataSource: null,
		handleSetConfig: jest.fn(),
		addNewBuilderQuery: jest.fn(),
		addNewFormula: jest.fn(),
		addTraceOperator: jest.fn(),
		handleRunQuery: jest.fn(),
	} as unknown as ReturnType<typeof useQueryBuilder>);

	render(<QueryBuilderV2 panelType={PANEL_TYPES.TIME_SERIES} version="v3" />);
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
	builder_ai_query: builderWithQuery(initialQueryAIWithType.builder, 'AI'),
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
