/* eslint-disable */
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from 'tests/test-utils';

import QueryAddOns from '../QueryV2/QueryAddOns/QueryAddOns';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

// Mocks: only what is required for this component to render and for us to assert handler calls
const mockHandleChangeQueryData = jest.fn();
const mockHandleSetQueryData = jest.fn();

jest.mock('hooks/queryBuilder/useQueryBuilderOperations', () => ({
	useQueryOperations: () => ({
		handleChangeQueryData: mockHandleChangeQueryData,
	}),
}));

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: () => ({
		handleSetQueryData: mockHandleSetQueryData,
	}),
}));

jest.mock('container/QueryBuilder/filters/GroupByFilter/GroupByFilter', () => ({
	GroupByFilter: ({ onChange }: any) => (
		<button data-testid="groupby" onClick={() => onChange(['service.name'])}>
			GroupByFilter
		</button>
	),
}));

jest.mock('container/QueryBuilder/filters/OrderByFilter/OrderByFilter', () => ({
	OrderByFilter: ({ onChange }: any) => (
		<button
			data-testid="orderby"
			onClick={() => onChange([{ columnName: 'duration', order: 'desc' }])}
		>
			OrderByFilter
		</button>
	),
}));

jest.mock('../QueryV2/QueryAddOns/HavingFilter/HavingFilter', () => ({
	__esModule: true,
	default: ({ onChange, onClose }: any) => (
		<div>
			<button data-testid="having-change" onClick={() => onChange('p99 > 500')}>
				HavingFilter
			</button>
			<button data-testid="having-close" onClick={onClose}>
				close
			</button>
		</div>
	),
}));

// ReduceToFilter is not mocked - we test the actual Ant Design Select component

function baseQuery(overrides: Partial<any> = {}): any {
	return {
		dataSource: DataSource.TRACES,
		aggregations: [{ id: 'a', operator: 'count' }],
		groupBy: [],
		orderBy: [],
		legend: '',
		limit: null,
		having: { expression: '' },
		...overrides,
	};
}

describe('QueryAddOns', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('VALUE panel: no sections auto-open when query has no active add-ons', () => {
		render(
			<QueryAddOns
				query={baseQuery()}
				version="v5"
				isListViewPanel={false}
				showReduceTo
				panelType={PANEL_TYPES.VALUE}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		expect(screen.queryByTestId('legend-format-content')).not.toBeInTheDocument();
		expect(screen.queryByTestId('reduce-to-content')).not.toBeInTheDocument();
		expect(screen.queryByTestId('order-by-content')).not.toBeInTheDocument();
		expect(screen.queryByTestId('limit-content')).not.toBeInTheDocument();
		expect(screen.queryByTestId('group-by-content')).not.toBeInTheDocument();
		expect(screen.queryByTestId('having-content')).not.toBeInTheDocument();
	});

	it('hides group-by section for METRICS even if groupBy is set in query', () => {
		render(
			<QueryAddOns
				query={baseQuery({
					dataSource: DataSource.METRICS,
					groupBy: ['service.name'],
				})}
				version="v5"
				isListViewPanel={false}
				showReduceTo={false}
				panelType={PANEL_TYPES.TIME_SERIES}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		expect(screen.queryByTestId('group-by-content')).not.toBeInTheDocument();
	});

	it('defaults to Order By open in list view panel', () => {
		render(
			<QueryAddOns
				query={baseQuery()}
				version="v5"
				isListViewPanel
				showReduceTo={false}
				panelType={PANEL_TYPES.LIST}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		expect(screen.getByTestId('order-by-content')).toBeInTheDocument();
	});

	it('limit input auto-opens when limit is set and changing it calls handler', async () => {
		render(
			<QueryAddOns
				query={baseQuery({ limit: 5 })}
				version="v5"
				isListViewPanel={false}
				showReduceTo={false}
				panelType={PANEL_TYPES.TIME_SERIES}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		const input = screen.getByTestId('input-Limit') as HTMLInputElement;
		expect(screen.getByTestId('limit-content')).toBeInTheDocument();
		expect(input.value).toBe('5');

		fireEvent.change(input, { target: { value: '10' } });
		expect(mockHandleChangeQueryData).toHaveBeenCalledWith('limit', 10);
	});

	it('auto-opens Order By and Limit when present in query', () => {
		const query = baseQuery({
			orderBy: [{ columnName: 'duration', order: 'desc' }],
			limit: 7,
		});
		render(
			<QueryAddOns
				query={query}
				version="v5"
				isListViewPanel={false}
				showReduceTo={false}
				panelType={PANEL_TYPES.TIME_SERIES}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		expect(screen.getByTestId('order-by-content')).toBeInTheDocument();
		const limitInput = screen.getByTestId('input-Limit') as HTMLInputElement;
		expect(screen.getByTestId('limit-content')).toBeInTheDocument();
		expect(limitInput.value).toBe('7');
	});

	it('shows reduce-to add-on when showReduceTo is true', () => {
		render(
			<QueryAddOns
				query={baseQuery()}
				version="v5"
				isListViewPanel={false}
				showReduceTo
				panelType={PANEL_TYPES.TIME_SERIES}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		expect(screen.getByTestId('query-add-on-reduce_to')).toBeInTheDocument();
	});

	it('auto-opens reduce-to content when reduceTo is set', () => {
		render(
			<QueryAddOns
				query={baseQuery({ reduceTo: ReduceOperators.SUM })}
				version="v5"
				isListViewPanel={false}
				showReduceTo
				panelType={PANEL_TYPES.TIME_SERIES}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		expect(screen.getByTestId('reduce-to-content')).toBeInTheDocument();
	});

	it('calls handleSetQueryData when reduce-to value changes', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const query = baseQuery({
			reduceTo: ReduceOperators.AVG,
			aggregations: [
				{ id: 'a', operator: 'count', reduceTo: ReduceOperators.AVG },
			],
		});
		render(
			<QueryAddOns
				query={query}
				version="v5"
				isListViewPanel={false}
				showReduceTo
				panelType={PANEL_TYPES.TIME_SERIES}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		// Wait for the reduce-to content section to be visible (it auto-opens when reduceTo is set)
		await waitFor(() => {
			expect(screen.getByTestId('reduce-to-content')).toBeInTheDocument();
		});

		// Get the Select component by its role (combobox)
		// The Select is within the reduce-to-content section
		const reduceToContent = screen.getByTestId('reduce-to-content');
		const selectCombobox = within(reduceToContent).getByRole('combobox');

		// Open the dropdown by clicking on the combobox
		await user.click(selectCombobox);

		// Wait for the dropdown listbox to appear
		await screen.findByRole('listbox');

		// Find and click the "Sum" option
		const sumOption = await screen.findByText('Sum of values in timeframe');
		await user.click(sumOption);

		// Verify the handler was called with the correct value
		await waitFor(() => {
			expect(mockHandleSetQueryData).toHaveBeenCalledWith(0, {
				...query,
				aggregations: [
					{
						...(query.aggregations?.[0] as any),
						reduceTo: ReduceOperators.SUM,
					},
				],
			});
		});
	});
});
