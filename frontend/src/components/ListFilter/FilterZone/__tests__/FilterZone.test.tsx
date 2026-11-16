import { render, screen, userEvent, within } from 'tests/test-utils';

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

	it('reflects an enum chip from the draft and runs the spliced clause on change', async () => {
		const onQueryChange = jest.fn() as jest.MockedFunction<
			(value: string) => void
		>;
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<FilterZone
				query="status = 'deleted' AND name = 'ci'"
				grammar={grammar}
				testIdPrefix="things"
				source={source}
				enumChips={[
					{
						key: 'status',
						placeholder: 'Status',
						options: [
							{ value: null, label: 'All' },
							{ value: 'active', label: 'Active' },
							{ value: 'deleted', label: 'Deleted' },
						],
					},
				]}
				onQueryChange={onQueryChange}
			/>,
		);

		const chip = screen.getByTestId('things-filter-status');
		expect(within(chip).getByText('Deleted')).toBeInTheDocument();

		await user.click(within(chip).getByRole('combobox'));
		await user.click(await screen.findByTitle('Active'));

		expect(onQueryChange).toHaveBeenCalledWith(
			"status = 'active' AND name = 'ci'",
		);
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
