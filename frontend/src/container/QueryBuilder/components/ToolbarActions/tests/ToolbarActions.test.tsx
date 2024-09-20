import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SELECTED_VIEWS } from 'pages/LogsExplorer/utils';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';

import LeftToolbarActions from '../LeftToolbarActions';
import RightToolbarActions from '../RightToolbarActions';

describe('ToolbarActions', () => {
	it('LeftToolbarActions - renders correctly with default props', async () => {
		const handleChangeSelectedView = jest.fn();
		const handleToggleShowFrequencyChart = jest.fn();
		const { queryByTestId } = render(
			<LeftToolbarActions
				items={{
					search: {
						name: 'search',
						label: 'Search',
						disabled: false,
						show: true,
					},
					queryBuilder: {
						name: 'query-builder',
						label: 'Query Builder',
						disabled: false,
						show: true,
					},
					clickhouse: {
						name: 'clickhouse',
						label: 'Clickhouse',
						disabled: false,
					},
				}}
				selectedView={SELECTED_VIEWS.SEARCH}
				onChangeSelectedView={handleChangeSelectedView}
				onToggleHistrogramVisibility={handleToggleShowFrequencyChart}
				showFrequencyChart
				showFilter
				handleFilterVisibilityChange={(): void => {}}
			/>,
		);
		expect(screen.getByTestId('search-view')).toBeInTheDocument();
		expect(screen.getByTestId('query-builder-view')).toBeInTheDocument();

		// clickhouse should not be present as its show: false
		expect(queryByTestId('clickhouse-view')).not.toBeInTheDocument();

		await userEvent.click(screen.getByTestId('search-view'));
		expect(handleChangeSelectedView).toBeCalled();

		await userEvent.click(screen.getByTestId('query-builder-view'));
		expect(handleChangeSelectedView).toBeCalled();
	});

	it('renders - clickhouse view and test histogram toggle', async () => {
		const handleChangeSelectedView = jest.fn();
		const handleToggleShowFrequencyChart = jest.fn();
		const { queryByTestId, getByRole } = render(
			<LeftToolbarActions
				items={{
					search: {
						name: 'search',
						label: 'Search',
						disabled: false,
						show: false,
					},
					queryBuilder: {
						name: 'query-builder',
						label: 'Query Builder',
						disabled: false,
						show: true,
					},
					clickhouse: {
						name: 'clickhouse',
						label: 'Clickhouse',
						disabled: false,
						show: true,
					},
				}}
				selectedView={SELECTED_VIEWS.QUERY_BUILDER}
				onChangeSelectedView={handleChangeSelectedView}
				onToggleHistrogramVisibility={handleToggleShowFrequencyChart}
				showFrequencyChart
				showFilter
				handleFilterVisibilityChange={(): void => {}}
			/>,
		);

		const clickHouseView = queryByTestId('clickhouse-view');
		expect(clickHouseView).toBeInTheDocument();

		await userEvent.click(clickHouseView as HTMLElement);
		expect(handleChangeSelectedView).toBeCalled();

		await userEvent.click(getByRole('switch'));
		expect(handleToggleShowFrequencyChart).toBeCalled();
	});

	it('RightToolbarActions - render correctly with props', async () => {
		const onStageRunQuery = jest.fn();
		const { queryByText } = render(
			<MockQueryClientProvider>
				<RightToolbarActions onStageRunQuery={onStageRunQuery} />,
			</MockQueryClientProvider>,
		);

		const stageNRunBtn = queryByText('Stage & Run Query');
		expect(stageNRunBtn).toBeInTheDocument();
		await userEvent.click(stageNRunBtn as HTMLElement);
		expect(onStageRunQuery).toBeCalled();
	});
});
