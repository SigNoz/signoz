import { render, screen } from 'tests/test-utils';

import QueryFooter from '../QueryV2/QueryFooter/QueryFooter';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): {
		currentQuery: { builder: { queryData: unknown[] } };
		panelType: string;
	} => ({
		currentQuery: { builder: { queryData: [] } },
		panelType: 'time_series',
	}),
}));

const noop = (): void => {};

describe('QueryFooter', () => {
	it('offers both buttons by default', () => {
		render(
			<QueryFooter
				addNewBuilderQuery={noop}
				addNewFormula={noop}
				showAddTraceOperator={false}
			/>,
		);

		expect(screen.getByTestId('add-new-query-button')).toBeInTheDocument();
		expect(screen.getByTestId('add-formula-button')).toBeInTheDocument();
	});

	// A kind whose request takes a single query (Heatmap) hides the button outright
	// rather than disabling it — a query it adds is one the builder cannot render.
	it('drops the Add New Query button when the caller withholds it', () => {
		render(
			<QueryFooter
				addNewBuilderQuery={noop}
				addNewFormula={noop}
				showAddQuery={false}
				showAddTraceOperator={false}
			/>,
		);

		expect(screen.queryByTestId('add-new-query-button')).not.toBeInTheDocument();
		expect(screen.getByTestId('add-formula-button')).toBeInTheDocument();
	});
});
