import { rest, server } from 'mocks-server/server';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import InviteTeamMembers from '../InviteTeamMembers';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockNotificationSuccess = jest.fn() as jest.MockedFunction<
	(args: { message: string }) => void
>;
const mockNotificationError = jest.fn() as jest.MockedFunction<
	(args: { message: string }) => void
>;

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			success: mockNotificationSuccess,
			error: mockNotificationError,
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

interface InviteRequestBody {
	invites: { email: string; role: string }[];
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
		it('renders the page header, column labels, default rows, and action buttons', () => {
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

		it('disables both action buttons while isLoading is true', () => {
			renderComponent({ isLoading: true });

			expect(screen.getByRole('button', { name: /complete/i })).toBeDisabled();
			expect(
				screen.getByRole('button', { name: /i'll do this later/i }),
			).toBeDisabled();
		});
	});

	describe('Row management', () => {
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

		it('removes the correct row when its trash icon is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const emailInputs = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(emailInputs[0], 'first@example.com');
			await screen.findByDisplayValue('first@example.com');

			await user.click(
				screen.getAllByRole('button', { name: /remove team member/i })[0],
			);

			await waitFor(() => {
				expect(
					screen.queryByDisplayValue('first@example.com'),
				).not.toBeInTheDocument();
				expect(
					screen.getAllByPlaceholderText(/e\.g\. john@signoz\.io/i),
				).toHaveLength(2);
			});
		});

		it('hides remove buttons when only one row remains', async () => {
			renderComponent();
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			let removeButtons = screen.getAllByRole('button', {
				name: /remove team member/i,
			});
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

	describe('Inline email validation', () => {
		it('shows an inline error after typing an invalid email and clears it when a valid email is entered', async () => {
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

			await user.clear(firstInput);
			await user.type(firstInput, 'good@example.com');
			jest.advanceTimersByTime(600);
			await waitFor(() => {
				expect(
					screen.queryByText(/invalid email address/i),
				).not.toBeInTheDocument();
			});
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

			await waitFor(() => {
				expect(
					screen.queryByText(/invalid email address/i),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('Validation callout on Complete', () => {
		it('shows the correct callout message for each combination of email/role validity', async () => {
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

			await user.type(firstInput, 'bad-email');
			await user.click(screen.getByRole('button', { name: /complete/i }));
			await waitFor(() => {
				expect(
					screen.getByText(
						/please enter valid emails and select roles for team members/i,
					),
				).toBeInTheDocument();
				expect(
					screen.queryByText(/please enter valid emails for team members/i),
				).not.toBeInTheDocument();
				expect(
					screen.queryByText(/please select roles for team members/i),
				).not.toBeInTheDocument();
			});

			await selectRole(user, 0, 'Viewer');
			await user.click(screen.getByRole('button', { name: /complete/i }));
			await waitFor(() => {
				expect(
					screen.getByText(/please enter valid emails for team members/i),
				).toBeInTheDocument();
				expect(
					screen.queryByText(/please select roles for team members/i),
				).not.toBeInTheDocument();
				expect(
					screen.queryByText(/please enter valid emails and select roles/i),
				).not.toBeInTheDocument();
			});

			await user.clear(firstInput);
			await user.type(firstInput, 'valid@example.com');
			await user.click(screen.getByRole('button', { name: /add another/i }));
			const allInputs = screen.getAllByPlaceholderText(/e\.g\. john@signoz\.io/i);
			await user.type(allInputs[1], 'norole@example.com');
			await user.click(screen.getByRole('button', { name: /complete/i }));
			await waitFor(() => {
				expect(
					screen.getByText(/please select roles for team members/i),
				).toBeInTheDocument();
				expect(
					screen.queryByText(/please enter valid emails for team members/i),
				).not.toBeInTheDocument();
				expect(
					screen.queryByText(/please enter valid emails and select roles/i),
				).not.toBeInTheDocument();
			});
		});

		it('treats whitespace as untouched, clears the callout on fix-and-resubmit, and clears role error on role select', async () => {
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

			await user.type(firstInput, '   ');
			await user.click(screen.getByRole('button', { name: /complete/i }));
			await waitFor(() => {
				expect(
					screen.queryByText(/please enter valid emails/i),
				).not.toBeInTheDocument();
				expect(screen.queryByText(/please select roles/i)).not.toBeInTheDocument();
			});

			await user.clear(firstInput);
			await user.type(firstInput, 'bad-email');
			await user.click(screen.getByRole('button', { name: /complete/i }));
			await waitFor(() => {
				expect(
					screen.getByText(
						/please enter valid emails and select roles for team members/i,
					),
				).toBeInTheDocument();
				expect(
					screen.queryByText(/please enter valid emails for team members/i),
				).not.toBeInTheDocument();
				expect(
					screen.queryByText(/please select roles for team members/i),
				).not.toBeInTheDocument();
			});

			await user.clear(firstInput);
			await user.type(firstInput, 'good@example.com');
			await selectRole(user, 0, 'Admin');
			await user.click(screen.getByRole('button', { name: /complete/i }));
			await waitFor(() => {
				expect(
					screen.queryByText(/please enter valid emails and select roles/i),
				).not.toBeInTheDocument();
				expect(
					screen.queryByText(/please enter valid emails for team members/i),
				).not.toBeInTheDocument();
				expect(
					screen.queryByText(/please select roles for team members/i),
				).not.toBeInTheDocument();
			});

			await waitFor(() => expect(mockOnNext).toHaveBeenCalledTimes(1), {
				timeout: 1200,
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
	});

	describe('API integration', () => {
		it('only sends touched (non-empty) rows — empty rows are excluded from the invite payload', async () => {
			let capturedBody: InviteRequestBody | null = null;

			server.use(
				rest.post(INVITE_USERS_ENDPOINT, async (req, res, ctx) => {
					capturedBody = await req.json<InviteRequestBody>();
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

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

		it('calls the invite API, shows a success notification, and calls onNext after the 1 s delay', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			const [firstInput] = screen.getAllByPlaceholderText(
				/e\.g\. john@signoz\.io/i,
			);
			await user.type(firstInput, 'alice@example.com');
			await selectRole(user, 0, 'Admin');
			await user.click(screen.getByRole('button', { name: /complete/i }));

			await waitFor(() => {
				expect(mockNotificationSuccess).toHaveBeenCalledWith(
					expect.objectContaining({ message: 'Invites sent successfully!' }),
				);
			});

			await waitFor(
				() => {
					expect(mockOnNext).toHaveBeenCalledTimes(1);
				},
				{ timeout: 1200 },
			);
		});

		it('renders an API error container when the invite request fails', async () => {
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
				expect(document.querySelector('.auth-error-container')).toBeInTheDocument();
			});

			await user.type(firstInput, 'x');
			await waitFor(() => {
				expect(
					document.querySelector('.auth-error-container'),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('"I\'ll do this later" button', () => {
		it('calls onNext immediately without invoking the invite API', async () => {
			const mockPost = jest.fn() as jest.MockedFunction<() => void>;

			server.use(
				rest.post(INVITE_USERS_ENDPOINT, (_, res, ctx) => {
					mockPost();
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderComponent();

			await user.click(
				screen.getByRole('button', { name: /i'll do this later/i }),
			);

			expect(mockOnNext).toHaveBeenCalledTimes(1);
			expect(mockPost).not.toHaveBeenCalled();
		});
	});
});
