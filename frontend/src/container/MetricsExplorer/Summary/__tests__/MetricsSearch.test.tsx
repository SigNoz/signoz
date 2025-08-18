import { fireEvent, render, screen } from '@testing-library/react';
import { initialQueriesMap } from 'constants/queryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import MetricsSearch from '../MetricsSearch';

jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="date-time-selection">DateTime</div>
	),
}));

const mockQuery: IBuilderQuery = {
	...initialQueriesMap.metrics.builder.queryData[0],
};
const mockOnChange = jest.fn();

describe('MetricsSearch', () => {
	it('should render the search bar, run button and date-time selector', () => {
		render(<MetricsSearch query={mockQuery} onChange={mockOnChange} />);
		expect(screen.getByText('DateTime')).toBeInTheDocument();
		expect(screen.getByText('Stage & Run Query')).toBeInTheDocument();
		expect(screen.getByTestId('qb-search-container')).toBeInTheDocument();
	});

	it('should call onChange with parsed filters when Stage & Run is clicked and expression is present', () => {
		render(<MetricsSearch query={mockQuery} onChange={mockOnChange} />);
		fireEvent.click(screen.getByText('Stage & Run Query'));
		expect(mockOnChange).toHaveBeenCalledWith({
			items: [],
			op: 'AND',
		});
	});
});
