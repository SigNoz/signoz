import { initialQueryBuilderFormValues } from 'constants/queryBuilder';
import { render } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import QueryBuilderSearchV2 from '../QueryBuilderSearchV2';

describe('SpanScopeSelector', () => {
	it('should render span scope selector when data source is TRACES', () => {
		const { getByTestId, container } = render(
			<QueryBuilderSearchV2
				query={{
					...initialQueryBuilderFormValues,
					dataSource: DataSource.TRACES,
				}}
				onChange={jest.fn()}
			/>,
		);

		expect(container).toMatchSnapshot();

		expect(getByTestId('span-scope-selector')).toBeInTheDocument();
	});

	it('should not render span scope selector for non-TRACES data sources', () => {
		const { queryByTestId } = render(
			<QueryBuilderSearchV2
				query={{
					...initialQueryBuilderFormValues,
					dataSource: DataSource.METRICS,
				}}
				onChange={jest.fn()}
			/>,
		);

		expect(queryByTestId('span-scope-selector')).not.toBeInTheDocument();
	});
});
