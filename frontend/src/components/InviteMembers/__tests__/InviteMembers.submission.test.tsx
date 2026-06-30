import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import InviteMembers from '../InviteMembers';

import {
	CREATE_USER_ENDPOINT,
	createErrorHandler,
	createRolesHandler,
	createSuccessHandler,
	createTrackingHandler,
	VALID_EMAIL,
} from './testUtils';

describe('InviteMembers - Submission', () => {
	beforeEach(() => {
		server.use(createRolesHandler(), createSuccessHandler());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('API calls', () => {
		it('calls createUser API for each touched row', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const { handler, calls } = createTrackingHandler();
			server.use(handler);

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
			await user.type(emailInputs[0], 'alice@signoz.io');
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));

			await waitFor(() => {
				expect(calls).toHaveLength(1);
				expect(calls[0]).toMatchObject({
					email: 'alice@signoz.io',
					userRoles: [{ id: 'role-viewer' }],
				});
			});
		});

		it('calls createUser API for multiple touched rows', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const { handler, calls } = createTrackingHandler();
			server.use(handler);

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

			await user.type(emailInputs[0], 'alice@signoz.io');
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.type(emailInputs[1], 'bob@signoz.io');
			await user.click(screen.getAllByText('Select role')[0]);
			const editorOptions = await screen.findAllByText('Editor');
			await user.click(editorOptions[editorOptions.length - 1]);

			await user.type(emailInputs[2], 'charlie@signoz.io');
			await user.click(screen.getAllByText('Select role')[0]);
			const adminOptions = await screen.findAllByText('Admin');
			await user.click(adminOptions[adminOptions.length - 1]);

			await user.click(screen.getByTestId('submit-btn'));

			await waitFor(() => {
				expect(calls).toHaveLength(3);
			});

			expect(calls[0]).toMatchObject({
				email: 'alice@signoz.io',
				userRoles: [{ id: 'role-viewer' }],
			});
			expect(calls[1]).toMatchObject({
				email: 'bob@signoz.io',
				userRoles: [{ id: 'role-editor' }],
			});
			expect(calls[2]).toMatchObject({
				email: 'charlie@signoz.io',
				userRoles: [{ id: 'role-admin' }],
			});
		});
	});

	describe('callbacks', () => {
		it('calls onSuccess when all invites succeed', async () => {
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

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], VALID_EMAIL);
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));

			await waitFor(() => {
				expect(onSuccess).toHaveBeenCalled();
			});
		});

		it('calls onAllFailed when all invites fail', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const onAllFailed = jest.fn();

			server.use(createErrorHandler('already_exists', 'User already exists'));

			render(
				<InviteMembers
					onAllFailed={onAllFailed}
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

			await waitFor(() => {
				expect(onAllFailed).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							email: VALID_EMAIL,
							success: false,
						}),
					]),
					expect.any(Array),
				);
			});
		});

		it('calls onPartialSuccess when some invites succeed and some fail', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const onPartialSuccess = jest.fn();
			const onSuccess = jest.fn();
			const onAllFailed = jest.fn();
			const apiCalls: string[] = [];
			let callCount = 0;

			server.use(
				createRolesHandler(),
				rest.post(CREATE_USER_ENDPOINT, async (req, res, ctx) => {
					const body = await req.json();
					apiCalls.push(body.email);
					callCount++;
					if (callCount === 1) {
						return res(ctx.status(201), ctx.json({ data: { id: 'user-123' } }));
					}
					return res(
						ctx.status(409),
						ctx.json({
							error: {
								code: 'already_exists',
								message: 'User already exists',
							},
						}),
					);
				}),
			);

			render(
				<InviteMembers
					initialRowCount={2}
					onSuccess={onSuccess}
					onPartialSuccess={onPartialSuccess}
					onAllFailed={onAllFailed}
					renderFooter={({ submit }): JSX.Element => (
						<button data-testid="submit-btn" onClick={submit}>
							Submit
						</button>
					)}
				/>,
			);

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');

			await user.type(emailInputs[0], 'alice@signoz.io');
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.type(emailInputs[1], 'bob@signoz.io');
			await user.click(screen.getAllByText('Select role')[0]);
			const editorOptions = await screen.findAllByText('Editor');
			await user.click(editorOptions[editorOptions.length - 1]);

			await user.click(screen.getByTestId('submit-btn'));

			await waitFor(() => {
				expect(apiCalls).toHaveLength(2);
			});

			expect(apiCalls).toStrictEqual(['alice@signoz.io', 'bob@signoz.io']);
			expect(onSuccess).not.toHaveBeenCalled();
			expect(onAllFailed).not.toHaveBeenCalled();
			expect(onPartialSuccess).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ email: 'alice@signoz.io', success: true }),
					expect.objectContaining({
						email: 'bob@signoz.io',
						success: false,
						error: 'User already exists',
					}),
				]),
				expect.any(Array),
			);

			await expect(
				screen.findByTestId('invite-api-error'),
			).resolves.toBeInTheDocument();
			expect(
				screen.getByText('1 invite(s) sent successfully.'),
			).toBeInTheDocument();
			expect(screen.getByText('1 invite(s) failed:')).toBeInTheDocument();
			expect(
				screen.getByText('bob@signoz.io: User already exists'),
			).toBeInTheDocument();
		});
	});

	describe('result display', () => {
		it('shows success callout when all invites succeed', async () => {
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
			await user.click(screen.getAllByText('Select role')[0]);
			await user.click(await screen.findByText('Viewer'));

			await user.click(screen.getByTestId('submit-btn'));

			await expect(
				screen.findByTestId('invite-success'),
			).resolves.toBeInTheDocument();
		});

		it('shows error callout with failed emails when API fails', async () => {
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
			expect(screen.getByText(/1 invite\(s\) failed/)).toBeInTheDocument();
		});
	});

	describe('footer props', () => {
		it('provides correct canSubmit state', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					renderFooter={({ canSubmit }): JSX.Element => (
						<button data-testid="submit-btn" disabled={!canSubmit}>
							Submit
						</button>
					)}
				/>,
			);

			expect(screen.getByTestId('submit-btn')).toBeDisabled();

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], VALID_EMAIL);

			expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
		});

		it('provides touchedCount', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(
				<InviteMembers
					initialRowCount={3}
					renderFooter={({ touchedCount }): JSX.Element => (
						<span data-testid="touched-count">{touchedCount}</span>
					)}
				/>,
			);

			expect(screen.getByTestId('touched-count')).toHaveTextContent('0');

			const emailInputs = screen.getAllByPlaceholderText('e.g. john@signoz.io');
			await user.type(emailInputs[0], 'a@b.com');

			expect(screen.getByTestId('touched-count')).toHaveTextContent('1');

			await user.type(emailInputs[1], 'c@d.com');

			expect(screen.getByTestId('touched-count')).toHaveTextContent('2');
		});
	});
});
