import userEvent from '@testing-library/user-event';
import { render, screen, within } from 'tests/test-utils';

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

	it('runs the query when a creator is removed with the dropdown closed', async () => {
		const user = userEvent.setup();
		const onQueryChange = jest.fn();
		render(
			<FilterZone
				query="created_by = 'ada@example.com'"
				grammar={grammar}
				testIdPrefix="things"
				creatorOptions={[{ email: 'ada@example.com', label: 'Ada' }]}
				source={source}
				onQueryChange={onQueryChange}
			/>,
		);

		// antd renders the tag's × aria-hidden.
		await user.click(
			within(screen.getByTitle('Ada')).getByRole('img', {
				name: 'close',
				hidden: true,
			}),
		);

		expect(
			within(screen.getByTestId('things-filter-created-by')).getByRole('combobox'),
		).toHaveAttribute('aria-expanded', 'false');

		expect(onQueryChange).toHaveBeenCalledWith('');
	});
});
