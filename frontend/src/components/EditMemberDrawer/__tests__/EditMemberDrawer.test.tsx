import type { ReactNode } from 'react';
import { toast } from '@signozhq/sonner';
import getResetPasswordToken from 'api/v1/factor_password/getResetPasswordToken';
import deleteUser from 'api/v1/user/id/delete';
import update from 'api/v1/user/id/update';
import { MemberStatus } from 'container/MembersSettings/utils';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';
import { ROLES } from 'types/roles';

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

jest.mock('api/v1/user/id/update');
jest.mock('api/v1/user/id/delete');
jest.mock('api/v1/factor_password/getResetPasswordToken');
jest.mock('@signozhq/sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

const mockUpdate = jest.mocked(update);
const mockDeleteUser = jest.mocked(deleteUser);
const mockGetResetPasswordToken = jest.mocked(getResetPasswordToken);

const activeMember = {
	id: 'user-1',
	name: 'Alice Smith',
	email: 'alice@signoz.io',
	role: 'ADMIN' as ROLES,
	status: MemberStatus.Active,
	joinedOn: '1700000000000',
	updatedAt: '1710000000000',
};

const invitedMember = {
	id: 'abc123',
	name: '',
	email: 'bob@signoz.io',
	role: 'VIEWER' as ROLES,
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
		mockUpdate.mockResolvedValue({ httpStatusCode: 200, data: null });
		mockDeleteUser.mockResolvedValue({ httpStatusCode: 200, data: null });
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

	it('enables Save after editing name and calls update API on confirm', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer({ onComplete });

		const nameInput = screen.getByDisplayValue('Alice Smith');
		await user.clear(nameInput);
		await user.type(nameInput, 'Alice Updated');

		const saveBtn = screen.getByRole('button', { name: /save member details/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());

		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-1',
					displayName: 'Alice Updated',
				}),
			);
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('shows delete confirm dialog and calls deleteUser for active members', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer({ onComplete });

		await user.click(screen.getByRole('button', { name: /delete member/i }));

		expect(
			await screen.findByText(/are you sure you want to delete/i),
		).toBeInTheDocument();

		const confirmBtns = screen.getAllByRole('button', { name: /delete member/i });
		await user.click(confirmBtns[confirmBtns.length - 1]);

		await waitFor(() => {
			expect(mockDeleteUser).toHaveBeenCalledWith({ userId: 'user-1' });
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

		renderDrawer({ member: invitedMember, onComplete });

		await user.click(screen.getByRole('button', { name: /revoke invite/i }));

		expect(
			await screen.findByText(/Are you sure you want to revoke the invite/i),
		).toBeInTheDocument();

		const confirmBtns = screen.getAllByRole('button', { name: /revoke invite/i });
		await user.click(confirmBtns[confirmBtns.length - 1]);

		await waitFor(() => {
			expect(mockDeleteUser).toHaveBeenCalledWith({ userId: 'abc123' });
			expect(onComplete).toHaveBeenCalled();
		});
	});

	it('calls update API when saving changes for an invited member', async () => {
		const onComplete = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer({ member: { ...invitedMember, name: 'Bob' }, onComplete });

		const nameInput = screen.getByDisplayValue('Bob');
		await user.clear(nameInput);
		await user.type(nameInput, 'Bob Updated');

		const saveBtn = screen.getByRole('button', { name: /save member details/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 'abc123', displayName: 'Bob Updated' }),
			);
			expect(onComplete).toHaveBeenCalled();
		});
	});

	describe('Generate Password Reset Link', () => {
		const mockWriteText = jest.fn().mockResolvedValue(undefined);
		let clipboardSpy: jest.SpyInstance | undefined;

		beforeAll(() => {
			Object.defineProperty(navigator, 'clipboard', {
				value: { writeText: (): Promise<void> => Promise.resolve() },
				configurable: true,
				writable: true,
			});
		});

		beforeEach(() => {
			mockWriteText.mockClear();
			clipboardSpy = jest
				.spyOn(navigator.clipboard, 'writeText')
				.mockImplementation(mockWriteText);
			mockGetResetPasswordToken.mockResolvedValue({
				httpStatusCode: 200,
				data: { token: 'reset-tok-abc', userId: 'user-1' },
			});
		});

		afterEach(() => {
			clipboardSpy?.mockRestore();
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
				userId: 'user-1',
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

			fireEvent.click(screen.getByRole('button', { name: /^copy$/i }));

			await waitFor(() => {
				expect(mockToast.success).toHaveBeenCalledWith(
					'Reset link copied to clipboard',
					expect.anything(),
				);
			});

			expect(mockWriteText).toHaveBeenCalledWith(
				expect.stringContaining('reset-tok-abc'),
			);
			expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
		});
	});
});
