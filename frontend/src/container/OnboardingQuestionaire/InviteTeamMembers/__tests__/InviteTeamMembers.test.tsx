import { fireEvent } from '@testing-library/react';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import InviteTeamMembers from '../InviteTeamMembers';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockNotificationSuccess = jest.fn();

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): {
		notifications: { success: jest.Mock; error: jest.Mock };
	} => ({
		notifications: {
			success: mockNotificationSuccess,
			error: jest.fn(),
		},
	}),
}));

const INVITE_USERS_ENDPOINT = '*/api/v1/invite/bulk';

interface TeamMember {
	email: string;
	role: string;
	name: string;
	frontendBaseUrl: string;
	id: string;
}

interface RenderProps {
	isLoading?: boolean;
	teamMembers?: TeamMember[] | null;
}

const mockOnNext = jest.fn() as jest.MockedFunction<() => void>;
const mockSetTeamMembers = jest.fn() as jest.MockedFunction<
	(members: TeamMember[]) => void
>;

function renderComponent({
	isLoading = false,
	teamMembers = null,
}: RenderProps = {}): ReturnType<typeof render> {
	return render(
		<InviteTeamMembers
			isLoading={isLoading}
			teamMembers={teamMembers}
			setTeamMembers={mockSetTeamMembers}
			onNext={mockOnNext}
		/>,
	);
}

async function selectRole(
	user: ReturnType<typeof userEvent.setup>,
	selectIndex: number,
	optionLabel: string,
): Promise<void> {
	const placeholders = screen.getAllByText(/select roles/i);
	await user.click(placeholders[selectIndex]);
	const optionContent = await screen.findByText(optionLabel);
	fireEvent.click(optionContent);
}

