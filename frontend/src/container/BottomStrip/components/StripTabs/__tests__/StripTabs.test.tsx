import { render, screen, userEvent } from 'tests/test-utils';

import type { StripTabItem } from '../../../types';
import StripTabs from '../StripTabs';

const ITEMS: StripTabItem[] = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Beta', isActive: true },
];

describe('StripTabs', () => {
	it('renders nothing without tabs', () => {
		render(
			<StripTabs
				items={[]}
				onSelect={jest.fn()}
				onClose={jest.fn()}
				testId="tabs"
			/>,
		);

		expect(screen.queryByTestId('tabs')).not.toBeInTheDocument();
	});

	it('passes the tab id back on select and on close', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSelect = jest.fn() as jest.MockedFunction<(id: string) => void>;
		const onClose = jest.fn() as jest.MockedFunction<(id: string) => void>;
		render(
			<StripTabs
				items={ITEMS}
				onSelect={onSelect}
				onClose={onClose}
				testId="tabs"
			/>,
		);

		await user.click(screen.getByTestId('tabs-a-open'));
		await user.click(screen.getByTestId('tabs-b-close'));

		expect(onSelect.mock.calls).toStrictEqual([['a']]);
		expect(onClose.mock.calls).toStrictEqual([['b']]);
	});

	it('marks only the active tab as current', () => {
		render(
			<StripTabs
				items={ITEMS}
				onSelect={jest.fn()}
				onClose={jest.fn()}
				testId="tabs"
			/>,
		);

		expect(screen.getByTestId('tabs-b-open')).toHaveAttribute(
			'aria-current',
			'true',
		);
		expect(screen.getByTestId('tabs-a-open')).not.toHaveAttribute('aria-current');
	});
});
