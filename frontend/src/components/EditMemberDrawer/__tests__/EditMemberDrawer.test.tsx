import type { ReactNode } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	useDeleteUser,
	useGetUser,
	useRemoveUserRoleByUserIDAndRoleID,
	useSetRoleByUserID,
	useUpdateMyUserV2,
	useUpdateUser,
} from 'api/generated/services/users';
import {
	listRolesSuccessResponse,
	managedRoles,
} from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
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
	useRemoveUserRoleByUserIDAndRoleID: jest.fn(),
	getResetPasswordToken: jest.fn(),
	invalidateListUsers: jest.fn().mockResolvedValue(undefined),
	getGetUserQueryKey: jest.fn().mockReturnValue(['/api/v2/users/user-1']),
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

const mockInvitedUser = {
	data: {
		id: 'abc123',
		displayName: '',
		email: 'bob@signoz.io',
		status: 'pending_invite',
		userRoles: [
			{
				id: 'ur-2',
				roleId: managedRoles[2].id,
				role: managedRoles[2],
			},
		],
	},
};

function renderDrawer(
	props: Partial<EditMemberDrawerProps> = {},
	searchParams: Record<string, string> = { member: 'user-1' },
): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			<EditMemberDrawer onComplete={jest.fn()} {...props} />
		</NuqsTestingAdapter>,
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
		(useRemoveUserRoleByUserIDAndRoleID as jest.Mock).mockReturnValue({
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
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer();

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
	});

	it('calls setRole when a new role is added', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockSet = jest.fn().mockResolvedValue({});

		(useSetRoleByUserID as jest.Mock).mockReturnValue({
			mutateAsync: mockSet,
			isLoading: false,
		});

		renderDrawer({ onComplete });

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

	it('calls removeRole when an existing role is removed', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockRemove = jest.fn().mockResolvedValue({});

		(useRemoveUserRoleByUserIDAndRoleID as jest.Mock).mockReturnValue({
			mutateAsync: mockRemove,
			isLoading: false,
		});

		renderDrawer({ onComplete });

		const adminTag = await screen.findByTitle('signoz-admin');
		const removeBtn = adminTag.querySelector(
			'.ant-select-selection-item-remove',
		) as Element;
		await user.click(removeBtn);

		const saveBtn = screen.getByRole('button', { name: /save member details/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockRemove).toHaveBeenCalledWith({
				pathParams: { id: 'user-1', roleId: managedRoles[0].id },
			});
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('opens delete confirm dialog when Delete Member button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer();

		await user.click(screen.getByRole('button', { name: /delete member/i }));

		expect(
			await screen.findByRole('dialog', { name: /delete member/i }),
		).toBeInTheDocument();
	});

	it('shows revoke invite and copy invite link for invited members; hides Last Modified', () => {
		(useGetUser as jest.Mock).mockReturnValue({
			data: mockInvitedUser,
			isLoading: false,
			refetch: jest.fn(),
		});

		renderDrawer({}, { member: 'abc123' });

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

	it('opens reset link dialog when Generate Password Reset Link is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer();

		await user.click(
			screen.getByRole('button', { name: /generate password reset link/i }),
		);

		// Drawer closes (open = !!memberId && !resetLinkType, so once reset-link param is set it closes)
		expect(
			screen.queryByRole('button', { name: /save member details/i }),
		).not.toBeInTheDocument();
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
	});
});