describe('InviteTeamMembers', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		server.use(
			rest.post(INVITE_USERS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success' })),
			),
		);
	});

	afterEach(() => {
		jest.useRealTimers();
		server.resetHandlers();
	});

	describe('Initial rendering', () => {
		it('renders the page header and subtitle', () => {
			renderComponent();

			expect(
				screen.getByRole('heading', { name: /invite your team/i }),
			).toBeInTheDocument();
			expect(
				screen.getByText(/signoz is a lot more useful with collaborators/i),
			).toBeInTheDocument();

			expect(
				screen.getAllByPlaceholderText(/e\.g\. john@signoz\.io/i),
			).toHaveLength(3);

			expect(screen.getByText('Email address')).toBeInTheDocument();
			expect(screen.getByText('Roles')).toBeInTheDocument();

			expect(
				screen.getByRole('button', { name: /complete/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /i'll do this later/i }),
			).toBeInTheDocument();
		});

		it('hides remove button when only one row remains', async () => {
			renderComponent();
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			// Default is 3 rows → remove buttons visible; click down to 1
			let removeButtons = screen.getAllByRole('button', {
				name: /remove team member/i,
			});
			// Remove until 1 row left
			while (removeButtons.length > 0) {
				await user.click(removeButtons[0]);
				removeButtons = screen.queryAllByRole('button', {
					name: /remove team member/i,
				});
			}

			expect(
				screen.queryByRole('button', { name: /remove team member/i }),
			).not.toBeInTheDocument();
		});
	});

	describe('Adding and removing team members', () => {
		it('adds a new empty row when "Add another" is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			expect(
				screen.getAllByPlaceholderText(/e\.g\. john@signoz\.io/i),
			).toHaveLength(3);

			await user.click(screen.getByRole('button', { name: /add another/i }));

			expect(
				screen.getAllByPlaceholderText(/e\.g\. john@signoz\.io/i),
			).toHaveLength(4);
		});

		it('removes the correct row when the trash icon is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const emailInputs = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(emailInputs[0], 'first@example.com');

			const removeButtons = screen.getAllByRole('button', {
				name: /remove team member/i,
			});

			await screen.findByDisplayValue('first@example.com');
			await user.click(removeButtons[0]);

			await waitFor(() => {
				expect(
					screen.queryByDisplayValue('first@example.com'),
				).not.toBeInTheDocument();
				expect(
					screen.getAllByPlaceholderText(/e\.g\. john@signoz\.io/i),
				).toHaveLength(2);
			});
		});

		it('shows remove buttons when more than one row exists', () => {
			renderComponent();

			// Default 3 rows → remove buttons are visible
			expect(
				screen.getAllByRole('button', { name: /remove team member/i }),
			).toHaveLength(3);
		});
	});

	describe('Inline email validation', () => {
		it('shows an inline error after typing an invalid email', async () => {
			jest.useFakeTimers();
			const user = userEvent.setup({
				advanceTimers: (ms) => jest.advanceTimersByTime(ms),
			});
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'not-an-email');
			jest.advanceTimersByTime(600);

			await waitFor(() => {
				expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
			});

			jest.useRealTimers();
		});

		it('clears the inline error after entering a valid email', async () => {
			jest.useFakeTimers();
			const user = userEvent.setup({
				advanceTimers: (ms) => jest.advanceTimersByTime(ms),
			});
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);

			await user.type(firstInput, 'bad');
			jest.advanceTimersByTime(600);

			await waitFor(() => {
				expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
			});

			await user.clear(firstInput);
			await user.type(firstInput, 'good@example.com');
			jest.advanceTimersByTime(600);

			await waitFor(() => {
				expect(
					screen.queryByText(/invalid email address/i),
				).not.toBeInTheDocument();
			});

			jest.useRealTimers();
		});

		it('does not show an inline error when the field is cleared back to empty', async () => {
			jest.useFakeTimers();
			const user = userEvent.setup({
				advanceTimers: (ms) => jest.advanceTimersByTime(ms),
			});
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'a');
			await user.clear(firstInput);
			jest.advanceTimersByTime(600);

			// Empty value → no inline "Invalid email" banner
			await waitFor(() => {
				expect(
					screen.queryByText(/invalid email address/i),
				).not.toBeInTheDocument();
			});

			jest.useRealTimers();
		});

		it('rejects an email missing the @ symbol', async () => {
			jest.useFakeTimers();
			const user = userEvent.setup({
				advanceTimers: (ms) => jest.advanceTimersByTime(ms),
			});
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'missingatexample.com');
			jest.advanceTimersByTime(600);

			await waitFor(() => {
				expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
			});

			jest.useRealTimers();
		});

		it('rejects an email with no domain extension (user@domain)', async () => {
			jest.useFakeTimers();
			const user = userEvent.setup({
				advanceTimers: (ms) => jest.advanceTimersByTime(ms),
			});
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'user@nodot');
			jest.advanceTimersByTime(600);

			await waitFor(() => {
				expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
			});

			jest.useRealTimers();
		});

		it('accepts a valid sub-domain email', async () => {
			jest.useFakeTimers();
			const user = userEvent.setup({
				advanceTimers: (ms) => jest.advanceTimersByTime(ms),
			});
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'user@mail.company.co.uk');
			jest.advanceTimersByTime(600);

			await waitFor(() => {
				expect(
					screen.queryByText(/invalid email address/i),
				).not.toBeInTheDocument();
			});

			jest.useRealTimers();
		});
	});

	describe('Validation callout on Complete', () => {
		it('shows both-errors message when a touched row has invalid email and no role', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'bad-email');
			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.getByText(
						/please enter valid emails and select roles for team members/i,
					),
				).toBeInTheDocument();
			});
		});

		it('shows email-only error when row has an invalid email but a role is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'bad-email');

			await selectRole(user, 0, 'Viewer');

			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/please enter valid emails for team members/i),
				).toBeInTheDocument();
			});
		});

		it('shows role-only error when email is valid but no role is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'valid@example.com');
			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/please select roles for team members/i),
				).toBeInTheDocument();
			});
		});

		it('does not show a validation callout when all rows are untouched (empty)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.queryByText(/please enter valid emails/i),
				).not.toBeInTheDocument();
				expect(screen.queryByText(/please select roles/i)).not.toBeInTheDocument();
			});

			await waitFor(
				() => {
					expect(mockOnNext).toHaveBeenCalled();
				},
				{ timeout: 1200 },
			);
		});

		it('treats a row with only whitespace as untouched (no validation error)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, '   '); // whitespace only
			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.queryByText(/please enter valid emails/i),
				).not.toBeInTheDocument();
			});
		});

		it('validation callout disappears after the user fixes all errors and resubmits', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'bad-email');
			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/please enter valid emails and select roles/i),
				).toBeInTheDocument();
			});

			await user.clear(firstInput);
			await user.type(firstInput, 'good@example.com');
			await selectRole(user, 0, 'Viewer');

			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.queryByText(/please enter valid emails and select roles/i),
				).not.toBeInTheDocument();
			});
		});

		it('role dropdown clears the role error once a role is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const removeButtons = screen.getAllByRole('button', {
				name: /remove team member/i,
			});
			await user.click(removeButtons[0]);
			await user.click(
				screen.getAllByRole('button', { name: /remove team member/i })[0],
			);

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'valid@example.com');
			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/please select roles for team members/i),
				).toBeInTheDocument();
			});

			await selectRole(user, 0, 'Admin');

			await waitFor(() => {
				expect(
					screen.queryByText(/please select roles for team members/i),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('API integration', () => {
		it('calls the invite API and shows success notification on valid submission', async () => {
			let inviteCalled = false;

			server.use(
				rest.post(INVITE_USERS_ENDPOINT, (_, res, ctx) => {
					inviteCalled = true;
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'alice@example.com');
			await selectRole(user, 0, 'Editor');

			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(inviteCalled).toBe(true);
				expect(mockNotificationSuccess).toHaveBeenCalledWith(
					expect.objectContaining({ message: 'Invites sent successfully!' }),
				);
			});
		});

		it('only sends touched (non-empty) rows to the API', async () => {
			let capturedBody: {
				invites: { email: string; role: string }[];
			} | null = null;

			server.use(
				rest.post(INVITE_USERS_ENDPOINT, async (req, res, ctx) => {
					capturedBody = await req.json();
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			// Fill only the first of 3 rows
			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'only@example.com');
			await selectRole(user, 0, 'Admin');

			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(capturedBody).not.toBeNull();
				expect(capturedBody?.invites).toHaveLength(1);
				expect(capturedBody?.invites[0]).toMatchObject({
					email: 'only@example.com',
					role: 'ADMIN',
				});
			});
		});

		it('shows an API error when the invite request fails', async () => {
			server.use(
				rest.post(INVITE_USERS_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(500),
						ctx.json({
							errors: [{ code: 'INTERNAL_ERROR', msg: 'Something went wrong' }],
						}),
					),
				),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'fail@example.com');
			await selectRole(user, 0, 'Viewer');

			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(
					screen.queryByText(/please enter valid emails/i),
				).not.toBeInTheDocument();
				expect(document.querySelector('.auth-error-container')).toBeInTheDocument();
			});
		});

		it('clears the API error when the user starts editing an email', async () => {
			server.use(
				rest.post(INVITE_USERS_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(500),
						ctx.json({
							errors: [{ code: 'INTERNAL_ERROR', msg: 'Error' }],
						}),
					),
				),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'error@example.com');
			await selectRole(user, 0, 'Viewer');

			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(document.querySelector('.auth-error-container')).toBeInTheDocument();
			});

			// Typing in the email input should clear the API error
			await user.type(firstInput, 'x');

			await waitFor(() => {
				expect(
					document.querySelector('.auth-error-container'),
				).not.toBeInTheDocument();
			});
		});

		it('calls onNext after the 1-second delay following a successful invite', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'delayed@example.com');
			await selectRole(user, 0, 'Viewer');

			await user.click(screen.getByRole('button', { name: /complete/i }));

			// Success notification fires immediately after the API responds
			await waitFor(() => {
				expect(mockNotificationSuccess).toHaveBeenCalled();
			});

			// onNext is guarded behind a 1-second setTimeout; wait up to 1.2 s
			await waitFor(
				() => {
					expect(mockOnNext).toHaveBeenCalledTimes(1);
				},
				{ timeout: 1200 },
			);
		});
	});

	describe('"I\'ll do this later" button', () => {
		it('calls onNext immediately without invoking the invite API', async () => {
			let inviteCalled = false;

			server.use(
				rest.post(INVITE_USERS_ENDPOINT, (_, res, ctx) => {
					inviteCalled = true;
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			await user.click(
				screen.getByRole('button', { name: /i'll do this later/i }),
			);

			expect(mockOnNext).toHaveBeenCalledTimes(1);
			expect(inviteCalled).toBe(false);
		});
	});

	describe('Button disabled states', () => {
		it('disables both buttons while the isLoading prop is true', () => {
			renderComponent({ isLoading: true });

			expect(screen.getByRole('button', { name: /complete/i })).toBeDisabled();
			expect(
				screen.getByRole('button', { name: /i'll do this later/i }),
			).toBeDisabled();
		});
	});
});
