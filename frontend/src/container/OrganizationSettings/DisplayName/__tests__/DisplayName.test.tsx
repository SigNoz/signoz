import { toast } from '@signozhq/ui';
import { rest, server } from 'mocks-server/server';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import DisplayName from '../index';

jest.mock('@signozhq/ui', () => ({
	...jest.requireActual('@signozhq/ui'),
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

const ORG_ME_ENDPOINT = '*/api/v2/orgs/me';

const defaultProps = { index: 0, id: 'does-not-matter-id' };

describe('DisplayName', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders form pre-filled with org displayName from context', async () => {
		render(<DisplayName {...defaultProps} />);

		const input = await screen.findByRole('textbox');
		expect(input).toHaveValue('Pentagon');

		expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
	});

	it('enables submit and calls PUT when display name is changed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(rest.put(ORG_ME_ENDPOINT, (_, res, ctx) => res(ctx.status(200))));

		render(<DisplayName {...defaultProps} />);

		const input = await screen.findByRole('textbox');
		await user.clear(input);
		await user.type(input, 'New Org Name');

		const submitBtn = screen.getByRole('button', { name: /submit/i });
		expect(submitBtn).toBeEnabled();

		await user.click(submitBtn);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalled();
		});
	});

	it('shows validation error when display name is cleared and submitted', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<DisplayName {...defaultProps} />);

		const input = await screen.findByRole('textbox');
		await user.clear(input);

		const form = input.closest('form') as HTMLFormElement;
		fireEvent.submit(form);

		await waitFor(() => {
			expect(screen.getByText(/missing display name/i)).toBeInTheDocument();
		});
	});
});
