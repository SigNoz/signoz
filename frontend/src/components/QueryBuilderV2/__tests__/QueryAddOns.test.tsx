/* eslint-disable */
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import QueryAddOns from '../QueryV2/QueryAddOns/QueryAddOns';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';

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

jest.mock(
	'container/QueryBuilder/filters/ReduceToFilter/ReduceToFilter',
	() => ({
		ReduceToFilter: ({ onChange }: any) => (
			<button data-testid="reduce-to" onClick={() => onChange('sum')}>
				ReduceToFilter
			</button>
		),
	}),
);

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

	it('limit input auto-opens when limit is set and changing it calls handler', () => {
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
});
