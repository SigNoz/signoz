import { render, screen, userEvent } from 'tests/test-utils';

import ConfigMultiSelect from '../ConfigMultiSelect';

const ITEMS = [
	{ value: 'a', label: 'alpha' },
	{ value: 'b', label: 'beta' },
	{ value: 'c', label: 'gamma' },
];

async function open(): Promise<ReturnType<typeof userEvent.setup>> {
	const user = userEvent.setup();
	await user.click(
		screen
			.getByTestId('multi')
			.querySelector('.ant-select-selector') as HTMLElement,
	);
	return user;
}

describe('ConfigMultiSelect', () => {
	it('shows the placeholder while nothing is picked', () => {
		render(
			<ConfigMultiSelect
				testId="multi"
				value={[]}
				placeholder="Every group key"
				items={ITEMS}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByText('Every group key')).toBeInTheDocument();
	});

	it('keeps picks in item order, not the order they were picked', async () => {
		const onChange = jest.fn();
		render(
			<ConfigMultiSelect
				testId="multi"
				value={['c']}
				items={ITEMS}
				onChange={onChange}
			/>,
		);

		const user = await open();
		await user.click(await screen.findByRole('option', { name: 'alpha' }));

		expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);
	});
});
