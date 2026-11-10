import { render, screen } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ClickedData } from 'periscope/components/ContextMenu';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getGroupContextMenuConfig } from '../contextConfig';

const GROUP_KEY = 'http.status_code';

const makeQuery = (dataType: string): Query =>
	({
		builder: {
			queryData: [
				{
					queryName: 'A',
					groupBy: [{ key: GROUP_KEY, dataType, type: 'attribute' }],
				},
			],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		promql: [],
		clickhouse_sql: [],
	}) as unknown as Query;

const clickedData: ClickedData = {
	column: { dataIndex: GROUP_KEY },
	record: { key: GROUP_KEY, timestamp: 0 },
};

const renderGroupMenu = (query: Query): void => {
	const { items } = getGroupContextMenuConfig({
		query,
		clickedData,
		panelType: PANEL_TYPES.TABLE,
		onColumnClick: jest.fn(),
	});
	render(<div>{items}</div>);
};

describe('getGroupContextMenuConfig', () => {
	// A `number` group-by used to throw: it isn't a key of QUERY_BUILDER_OPERATORS_BY_TYPES.
	it('renders comparison operators for a `number` group-by column', () => {
		renderGroupMenu(makeQuery('number'));

		expect(screen.getByText(`Filter by ${GROUP_KEY}`)).toBeInTheDocument();
		expect(screen.getByText('Is this')).toBeInTheDocument();
		expect(screen.getByText('Is greater than or equal to')).toBeInTheDocument();
		expect(screen.getByText('Is less than')).toBeInTheDocument();
	});

	it('renders only equality operators for a string group-by column', () => {
		renderGroupMenu(makeQuery(DataTypes.String));

		expect(screen.getByText('Is this')).toBeInTheDocument();
		expect(screen.getByText('Is not this')).toBeInTheDocument();
		expect(
			screen.queryByText('Is greater than or equal to'),
		).not.toBeInTheDocument();
	});

	it('falls back to equality operators when the column has no known data type', () => {
		renderGroupMenu(makeQuery(''));

		expect(screen.getByText('Is this')).toBeInTheDocument();
		expect(
			screen.queryByText('Is greater than or equal to'),
		).not.toBeInTheDocument();
	});

	it('returns no items for a non-table panel', () => {
		const config = getGroupContextMenuConfig({
			query: makeQuery('number'),
			clickedData,
			panelType: PANEL_TYPES.TIME_SERIES,
			onColumnClick: jest.fn(),
		});

		expect(config.items).toBeUndefined();
	});
});
