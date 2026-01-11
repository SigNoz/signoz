/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable react/display-name */
import '@testing-library/jest-dom';

import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { render, screen } from 'tests/test-utils';
import { Having, IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { QueryV2 } from '../QueryV2';

// Local mocks for domain-specific heavy child components
jest.mock(
	'../QueryAggregation/QueryAggregation',
	() =>
		function () {
			return <div>QueryAggregation</div>;
		},
);
jest.mock(
	'../MerticsAggregateSection/MetricsAggregateSection',
	() =>
		function () {
			return <div>MetricsAggregateSection</div>;
		},
);

describe('QueryV2 - base render', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders limit input when dataSource is logs', async () => {
		const baseQuery: IBuilderQuery = {
			queryName: 'A',
			dataSource: DataSource.LOGS,
			aggregateOperator: '',
			aggregations: [],
			timeAggregation: '',
			spaceAggregation: '',
			temporality: '',
			functions: [],
			filter: undefined,
			filters: { items: [], op: 'AND' },
			groupBy: [],
			expression: '',
			disabled: false,
			having: [] as Having[],
			limit: 10,
			stepInterval: null,
			orderBy: [],
			legend: 'A',
		};

		render(
			<QueryV2
				index={0}
				isAvailableToDisable
				query={baseQuery}
				version="v4"
				onSignalSourceChange={jest.fn() as jest.MockedFunction<(v: string) => void>}
				signalSourceChangeEnabled={false}
				queriesCount={1}
				showTraceOperator={false}
				hasTraceOperator={false}
			/>,
		);

		// Ensure the Limit add-on input is present and is of type number
		const limitInput = screen.getByPlaceholderText(
			'Enter limit',
		) as HTMLInputElement;
		expect(limitInput).toBeInTheDocument();
		expect(limitInput).toHaveAttribute('type', 'number');
		expect(limitInput).toHaveAttribute('name', 'limit');
		expect(limitInput).toHaveAttribute('data-testid', 'input-Limit');

		// Clear the input and ensure it stays visible (post-mount should not auto-hide)
		const user = userEvent.setup();
		await user.click(limitInput);
		expect(limitInput.value).toBe('10');
		await user.keyboard('{Backspace>2}'); // press backspace twice
		expect(limitInput.value).toBe('');
		expect(limitInput).toBeInTheDocument();
	});
});
