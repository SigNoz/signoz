import { server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import InviteMembers from '../InviteMembers';

import {
	createRolesHandler,
	createSuccessHandler,
	INVALID_EMAIL,
	VALID_EMAIL,
} from './testUtils';

describe('InviteMembers - Validation', () => {
	beforeEach(() => {
		server.use(createRolesHandler(), createSuccessHandler());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('email validation', () => {
		it('shows email validation error when email is invalid and role is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], INVALID_EMAIL);
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));

			await expect(
				screen.findByText('Please enter valid emails for team members'),
			).resolves.toBeInTheDocument();
		});

		it('shows inline error for invalid email field', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], INVALID_EMAIL);
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));

			await expect(
				screen.findByText('Invalid email address'),
			).resolves.toBeInTheDocument();
		});

		it('clears validation error when email is corrected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], INVALID_EMAIL);
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));
			await user.click(screen.getByTestId('submit-btn'));

			await expect(
				screen.findByText('Please enter valid emails for team members'),
			).resolves.toBeInTheDocument();

			await user.clear(emailInputs[0]);
			await user.type(emailInputs[0], VALID_EMAIL);

			await waitFor(() => {
				expect(
					screen.queryByText('Please enter valid emails for team members'),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('role validation', () => {
		it('shows role validation error when role is missing', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], VALID_EMAIL);

			await user.click(screen.getByTestId('submit-btn'));

			await expect(
				screen.findByText('Please select roles for team members'),
			).resolves.toBeInTheDocument();
		});

		it('clears role validation error when role is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], VALID_EMAIL);
			await user.click(screen.getByTestId('submit-btn'));

			await expect(
				screen.findByText('Please select roles for team members'),
			).resolves.toBeInTheDocument();

			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await waitFor(() => {
				expect(
					screen.queryByText('Please select roles for team members'),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('combined validation', () => {
		it('shows combined error when both email and role are invalid', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], INVALID_EMAIL);

			await user.click(screen.getByTestId('submit-btn'));

			await expect(
				screen.findByText(
					'Please enter valid emails and select roles for team members',
				),
			).resolves.toBeInTheDocument();
		});
	});

	describe('touched rows', () => {
		it('only validates touched rows (rows with email or role)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					initialRowCount={3}
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], VALID_EMAIL);
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));

			expect(
				screen.queryByTestId('invite-validation-error'),
			).not.toBeInTheDocument();
		});
	});
});
