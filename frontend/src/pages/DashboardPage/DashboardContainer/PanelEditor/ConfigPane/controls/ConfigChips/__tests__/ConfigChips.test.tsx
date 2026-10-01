import { render, screen, userEvent } from 'tests/test-utils';

import ConfigChips from '../ConfigChips';

const ITEMS = [
	{ value: 'a', label: 'alpha' },
	{ value: 'b', label: 'beta' },
	{ value: 'c', label: 'gamma' },
];

describe('ConfigChips', () => {
	it('marks the selected chips as checked', () => {
		render(
			<ConfigChips
				testId="chips"
				value={['b']}
				items={ITEMS}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByRole('checkbox', { name: 'beta' })).toBeChecked();
		expect(screen.getByRole('checkbox', { name: 'alpha' })).not.toBeChecked();
	});

	it('adds a chip in item order, not click order', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ConfigChips
				testId="chips"
				value={['c']}
				items={ITEMS}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('chips-a'));

		expect(onChange).toHaveBeenCalledWith(['a', 'c']);
	});

	it('removes a selected chip, down to none', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ConfigChips
				testId="chips"
				value={['a']}
				items={ITEMS}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('chips-a'));

		expect(onChange).toHaveBeenCalledWith([]);
	});
});
