/* eslint-disable */
import { render, screen, waitFor } from '@testing-library/react';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { ReduceToFilter } from './ReduceToFilter';

const mockOnChange = jest.fn();

function baseQuery(overrides: Partial<IBuilderQuery> = {}): IBuilderQuery {
	return {
		dataSource: 'traces' as any,
		aggregations: [],
		groupBy: [],
		orderBy: [],
		legend: '',
		limit: null,
		having: { expression: '' },
		...overrides,
	} as IBuilderQuery;
}

describe('ReduceToFilter', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('initializes with default avg when no reduceTo is set', () => {
		const { container } = render(
			<ReduceToFilter query={baseQuery()} onChange={mockOnChange} />,
		);

		expect(screen.getByTestId('reduce-to')).toBeInTheDocument();
		expect(
			container.querySelector('.ant-select-selection-item'),
		).toHaveTextContent('Average of values in timeframe');
	});

	it('initializes from query.aggregations[0].reduceTo', () => {
		const { container } = render(
			<ReduceToFilter
				query={baseQuery({
					aggregations: [{ reduceTo: 'sum' } as any],
					aggregateAttribute: { key: 'test', type: MetricType.SUM },
				})}
				onChange={mockOnChange}
			/>,
		);

		expect(
			container.querySelector('.ant-select-selection-item'),
		).toHaveTextContent('Sum of values in timeframe');
	});

	it('initializes from query.reduceTo when aggregations[0].reduceTo is not set', () => {
		const { container } = render(
			<ReduceToFilter
				query={baseQuery({
					reduceTo: 'max',
					aggregateAttribute: { key: 'test', type: MetricType.GAUGE },
				})}
				onChange={mockOnChange}
			/>,
		);

		expect(
			container.querySelector('.ant-select-selection-item'),
		).toHaveTextContent('Max of values in timeframe');
	});

	it('updates to sum when aggregateAttribute.type is SUM', async () => {
		const { rerender, container } = render(
			<ReduceToFilter
				query={baseQuery({
					aggregateAttribute: { key: 'test', type: MetricType.GAUGE },
				})}
				onChange={mockOnChange}
			/>,
		);

		rerender(
			<ReduceToFilter
				query={baseQuery({
					aggregateAttribute: { key: 'test2', type: MetricType.SUM },
				})}
				onChange={mockOnChange}
			/>,
		);

		await waitFor(() => {
			expect(
				container.querySelector('.ant-select-selection-item'),
			).toHaveTextContent('Sum of values in timeframe');
		});
	});
});
