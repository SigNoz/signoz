import WidgetHeader from 'container/WidgetCard/Header';
import { mockAppLocation } from 'tests/router-mocks';
import { fireEvent, render, screen, within } from 'tests/test-utils';
import { EQueryType } from 'types/common/dashboard';

import { QueryTable } from '../QueryTable';
import { QueryTableProps, WidgetHeaderProps } from './mocks';

mockAppLocation({ pathname: '' });

// Mock useDashabord hook

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('QueryTable -', () => {
	it('should render correctly with all the data rows', () => {
		render(<QueryTable {...QueryTableProps} />);
		const tableRows = screen.getAllByTestId('query-table-row');
		expect(tableRows).toHaveLength(QueryTableProps.queryTableData.rows.length);
	});

	it('should render correctly with searchTerm', () => {
		render(<QueryTable {...QueryTableProps} searchTerm="frontend" />);
		const tableRows = screen.getAllByTestId('query-table-row');
		expect(tableRows).toHaveLength(3);
	});

	it('should enable drilldown cells for AI query builder queries', () => {
		render(
			<QueryTable
				{...QueryTableProps}
				query={{
					...QueryTableProps.query,
					queryType: EQueryType.AI_QUERY_BUILDER,
					builder_ai_query: QueryTableProps.query.builder,
				}}
				enableDrillDown
			/>,
		);
		const [firstRow] = screen.getAllByTestId('query-table-row');
		expect(within(firstRow).getAllByRole('button')[0]).toHaveClass(
			'clickable-cell',
		);
	});
});

const setSearchTerm = jest.fn();
describe('WidgetHeader -', () => {
	it('global search option should be working', () => {
		const { getByText, getByTestId } = render(
			<WidgetHeader {...WidgetHeaderProps} setSearchTerm={setSearchTerm} />,
		);
		expect(getByText('Table - Panel')).toBeInTheDocument();
		const searchWidget = getByTestId('widget-header-search');
		expect(searchWidget).toBeInTheDocument();
		// click and open the search input
		fireEvent.click(searchWidget);
		// check if input is opened
		const searchInput = getByTestId('widget-header-search-input');
		expect(searchInput).toBeInTheDocument();

		// enter search term
		fireEvent.change(searchInput, { target: { value: 'frontend' } });
		// check if search term is set
		expect(setSearchTerm).toHaveBeenCalledWith('frontend');
		expect(searchInput).toHaveValue('frontend');
	});

	it('global search should not be present for non-table panel', () => {
		const { queryByTestId } = render(
			<WidgetHeader
				{...WidgetHeaderProps}
				widget={{ ...WidgetHeaderProps.widget, panelTypes: 'chart' }}
			/>,
		);
		expect(queryByTestId('widget-header-search')).not.toBeInTheDocument();
	});
});
