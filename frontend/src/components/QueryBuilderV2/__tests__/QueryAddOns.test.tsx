import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from 'tests/test-utils';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

import QueryAddOns from '../QueryV2/QueryAddOns/QueryAddOns';

// Mocks: only what is required for this component to render and for us to assert handler calls
const mockHandleChangeQueryData = jest.fn();
const mockHandleSetQueryData = jest.fn();

jest.mock('hooks/queryBuilder/useQueryBuilderOperations', () => ({
	useQueryOperations: (): {
		handleChangeQueryData: typeof mockHandleChangeQueryData;
	} => ({
		handleChangeQueryData: mockHandleChangeQueryData,
	}),
}));

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): {
		handleSetQueryData: typeof mockHandleSetQueryData;
		currentQuery: { unit: string | undefined };
	} => ({
		handleSetQueryData: mockHandleSetQueryData,
		currentQuery: { unit: undefined },
	}),
}));

jest.mock('container/QueryBuilder/filters/GroupByFilter/GroupByFilter', () => ({
	GroupByFilter: ({ onChange }: any): JSX.Element => (
		<button
			data-testid="groupby"
			onClick={(): void => onChange(['service.name'])}
		>
			GroupByFilter
		</button>
	),
}));

jest.mock('container/QueryBuilder/filters/OrderByFilter/OrderByFilter', () => ({
	OrderByFilter: ({ onChange }: any): JSX.Element => (
		<button
			data-testid="orderby"
			onClick={(): void => onChange([{ columnName: 'duration', order: 'desc' }])}
		>
			OrderByFilter
		</button>
	),
}));

