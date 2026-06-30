import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import InviteMembers from '../InviteMembers';

import {
	CREATE_USER_ENDPOINT,
	createErrorHandler,
	createRolesHandler,
	createSuccessHandler,
	VALID_EMAIL,
} from './testUtils';

describe('InviteMembers - Edge Cases', () => {
	beforeEach(() => {
		server.use(createRolesHandler(), createSuccessHandler());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('reset behavior', () => {
		it('clears all rows when reset is called', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					initialRowCount={2}
					renderFooter={({ reset }): JSX.Element => (
						<button data-testid="reset-btn" onClick={reset}>
							Reset
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], VALID_EMAIL);
			await user.type(emailInputs[1], 'bob@signoz.io');

			await user.click(screen.getByTestId('reset-btn'));

			const resetInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			expect(resetInputs).toHaveLength(2);
			resetInputs.forEach((input) => {
				expect(input).toHaveValue('');
			});
		});

		it('clears results on reset', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ submit, reset }): JSX.Element => (
						<>
							<button data-testid="submit-btn" onClick={submit}>
								Submit
							</button>
							<button data-testid="reset-btn" onClick={reset}>
								Reset
							</button>
						</>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], VALID_EMAIL);
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));
			await expect(
				screen.findByTestId('invite-success'),
			).resolves.toBeInTheDocument();

			await user.click(screen.getByTestId('reset-btn'));

			expect(screen.queryByTestId('invite-success')).not.toBeInTheDocument();
		});
	});

	describe('results cleared on edit', () => {
		it('clears API error when email is edited', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(createErrorHandler('already_exists', 'User already exists'));

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
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));
			await expect(
				screen.findByTestId('invite-api-error'),
			).resolves.toBeInTheDocument();

			await user.type(emailInputs[0], 'x');

			await waitFor(() => {
				expect(screen.queryByTestId('invite-api-error')).not.toBeInTheDocument();
			});
		});

		it('clears API error when role is changed', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(createErrorHandler('already_exists', 'User already exists'));

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
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));
			await expect(
				screen.findByTestId('invite-api-error'),
			).resolves.toBeInTheDocument();

			const viewerElements = screen.getAllByText('Viewer');
			await user.click(viewerElements[0]);
			const editorOptions = await screen.findAllByText('Editor');
			await user.click(editorOptions[editorOptions.length - 1]);

			await waitFor(() => {
				expect(screen.queryByTestId('invite-api-error')).not.toBeInTheDocument();
			});
		});
	});

	describe('empty submission', () => {
		it('does not submit when no rows are touched', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const onSuccess = jest.fn();

			render(
				<InviteMembers
					onSuccess={onSuccess}
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			await user.click(screen.getByTestId('submit-btn'));

			expect(onSuccess).not.toHaveBeenCalled();
		});
	});

	describe('submitting state', () => {
		it('disables submit while submitting', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ submit, isSubmitting }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit} disabled={isSubmitting}>
							{isSubmitting ? 'Submitting...' : 'Submit'}
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], VALID_EMAIL);
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			const submitBtn = screen.getByTestId('submit-btn');
			await user.click(submitBtn);

			await waitFor(() => {
				expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
			});
		});
	});

	describe('whitespace handling', () => {
		it('trims email whitespace before submission', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const calls: { email: string }[] = [];

			server.use(
				rest.post(CREATE_USER_ENDPOINT, async (req, res, ctx) => {
					const body = await req.json();
					calls.push(body);
					return res(ctx.status(201), ctx.json({ data: { id: 'user-123' } }));
				}),
			);

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
			await user.type(emailInputs[0], '  alice@signoz.io  ');
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));

			await waitFor(() => {
				expect(calls).toHaveLength(1);
				expect(calls[0].email).toBe('alice@signoz.io');
			});
		});
	});
});
