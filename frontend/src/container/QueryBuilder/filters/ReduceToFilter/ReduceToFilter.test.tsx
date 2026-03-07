import { render, screen } from '@testing-library/react';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { ReduceOperators } from 'types/common/queryBuilder';

import { ReduceToFilter } from './ReduceToFilter';

const mockOnChange = jest.fn();

function baseQuery(overrides: Partial<IBuilderQuery> = {}): IBuilderQuery {
	return {
		dataSource: 'traces',
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
		render(<ReduceToFilter query={baseQuery()} onChange={mockOnChange} />);

		expect(screen.getByTestId('reduce-to')).toBeInTheDocument();
		expect(
			screen.getByText('Average of values in timeframe'),
		).toBeInTheDocument();
	});

	it('initializes from query.aggregations[0].reduceTo', () => {
		render(
			<ReduceToFilter
				query={baseQuery({
					aggregations: [
						{
							reduceTo: ReduceOperators.SUM,
							metricName: 'test',
							temporality: '',
							timeAggregation: 'sum',
							spaceAggregation: 'sum',
						},
					],
					aggregateAttribute: { key: 'test', type: MetricType.SUM },
				})}
				onChange={mockOnChange}
			/>,
		);

		expect(screen.getByText('Sum of values in timeframe')).toBeInTheDocument();
	});

	it('initializes from query.reduceTo when aggregations[0].reduceTo is not set', () => {
		render(
			<ReduceToFilter
				query={baseQuery({
					reduceTo: ReduceOperators.MAX,
					aggregateAttribute: { key: 'test', type: MetricType.GAUGE },
				})}
				onChange={mockOnChange}
			/>,
		);

		expect(screen.getByText('Max of values in timeframe')).toBeInTheDocument();
	});
});