jest.mock('../QueryV2/QueryAddOns/HavingFilter/HavingFilter', () => ({
	__esModule: true,
	default: ({ onChange, onClose }: any): JSX.Element => (
		<div>
			<button
				data-testid="having-change"
				onClick={(): void => onChange('p99 > 500')}
			>
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
				isRawQuery={false}
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
				isRawQuery={false}
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
				isRawQuery
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
				isRawQuery={false}
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
				isRawQuery={false}
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
				isRawQuery={false}
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
				isRawQuery={false}
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
				isRawQuery={false}
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

	it('auto-generates legend from all groupBy keys when enabling Legend format with empty legend', async () => {
		const user = userEvent.setup();
		const query = baseQuery({
			groupBy: [{ key: 'service.name' }, { key: 'operation' }],
		});

		render(
			<QueryAddOns
				query={query}
				version="v5"
				isRawQuery={false}
				showReduceTo={false}
				panelType={PANEL_TYPES.TIME_SERIES}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		const legendTab = screen.getByTestId('query-add-on-legend_format');
		await user.click(legendTab);

		expect(mockHandleChangeQueryData).toHaveBeenCalledWith(
			'legend',
			'service.name = {{service.name}}, operation = {{operation}}',
		);
	});

	it('does not override existing legend when enabling Legend format', async () => {
		const user = userEvent.setup();
		const query = baseQuery({
			legend: 'existing legend',
			groupBy: [{ key: 'service.name' }],
		});

		render(
			<QueryAddOns
				query={query}
				version="v5"
				isRawQuery={false}
				showReduceTo={false}
				panelType={PANEL_TYPES.TIME_SERIES}
				index={0}
				isForTraceOperator={false}
			/>,
		);

		const legendTab = screen.getByTestId('query-add-on-legend_format');
		await user.click(legendTab);

		expect(mockHandleChangeQueryData).not.toHaveBeenCalledWith(
			'legend',
			expect.anything(),
		);
	});
	describe('bucket options', () => {
		function renderHeatmap(overrides: Partial<any> = {}): void {
			render(
				<QueryAddOns
					query={baseQuery({ dataSource: DataSource.METRICS, ...overrides })}
					version="v5"
					isRawQuery={false}
					showReduceTo={false}
					panelType={PANEL_TYPES.HEATMAP}
					index={0}
					isForTraceOperator={false}
				/>,
			);
		}

		it('is offered on a metrics heatmap only', () => {
			renderHeatmap();

			expect(
				screen.getByTestId('query-add-on-bucket_options'),
			).toBeInTheDocument();
		});

		it('is not offered on other panel types', () => {
			render(
				<QueryAddOns
					query={baseQuery({ dataSource: DataSource.METRICS })}
					version="v5"
					isRawQuery={false}
					showReduceTo={false}
					panelType={PANEL_TYPES.TIME_SERIES}
					index={0}
					isForTraceOperator={false}
				/>,
			);

			expect(
				screen.queryByTestId('query-add-on-bucket_options'),
			).not.toBeInTheDocument();
		});

		it('is not offered on a heatmap over another signal', () => {
			render(
				<QueryAddOns
					query={baseQuery({ dataSource: DataSource.LOGS })}
					version="v5"
					isRawQuery={false}
					showReduceTo={false}
					panelType={PANEL_TYPES.HEATMAP}
					index={0}
					isForTraceOperator={false}
				/>,
			);

			expect(
				screen.queryByTestId('query-add-on-bucket_options'),
			).not.toBeInTheDocument();
		});

		it("auto-opens on the query's own kind", () => {
			renderHeatmap({ bucketOptions: { kind: 'log', spec: { scale: 0 } } });

			expect(screen.getByTestId('bucket-options-content')).toBeInTheDocument();
			expect(screen.getByRole('radio', { name: 'Log' })).toBeChecked();
			expect(screen.getByRole('radio', { name: '1' })).toBeChecked();
		});

		it('sends no options for Auto', async () => {
			const user = userEvent.setup();
			renderHeatmap({ bucketOptions: { kind: 'log', spec: { scale: 0 } } });

			await user.click(screen.getByRole('radio', { name: 'Auto' }));

			expect(mockHandleChangeQueryData).toHaveBeenCalledWith(
				'bucketOptions',
				undefined,
			);
		});

		it('sends the scale the picked bands per doubling resolve to', async () => {
			const user = userEvent.setup();
			renderHeatmap({ bucketOptions: { kind: 'log', spec: { scale: 4 } } });

			await user.click(screen.getByRole('radio', { name: '1' }));

			expect(mockHandleChangeQueryData).toHaveBeenCalledWith('bucketOptions', {
				kind: 'log',
				spec: { scale: 0 },
			});
		});

		it('previews the bounds the picked axis will carry', () => {
			renderHeatmap({ bucketOptions: { kind: 'log', spec: { scale: 0 } } });

			const bounds = within(screen.getByTestId('bucket-options-bounds'));
			['1', '2', '4', '8', '16', '32', '64', '128', '+Inf'].forEach((bound) => {
				expect(bounds.getByText(bound)).toBeInTheDocument();
			});
		});

		it('sends nothing for a linear axis until it has a max value', async () => {
			const user = userEvent.setup();
			renderHeatmap({ bucketOptions: { kind: 'log', spec: { scale: 0 } } });

			await user.click(screen.getByRole('radio', { name: 'Linear' }));

			expect(mockHandleChangeQueryData).toHaveBeenLastCalledWith(
				'bucketOptions',
				undefined,
			);
			expect(
				screen.getByText('Set a max value to see the bounds'),
			).toBeInTheDocument();
		});

		it('sends the linear axis once a max value is filled in', async () => {
			const user = userEvent.setup();
			renderHeatmap({ bucketOptions: { kind: 'log', spec: { scale: 0 } } });

			await user.click(screen.getByRole('radio', { name: 'Linear' }));
			await user.type(screen.getByTestId('bucket-options-max-value'), '500');

			await waitFor(() => {
				expect(mockHandleChangeQueryData).toHaveBeenLastCalledWith(
					'bucketOptions',
					{ kind: 'linear', spec: { maxValue: 500 } },
				);
			});
		});

		it('closes back to the toggle bar', async () => {
			const user = userEvent.setup();
			renderHeatmap({ bucketOptions: { kind: 'log', spec: { scale: 0 } } });

			await user.click(screen.getByTestId('bucket-options-close'));

			expect(
				screen.queryByTestId('bucket-options-content'),
			).not.toBeInTheDocument();
		});
	});
});
