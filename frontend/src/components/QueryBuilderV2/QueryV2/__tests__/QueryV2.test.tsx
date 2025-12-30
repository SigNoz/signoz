import {
	initialQueriesMap,
	initialQueryBuilderFormValues,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import { QueryBuilderV2Provider } from '../../QueryBuilderV2Context';
import { QueryV2 } from '../QueryV2';

jest.mock('hooks/queryBuilder/useQueryBuilder');
jest.mock('hooks/queryBuilder/useQueryBuilderOperations');

jest.mock('container/QueryBuilder/components/QBEntityOptions/QBEntityOptions');

jest.mock('../QuerySearch/QuerySearch');

jest.mock('../MetricsSelect/MetricsSelect');

jest.mock('../MerticsAggregateSection/MetricsAggregateSection');

jest.mock('../QueryAggregation/QueryAggregation');

jest.mock('../QueryAddOns/QueryAddOns');

jest.mock(
	'container/QueryBuilder/filters/QueryBuilderSearchV2/SpanScopeSelector',
);

const mockUseQueryBuilder = jest.mocked(useQueryBuilder);
const mockUseQueryOperations = jest.mocked(useQueryOperations);

describe('QueryV2', () => {
	const mockHandleDeleteQuery = jest.fn();
	const mockHandleChangeQueryData = jest.fn();
	const mockHandleQueryFunctionsUpdates = jest.fn();
	const mockHandleChangeDataSource = jest.fn();
	const mockOnSignalSourceChange = jest.fn();

	beforeEach(() => {
		mockUseQueryBuilder.mockReturnValue({
			cloneQuery: jest.fn(),
			panelType: PANEL_TYPES.TIME_SERIES,
			updateAllQueriesOperators: jest.fn(() => initialQueriesMap.metrics),
		} as any);

		mockUseQueryOperations.mockReturnValue({
			handleDeleteQuery: mockHandleDeleteQuery,
			handleChangeQueryData: mockHandleChangeQueryData,
			handleQueryFunctionsUpdates: mockHandleQueryFunctionsUpdates,
			handleChangeDataSource: mockHandleChangeDataSource,
			operators: [],
			spaceAggregationOptions: [],
		} as any);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should show delete button when canDelete is true', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		const { container } = render(
			<QueryBuilderV2Provider>
				<QueryV2
					isAvailableToDisable={false}
					index={0}
					query={initialQueryBuilderFormValues}
					isMultiQueryAllowed
					canDelete
					version="v5"
					onSignalSourceChange={mockOnSignalSourceChange}
					signalSourceChangeEnabled={false}
					filterConfigs={{}}
				/>
			</QueryBuilderV2Provider>,
		);

		const dropdown = container.querySelector('.query-actions-dropdown');
		expect(dropdown).toBeInTheDocument();

		const trigger = dropdown?.firstElementChild as HTMLElement;
		expect(trigger).toBeTruthy();
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByText('Delete')).toBeInTheDocument();
		});
	});

	it('should hide delete button when canDelete is false', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		const { container } = render(
			<QueryBuilderV2Provider>
				<QueryV2
					isAvailableToDisable={false}
					index={0}
					query={initialQueryBuilderFormValues}
					isMultiQueryAllowed
					canDelete={false}
					version="v5"
					onSignalSourceChange={mockOnSignalSourceChange}
					signalSourceChangeEnabled={false}
					filterConfigs={{}}
				/>
			</QueryBuilderV2Provider>,
		);

		const dropdown = container.querySelector('.query-actions-dropdown');
		expect(dropdown).toBeInTheDocument();

		const trigger = dropdown?.firstElementChild as HTMLElement;
		expect(trigger).toBeTruthy();
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByText('Clone')).toBeInTheDocument();
		});

		expect(screen.queryByText('Delete')).not.toBeInTheDocument();
	});
});
