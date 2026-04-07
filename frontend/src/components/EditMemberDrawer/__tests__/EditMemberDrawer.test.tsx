import type { ReactNode } from 'react';
import { toast } from '@signozhq/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	getResetPasswordToken,
	useDeleteUser,
	useGetUser,
	useSetRoleByUserID,
	useUpdateMyUserV2,
	useUpdateUser,
} from 'api/generated/services/users';
import { MemberStatus } from 'container/MembersSettings/utils';
import {
	listRolesSuccessResponse,
	managedRoles,
} from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import EditMemberDrawer, { EditMemberDrawerProps } from '../EditMemberDrawer';

jest.mock('@signozhq/drawer', () => ({
	DrawerWrapper: ({
		content,
		open,
	}: {
		content?: ReactNode;
		open: boolean;
	}): JSX.Element | null => (open ? <div>{content}</div> : null),
}));

jest.mock('@signozhq/dialog', () => ({
	DialogWrapper: ({
		children,
		open,
		title,
	}: {
		children?: ReactNode;
		open: boolean;
		title?: string;
	}): JSX.Element | null =>
		open ? (
			<div role="dialog" aria-label={title}>
				{children}
			</div>
		) : null,
	DialogFooter: ({ children }: { children?: ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

jest.mock('api/generated/services/users', () => ({
	useDeleteUser: jest.fn(),
	useGetUser: jest.fn(),
	useUpdateUser: jest.fn(),
	useUpdateMyUserV2: jest.fn(),
	useSetRoleByUserID: jest.fn(),
	getResetPasswordToken: jest.fn(),
}));

jest.mock('api/ErrorResponseHandlerForGeneratedAPIs', () => ({
	convertToApiError: jest.fn(),
}));

jest.mock('@signozhq/sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

const mockCopyToClipboard = jest.fn();
const mockCopyState = { value: undefined, error: undefined };

jest.mock('react-use', () => ({
	useCopyToClipboard: (): [typeof mockCopyState, typeof mockCopyToClipboard] => [
		mockCopyState,
		mockCopyToClipboard,
	],
}));

const ROLES_ENDPOINT = '*/api/v1/roles';

const mockDeleteMutate = jest.fn();
const mockGetResetPasswordToken = jest.mocked(getResetPasswordToken);

const mockFetchedUser = {
	data: {
		id: 'user-1',
		displayName: 'Alice Smith',
		email: 'alice@signoz.io',
		status: 'active',
		userRoles: [
			{
				id: 'ur-1',
				roleId: managedRoles[0].id,
				role: managedRoles[0], // signoz-admin
			},
		],
	},
};

const activeMember = {
	id: 'user-1',
	name: 'Alice Smith',
	email: 'alice@signoz.io',
	status: MemberStatus.Active,
	joinedOn: '1700000000000',
	updatedAt: '1710000000000',
};

const selfMember = {
	...activeMember,
	id: 'some-user-id',
};

const rootMockFetchedUser = {
	data: {
		...mockFetchedUser.data,
		id: 'root-user-1',
		isRoot: true,
	},
};

const invitedMember = {
	id: 'abc123',
	name: '',
	email: 'bob@signoz.io',
	status: MemberStatus.Invited,
	joinedOn: '1700000000000',
};

function renderDrawer(
	props: Partial<EditMemberDrawerProps> = {},
): ReturnType<typeof render> {
	return render(
		<EditMemberDrawer
			member={activeMember}
			open
			onClose={jest.fn()}
			onComplete={jest.fn()}
			{...props}
		/>,
	);
}

describe('EditMemberDrawer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(ROLES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(listRolesSuccessResponse)),
			),
		);
		(useGetUser as jest.Mock).mockReturnValue({
			data: mockFetchedUser,
			isLoading: false,
			refetch: jest.fn(),
		});
		(useUpdateUser as jest.Mock).mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({}),
			isLoading: false,
		});
		(useUpdateMyUserV2 as jest.Mock).mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({}),
			isLoading: false,
		});
		(useSetRoleByUserID as jest.Mock).mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({}),
			isLoading: false,
		});
		(useDeleteUser as jest.Mock).mockReturnValue({
			mutate: mockDeleteMutate,
			isLoading: false,
		});
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders active member details and disables Save when form is not dirty', () => {
		renderDrawer();

		expect(screen.getByDisplayValue('Alice Smith')).toBeInTheDocument();
		expect(screen.getByText('alice@signoz.io')).toBeInTheDocument();
		expect(screen.getByText('ACTIVE')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /save member details/i }),
		).toBeDisabled();
	});

	it('enables Save after editing name and calls updateUser on confirm', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockMutateAsync = jest.fn().mockResolvedValue({});

		(useUpdateUser as jest.Mock).mockReturnValue({
			mutateAsync: mockMutateAsync,
			isLoading: false,
		});

		renderDrawer({ onComplete });

		const nameInput = screen.getByDisplayValue('Alice Smith');
		await user.clear(nameInput);
		await user.type(nameInput, 'Alice Updated');

		const saveBtn = screen.getByRole('button', { name: /save member details/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());

		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith({
				pathParams: { id: 'user-1' },
				data: { displayName: 'Alice Updated' },
			});
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('does not close the drawer after a successful save', async () => {
		const onClose = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer({ onClose });

		const nameInput = screen.getByDisplayValue('Alice Smith');
		await user.clear(nameInput);
		await user.type(nameInput, 'Alice Updated');

		const saveBtn = screen.getByRole('button', { name: /save member details/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(
				screen.getByRole('button', { name: /save member details/i }),
			).toBeInTheDocument();
		});
		expect(onClose).not.toHaveBeenCalled();
	});

	it('selecting a different role calls setRole with the new role name', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockSet = jest.fn().mockResolvedValue({});

		(useSetRoleByUserID as jest.Mock).mockReturnValue({
			mutateAsync: mockSet,
			isLoading: false,
		});

		renderDrawer({ onComplete });

		// Open the roles dropdown and select signoz-editor
		await user.click(screen.getByLabelText('Roles'));
		await user.click(await screen.findByTitle('signoz-editor'));

		const saveBtn = screen.getByRole('button', { name: /save member details/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockSet).toHaveBeenCalledWith({
				pathParams: { id: 'user-1' },
				data: { name: 'signoz-editor' },
			});
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('does not call removeRole when the role is changed', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockSet = jest.fn().mockResolvedValue({});

		(useSetRoleByUserID as jest.Mock).mockReturnValue({
			mutateAsync: mockSet,
			isLoading: false,
		});

		renderDrawer({ onComplete });

		// Switch from signoz-admin to signoz-viewer using single-select
		await user.click(screen.getByLabelText('Roles'));
		await user.click(await screen.findByTitle('signoz-viewer'));

		const saveBtn = screen.getByRole('button', { name: /save member details/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockSet).toHaveBeenCalledWith({
				pathParams: { id: 'user-1' },
				data: { name: 'signoz-viewer' },
			});
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('shows delete confirm dialog and calls deleteUser for active members', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		(useDeleteUser as jest.Mock).mockImplementation((options) => ({
			mutate: mockDeleteMutate.mockImplementation(() => {
				options?.mutation?.onSuccess?.();
			}),
			isLoading: false,
		}));

		renderDrawer({ onComplete });

		await user.click(screen.getByRole('button', { name: /delete member/i }));

		expect(
			await screen.findByText(/are you sure you want to delete/i),
		).toBeInTheDocument();

		const confirmBtns = screen.getAllByRole('button', { name: /delete member/i });
		await user.click(confirmBtns[confirmBtns.length - 1]);

		await waitFor(() => {
			expect(mockDeleteMutate).toHaveBeenCalledWith({
				pathParams: { id: 'user-1' },
			});
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('shows revoke invite and copy invite link for invited members; hides Last Modified', () => {
		renderDrawer({ member: invitedMember });

		expect(
			screen.getByRole('button', { name: /revoke invite/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /copy invite link/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /generate password reset link/i }),
		).not.toBeInTheDocument();
		expect(screen.getByText('Invited On')).toBeInTheDocument();
		expect(screen.queryByText('Last Modified')).not.toBeInTheDocument();
	});

	it('calls deleteUser after confirming revoke invite for invited members', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		(useDeleteUser as jest.Mock).mockImplementation((options) => ({
			mutate: mockDeleteMutate.mockImplementation(() => {
				options?.mutation?.onSuccess?.();
			}),
			isLoading: false,
		}));

		renderDrawer({ member: invitedMember, onComplete });

		await user.click(screen.getByRole('button', { name: /revoke invite/i }));

		expect(
			await screen.findByText(/Are you sure you want to revoke the invite/i),
		).toBeInTheDocument();

		const confirmBtns = screen.getAllByRole('button', { name: /revoke invite/i });
		await user.click(confirmBtns[confirmBtns.length - 1]);

		await waitFor(() => {
			expect(mockDeleteMutate).toHaveBeenCalledWith({
				pathParams: { id: 'abc123' },
			});
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('calls updateUser when saving name change for an invited member', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockMutateAsync = jest.fn().mockResolvedValue({});

		(useGetUser as jest.Mock).mockReturnValue({
			data: {
				data: {
					...mockFetchedUser.data,
					id: 'abc123',
					displayName: 'Bob',
					userRoles: [
						{
							id: 'ur-2',
							roleId: managedRoles[2].id,
							role: managedRoles[2], // signoz-viewer
						},
					],
				},
			},
			isLoading: false,
			refetch: jest.fn(),
		});
		(useUpdateUser as jest.Mock).mockReturnValue({
			mutateAsync: mockMutateAsync,
			isLoading: false,
		});

		renderDrawer({ member: { ...invitedMember, name: 'Bob' }, onComplete });

		const nameInput = screen.getByDisplayValue('Bob');
		await user.clear(nameInput);
		await user.type(nameInput, 'Bob Updated');

		const saveBtn = screen.getByRole('button', { name: /save member details/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith({
				pathParams: { id: 'abc123' },
				data: { displayName: 'Bob Updated' },
			});
			expect(onComplete).toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		const mockConvertToApiError = jest.mocked(convertToApiError);

		beforeEach(() => {
			mockConvertToApiError.mockReturnValue({
				getErrorMessage: (): string => 'Something went wrong on server',
			} as ReturnType<typeof convertToApiError>);
		});

		it('shows SaveErrorItem when updateUser fails for name change', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			(useUpdateUser as jest.Mock).mockReturnValue({
				mutateAsync: jest.fn().mockRejectedValue(new Error('server error')),
				isLoading: false,
			});

			renderDrawer();

			const nameInput = screen.getByDisplayValue('Alice Smith');
			await user.clear(nameInput);
			await user.type(nameInput, 'Alice Updated');

			const saveBtn = screen.getByRole('button', { name: /save member details/i });
			await waitFor(() => expect(saveBtn).not.toBeDisabled());
			await user.click(saveBtn);

			await waitFor(() => {
				expect(
					screen.getByText('Name update: Something went wrong on server'),
				).toBeInTheDocument();
			});
		});

		it('shows API error message when deleteUser fails for active member', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const mockToast = jest.mocked(toast);

			(useDeleteUser as jest.Mock).mockImplementation((options) => ({
				mutate: mockDeleteMutate.mockImplementation(() => {
					options?.mutation?.onError?.({});
				}),
				isLoading: false,
			}));

			renderDrawer();

			await user.click(screen.getByRole('button', { name: /delete member/i }));
			const confirmBtns = screen.getAllByRole('button', {
				name: /delete member/i,
			});
			await user.click(confirmBtns[confirmBtns.length - 1]);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith(
					'Failed to delete member: Something went wrong on server',
					expect.anything(),
				);
			});
		});

		it('shows API error message when deleteUser fails for invited member', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const mockToast = jest.mocked(toast);

			(useDeleteUser as jest.Mock).mockImplementation((options) => ({
				mutate: mockDeleteMutate.mockImplementation(() => {
					options?.mutation?.onError?.({});
				}),
				isLoading: false,
			}));

			renderDrawer({ member: invitedMember });

			await user.click(screen.getByRole('button', { name: /revoke invite/i }));
			const confirmBtns = screen.getAllByRole('button', {
				name: /revoke invite/i,
			});
			await user.click(confirmBtns[confirmBtns.length - 1]);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith(
					'Failed to revoke invite: Something went wrong on server',
					expect.anything(),
				);
			});
		});
	});

	describe('self user (isSelf)', () => {
		it('disables Delete button when viewing own profile', () => {
			renderDrawer({ member: selfMember });
			expect(
				screen.getByRole('button', { name: /delete member/i }),
			).toBeDisabled();
		});

		it('does not open delete confirm dialog when Delete is clicked while disabled (isSelf)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderDrawer({ member: selfMember });

			await user.click(screen.getByRole('button', { name: /delete member/i }));

			expect(
				screen.queryByText(/are you sure you want to delete/i),
			).not.toBeInTheDocument();
		});

		it('keeps name input enabled when viewing own profile', () => {
			renderDrawer({ member: selfMember });
			expect(screen.getByDisplayValue('Alice Smith')).not.toBeDisabled();
		});

		it('keeps Reset Link button enabled when viewing own profile', () => {
			renderDrawer({ member: selfMember });
			expect(
				screen.getByRole('button', { name: /generate password reset link/i }),
			).not.toBeDisabled();
		});
	});

	describe('root user', () => {
		beforeEach(() => {
			(useGetUser as jest.Mock).mockReturnValue({
				data: rootMockFetchedUser,
				isLoading: false,
				refetch: jest.fn(),
			});
		});

		it('disables name input for root user', () => {
			renderDrawer();
			expect(screen.getByDisplayValue('Alice Smith')).toBeDisabled();
		});

		it('disables Delete button for root user', () => {
			renderDrawer();
			expect(
				screen.getByRole('button', { name: /delete member/i }),
			).toBeDisabled();
		});

		it('disables Reset Link button for root user', () => {
			renderDrawer();
			expect(
				screen.getByRole('button', { name: /generate password reset link/i }),
			).toBeDisabled();
		});

		it('disables Save button for root user', () => {
			renderDrawer();
			expect(
				screen.getByRole('button', { name: /save member details/i }),
			).toBeDisabled();
		});

		it('does not open delete confirm dialog when Delete is clicked while disabled (root)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderDrawer();

			await user.click(screen.getByRole('button', { name: /delete member/i }));

			expect(
				screen.queryByText(/are you sure you want to delete/i),
			).not.toBeInTheDocument();
		});

		it('does not call getResetPasswordToken when Reset Link is clicked while disabled (root)', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			renderDrawer();

			await user.click(
				screen.getByRole('button', { name: /generate password reset link/i }),
			);

			expect(mockGetResetPasswordToken).not.toHaveBeenCalled();
		});
	});

	describe('Generate Password Reset Link', () => {
		beforeEach(() => {
			mockCopyToClipboard.mockClear();
			mockGetResetPasswordToken.mockResolvedValue({
				status: 'success',
				data: { token: 'reset-tok-abc', id: 'user-1' },
			});
		});

		it('calls getResetPasswordToken and opens the reset link dialog with the generated link', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			renderDrawer();

			await user.click(
				screen.getByRole('button', { name: /generate password reset link/i }),
			);

			const dialog = await screen.findByRole('dialog', {
				name: /password reset link/i,
			});
			expect(mockGetResetPasswordToken).toHaveBeenCalledWith({
				id: 'user-1',
			});
			expect(dialog).toBeInTheDocument();
			expect(dialog).toHaveTextContent('reset-tok-abc');
		});

		it('copies the link to clipboard and shows "Copied!" on the button', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const mockToast = jest.mocked(toast);

			renderDrawer();

			await user.click(
				screen.getByRole('button', { name: /generate password reset link/i }),
			);

			const dialog = await screen.findByRole('dialog', {
				name: /password reset link/i,
			});
			expect(dialog).toHaveTextContent('reset-tok-abc');

			await user.click(screen.getByRole('button', { name: /^copy$/i }));

			await waitFor(() => {
				expect(mockToast.success).toHaveBeenCalledWith(
					'Reset link copied to clipboard',
					expect.anything(),
				);
			});

			expect(mockCopyToClipboard).toHaveBeenCalledWith(
				expect.stringContaining('reset-tok-abc'),
			);
			expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
		});
	});
});
