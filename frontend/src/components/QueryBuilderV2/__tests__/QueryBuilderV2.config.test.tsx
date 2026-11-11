import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { render } from 'tests/test-utils';
import { QueryMode } from 'types/api/queryBuilder/queryBuilderData';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2 } from '../QueryBuilderV2';

jest.mock('hooks/queryBuilder/useQueryBuilder');
jest.mock('../QueryV2/QueryV2', () => ({ QueryV2: (): null => null }));
jest.mock('../QueryV2/QueryFooter/QueryFooter', () => (): null => null);

const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);

const aiQuery: Query = {
	...initialQueriesMap.traces,
	builder: {
		...initialQueriesMap.traces.builder,
		queryData: initialQueriesMap.traces.builder.queryData.map((query) => ({
			...query,
			builderQueryType: QueryMode.AI_QUERY_BUILDER,
		})),
	},
};

function mockContext({
	panelType = null,
	initialDataSource = null,
	currentQuery = initialQueriesMap.metrics,
}: {
	panelType?: PANEL_TYPES | null;
	initialDataSource?: DataSource | null;
	currentQuery?: Query;
}): jest.Mock {
	const handleSetConfig = jest.fn();
	mockedUseQueryBuilder.mockReturnValue({
		currentQuery,
		panelType,
		initialDataSource,
		handleSetConfig,
		addNewBuilderQuery: jest.fn(),
		addNewFormula: jest.fn(),
		addTraceOperator: jest.fn(),
		handleRunQuery: jest.fn(),
	} as unknown as ReturnType<typeof useQueryBuilder>);
	return handleSetConfig;
}

describe('QueryBuilderV2 provider config sync', () => {
	it('leaves the data source unset for a bar panel without a static config', () => {
		const handleSetConfig = mockContext({});

		render(<QueryBuilderV2 panelType={PANEL_TYPES.BAR} version="v3" />);

		expect(handleSetConfig).toHaveBeenCalledWith(PANEL_TYPES.BAR, null);
	});

	it('syncs the static data source', () => {
		const handleSetConfig = mockContext({});

		render(
			<QueryBuilderV2
				version="v3"
				panelType={PANEL_TYPES.BAR}
				config={{ initialDataSource: DataSource.LOGS, queryVariant: 'static' }}
			/>,
		);

		expect(handleSetConfig).toHaveBeenCalledWith(
			PANEL_TYPES.BAR,
			DataSource.LOGS,
		);
	});

	it('keeps an AI query on traces for a bar panel', () => {
		const handleSetConfig = mockContext({ currentQuery: aiQuery });

		render(
			<QueryBuilderV2
				version="v3"
				panelType={PANEL_TYPES.BAR}
				config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
			/>,
		);

		expect(handleSetConfig).toHaveBeenCalledWith(
			PANEL_TYPES.BAR,
			DataSource.TRACES,
		);
	});

	it('does not reset the config when the provider already matches', () => {
		const handleSetConfig = mockContext({
			panelType: PANEL_TYPES.TIME_SERIES,
			initialDataSource: DataSource.TRACES,
		});

		render(
			<QueryBuilderV2
				version="v3"
				panelType={PANEL_TYPES.TIME_SERIES}
				config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
			/>,
		);

		expect(handleSetConfig).not.toHaveBeenCalled();
	});
});
