import { server } from 'mocks-server/server';
import { render, screen, userEvent } from 'tests/test-utils';

import InviteMembers from '../InviteMembers';

import { createRolesHandler, createSuccessHandler } from './testUtils';

describe('InviteMembers - Row Management', () => {
	beforeEach(() => {
		server.use(createRolesHandler(), createSuccessHandler());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('adds a row when "Add another" is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<InviteMembers initialRowCount={2} />);

		expect(screen.getAllByPlaceholderText('e.g. john@signoz.io')).toHaveLength(2);

		await user.click(screen.getByRole('button', { name: /add another/i }));

		expect(screen.getAllByPlaceholderText('e.g. john@signoz.io')).toHaveLength(3);
	});

	it('removes a row when trash button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<InviteMembers initialRowCount={3} />);

		const removeButtons = screen.getAllByRole('button', { name: /remove row/i });
		expect(removeButtons).toHaveLength(3);

		await user.click(removeButtons[0]);

		expect(screen.getAllByPlaceholderText('e.g. john@signoz.io')).toHaveLength(2);
	});

	it('respects minRows constraint when removing rows', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<InviteMembers initialRowCount={2} minRows={2} />);

		expect(screen.queryAllByRole('button', { name: /remove row/i })).toHaveLength(
			0,
		);

		await user.click(screen.getByRole('button', { name: /add another/i }));

		const removeButtons = screen.getAllByRole('button', { name: /remove row/i });
		expect(removeButtons).toHaveLength(3);

		await user.click(removeButtons[0]);

		expect(screen.getAllByPlaceholderText('e.g. john@signoz.io')).toHaveLength(2);
		expect(screen.queryAllByRole('button', { name: /remove row/i })).toHaveLength(
			0,
		);
	});

	it('cannot remove rows below minRows=1 default', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<InviteMembers initialRowCount={2} />);

		const removeButtons = screen.getAllByRole('button', { name: /remove row/i });
		await user.click(removeButtons[0]);

		expect(screen.getAllByPlaceholderText('e.g. john@signoz.io')).toHaveLength(1);
		expect(screen.queryAllByRole('button', { name: /remove row/i })).toHaveLength(
			0,
		);
	});

	it('preserves data in other rows when removing one', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<InviteMembers initialRowCount={3} />);

		const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
		await user.type(emailInputs[0], 'first@signoz.io');
		await user.type(emailInputs[2], 'third@signoz.io');

		const removeButtons = screen.getAllByRole('button', { name: /remove row/i });
		await user.click(removeButtons[1]);

		const remainingInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
		expect(remainingInputs).toHaveLength(2);
		expect(remainingInputs[0]).toHaveValue('first@signoz.io');
		expect(remainingInputs[1]).toHaveValue('third@signoz.io');
	});
});
