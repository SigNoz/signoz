import WidgetHeader from 'container/GridCardLayout/WidgetHeader';
import { DownloadFileName } from 'container/Download/Download.types';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { fireEvent, render, screen } from 'tests/test-utils';

import { QueryTable } from '../QueryTable';
import { createGenericDownloadableData } from '../utils';
import { QueryTableProps, WidgetHeaderProps } from './mocks';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: ``,
	}),
}));

// Mock useDashabord hook
jest.mock('providers/Dashboard/store/useDashboardStore', () => ({
	useDashboardStore: (): any => ({
		dashboardData: {
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

jest.mock('container/Download/Download', () => ({
	__esModule: true,
	default: ({
		data,
		fileName,
	}: {
		data: Record<string, string>[];
		fileName: DownloadFileName;
	}): JSX.Element => (
		<div
			data-testid="download-props"
			data-file-name={typeof fileName === 'string' ? fileName : ''}
			data-file-name-type={typeof fileName}
		>
			{JSON.stringify(data)}
		</div>
	),
}));

describe('QueryTable -', () => {
	it('should render correctly with all the data rows', () => {
		const { container } = render(<QueryTable {...QueryTableProps} />);
		const tableRows = container.querySelectorAll('tr.ant-table-row');
		expect(tableRows).toHaveLength(QueryTableProps.queryTableData.rows.length);
	});

	it('should render correctly with searchTerm', () => {
		const { container } = render(
			<QueryTable {...QueryTableProps} searchTerm="frontend" />,
		);
		const tableRows = container.querySelectorAll('tr.ant-table-row');
		expect(tableRows).toHaveLength(3);
	});

	it('should use custom download data without appending an empty service name', () => {
		const dataFormatter = jest.fn(
			(
				rows: RowData[],
				columns: Parameters<typeof createGenericDownloadableData>[1],
			) => createGenericDownloadableData(rows, columns),
		);

		render(
			<QueryTable
				{...QueryTableProps}
				columns={[
					{
						title: 'count()',
						dataIndex: 'A',
					},
					{
						title: 'service.name',
						dataIndex: 'service_name',
					},
				]}
				dataSource={[
					{
						key: '1',
						timestamp: 1,
						A: 11.5,
						service_name: 'csv-export-test',
					},
				]}
				downloadOption={{
					isDownloadEnabled: true,
					fileName: 'traces-explorer-table',
					dataFormatter,
				}}
			/>,
		);

		const downloadProps = screen.getByTestId('download-props');
		expect(downloadProps).toHaveAttribute(
			'data-file-name',
			'traces-explorer-table',
		);
		expect(dataFormatter).toHaveBeenCalled();
		expect(downloadProps.textContent).toContain('count()');
		expect(downloadProps.textContent).toContain('service.name');
		expect(downloadProps.textContent).not.toContain('"A"');
	});

	it('should not render download action when there is no downloadable data', () => {
		render(
			<QueryTable
				{...QueryTableProps}
				columns={[
					{
						title: 'count()',
						dataIndex: 'A',
					},
				]}
				dataSource={[]}
				downloadOption={{
					isDownloadEnabled: true,
					fileName: 'traces-explorer-table',
					dataFormatter: createGenericDownloadableData,
				}}
			/>,
		);

		expect(screen.queryByTestId('download-props')).not.toBeInTheDocument();
	});

	it('should not render download action for an empty count aggregate result', () => {
		render(
			<QueryTable
				{...QueryTableProps}
				columns={[
					{
						title: 'count()',
						dataIndex: 'A',
					},
				]}
				dataSource={[
					{
						key: '1',
						A: 0,
					},
				]}
				downloadOption={{
					isDownloadEnabled: true,
					fileName: 'traces-explorer-table',
					dataFormatter: createGenericDownloadableData,
					isDataDownloadable: (data): boolean =>
						data.length > 0 && data[0]['count()'] !== '0',
				}}
			/>,
		);

		expect(screen.queryByTestId('download-props')).not.toBeInTheDocument();
	});

	it('should preserve columns that share the same visible title', () => {
		render(
			<QueryTable
				{...QueryTableProps}
				columns={[
					{
						title: 'count()',
						dataIndex: 'A',
					},
					{
						title: 'count()',
						dataIndex: 'B',
					},
				]}
				dataSource={[
					{
						key: '1',
						A: 11,
						B: 22,
					},
				]}
				downloadOption={{
					isDownloadEnabled: true,
					fileName: 'traces-explorer-table',
					dataFormatter: createGenericDownloadableData,
				}}
			/>,
		);

		const downloadProps = screen.getByTestId('download-props');
		expect(downloadProps.textContent).toContain('"count()":"11"');
		expect(downloadProps.textContent).toContain('"count() (B)":"22"');
	});

	it('should pass a function-style filename through unchanged', () => {
		render(
			<QueryTable
				{...QueryTableProps}
				downloadOption={{
					isDownloadEnabled: true,
					fileName: (): string => 'lazy-file-name',
				}}
			/>,
		);

		expect(screen.getByTestId('download-props')).toHaveAttribute(
			'data-file-name-type',
			'function',
		);
	});

	it('should use block download placement only when requested', () => {
		const { container, unmount } = render(
			<QueryTable
				{...QueryTableProps}
				downloadOption={{
					isDownloadEnabled: true,
					fileName: 'table-export',
				}}
			/>,
		);

		expect(
			container.querySelector('.query-table--download-block'),
		).not.toBeInTheDocument();

		unmount();

		const { container: blockContainer } = render(
			<QueryTable
				{...QueryTableProps}
				downloadOption={{
					isDownloadEnabled: true,
					fileName: 'table-export',
					placement: 'block',
				}}
			/>,
		);

		expect(
			blockContainer.querySelector('.query-table--download-block'),
		).toBeInTheDocument();
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
