import { render, screen } from 'tests/test-utils';

import type { DslGrammar } from '../../dsl/types';
import FilterZone from '../FilterZone';

const grammar = {
	fields: [{ key: 'name', type: 'string' }],
	dynamicKey: { detail: 'field', prefix: '' },
} as const satisfies DslGrammar;

const source = {
	dynamicKeys: [],
	valuesByKey: {},
	creatorEmails: [],
};

describe('FilterZone', () => {
	it('offers the Created-by chip when creator options are given', () => {
		render(
			<FilterZone
				query=""
				grammar={grammar}
				testIdPrefix="things"
				creatorOptions={[{ email: 'ada@example.com', label: 'Ada' }]}
				source={source}
				onQueryChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('things-filter-created-by')).toBeInTheDocument();
		expect(screen.getByTestId('things-filter-updated')).toBeInTheDocument();
	});

	it('drops the Created-by chip for an entity without a creator', () => {
		render(
			<FilterZone
				query=""
				grammar={grammar}
				testIdPrefix="things"
				source={source}
				onQueryChange={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('things-filter-created-by'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('things-filter-updated')).toBeInTheDocument();
	});
});
