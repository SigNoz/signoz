/* eslint-disable react/jsx-props-no-spreading */
import WidgetHeader from 'container/GridCardLayout/WidgetHeader';
import { fireEvent, render } from 'tests/test-utils';

import { QueryTable } from '../QueryTable';
import { QueryTableProps, WidgetHeaderProps } from './mocks';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: ``,
	}),
}));

// Mock useDashabord hook
jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): any => ({
		selectedDashboard: {
			data: {
				variables: [],
			},
		},
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('QueryTable -', () => {
	it('should render correctly with all the data rows', () => {
		const { container } = render(<QueryTable {...QueryTableProps} />);
		const tableRows = container.querySelectorAll('tr.ant-table-row');
		expect(tableRows.length).toBe(QueryTableProps.queryTableData.rows.length);
	});

	it('should render correctly with searchTerm', () => {
		const { container } = render(
			<QueryTable {...QueryTableProps} searchTerm="frontend" />,
		);
		const tableRows = container.querySelectorAll('tr.ant-table-row');
		expect(tableRows.length).toBe(3);
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
