import { toast } from '@signozhq/ui/toast';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import DisplayName from '../index';

jest.mock('@signozhq/ui/toast', () => ({
	...jest.requireActual('@signozhq/ui/toast'),
	toast: {
		success: jest.fn(),
		danger: jest.fn(),
	},
}));

const ORG_ME_ENDPOINT = '*/api/v2/orgs/me';

const defaultProps = { index: 0, id: 'does-not-matter-id' };

describe('DisplayName', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders form pre-filled with org displayName from context', async () => {
		render(<DisplayName {...defaultProps} />);

		const input = await screen.findByTestId('org-display-name-input');
		expect(input).toHaveValue('Pentagon');

		await waitFor(() =>
			expect(screen.getByTestId('org-display-name-submit')).toHaveAttribute(
				'aria-disabled',
				'true',
			),
		);
	});

	it('enables submit and calls PUT when display name is changed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(rest.put(ORG_ME_ENDPOINT, (_, res, ctx) => res(ctx.status(200))));

		render(<DisplayName {...defaultProps} />);

		const input = await screen.findByTestId('org-display-name-input');
		await waitFor(() => expect(input).toBeEnabled());
		await user.clear(input);
		await user.type(input, 'New Org Name');

		const submitBtn = screen.getByTestId('org-display-name-submit');
		await waitFor(() =>
			expect(submitBtn).not.toHaveAttribute('aria-disabled', 'true'),
		);

		await user.click(submitBtn);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalled();
		});
	});

	it('shows validation error when display name is cleared and submitted', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<DisplayName {...defaultProps} />);

		const input = await screen.findByTestId('org-display-name-input');
		await waitFor(() => expect(input).toBeEnabled());
		await user.clear(input);

		const form = input.closest('form') as HTMLFormElement;
		fireEvent.submit(form);

		await waitFor(() => {
			expect(screen.getByText(/missing display name/i)).toBeInTheDocument();
		});
	});
});
