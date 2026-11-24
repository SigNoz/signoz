import { render, screen, userEvent } from 'tests/test-utils';

import PrettyView from '../PrettyView';

jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [{}, jest.fn()],
}));

jest.mock('@signozhq/ui/toast', () => ({
	...jest.requireActual('@signozhq/ui/toast'),
	toast: { success: jest.fn(), danger: jest.fn() },
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

		await user.click(screen.getByTestId('pretty-view-actions-resource'));
		await user.click(await screen.findByRole('menuitem', { name: 'Copy Value' }));

		expect(screen.getByText(/checkout/)).toBeInTheDocument();
	});
});
