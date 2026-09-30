import { render, screen, userEvent, within } from 'tests/test-utils';

import PrettyView from '../PrettyView';

jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [{}, jest.fn()],
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

describe('PrettyView', () => {
	it('keeps a nested node expanded when one of its menu actions is picked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<PrettyView
				data={{ resource: { 'service.name': 'checkout' } }}
				searchable={false}
			/>,
		);
		expect(screen.getByText(/checkout/)).toBeInTheDocument();

		const nestedRow = screen
			.getByText(/1 key/)
			.closest<HTMLElement>('.pretty-view__value-row');
		if (!nestedRow) {
			throw new Error('Nested row not found');
		}
		await user.click(within(nestedRow).getByRole('button'));
		await user.click(await screen.findByRole('menuitem', { name: 'Copy Value' }));

		expect(screen.getByText(/checkout/)).toBeInTheDocument();
	});
});
