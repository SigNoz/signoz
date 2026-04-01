import type { ReactNode } from 'react';
import { toast } from '@signozhq/sonner';
import { getResetPasswordToken } from 'api/generated/services/users';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ResetLinkDialog from '../ResetLinkDialog';

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
}));

jest.mock('api/generated/services/users', () => ({
	getResetPasswordToken: jest.fn(),
}));

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockCopyToClipboard = jest.fn();
const mockCopyState = { value: undefined, error: undefined };

jest.mock('react-use', () => ({
	useCopyToClipboard: (): [typeof mockCopyState, typeof mockCopyToClipboard] => [
		mockCopyState,
		mockCopyToClipboard,
	],
}));

const mockGetResetPasswordToken = jest.mocked(getResetPasswordToken);

function renderDialog(
	searchParams: Record<string, string> = {
		member: 'user-1',
		'reset-link': 'reset',
	},
): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			<ResetLinkDialog />
		</NuqsTestingAdapter>,
	);
}

describe('ResetLinkDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('does not render when reset-link param is absent', () => {
		renderDialog({ member: 'user-1' });

		expect(
			screen.queryByRole('dialog', { name: /password reset link/i }),
		).not.toBeInTheDocument();
	});

	it('shows loading skeleton while fetching token', () => {
		mockGetResetPasswordToken.mockReturnValue(new Promise(() => {})); // never resolves

		renderDialog();

		expect(
			screen.getByRole('dialog', { name: /password reset link/i }),
		).toBeInTheDocument();
		// Skeleton is rendered — save button not present, link text not present
		expect(
			screen.queryByRole('button', { name: /copy/i }),
		).not.toBeInTheDocument();
	});

	it('shows the reset link after successful fetch', async () => {
		mockGetResetPasswordToken.mockResolvedValue({
			status: 'success',
			data: { token: 'reset-tok-abc', id: 'user-1' },
		});

		renderDialog();

		await waitFor(() => {
			expect(screen.getByText(/reset-tok-abc/)).toBeInTheDocument();
		});
		expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
		expect(mockGetResetPasswordToken).toHaveBeenCalledWith({ id: 'user-1' });
	});

	it('uses "Invite Link" title and invite description for invite type', async () => {
		mockGetResetPasswordToken.mockResolvedValue({
			status: 'success',
			data: { token: 'invite-tok-xyz', id: 'user-1' },
		});

		renderDialog({ member: 'user-1', 'reset-link': 'invite' });

		expect(
			await screen.findByRole('dialog', { name: /invite link/i }),
		).toBeInTheDocument();
		expect(
			await screen.findByText(/complete their account setup/i),
		).toBeInTheDocument();
	});

	it('shows error state with Retry button when API fails', async () => {
		mockGetResetPasswordToken.mockRejectedValue(new Error('network error'));

		renderDialog();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
		});
		expect(screen.getByText(/failed to generate link/i)).toBeInTheDocument();
	});

	it('retries the API call when Retry button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		mockGetResetPasswordToken
			.mockRejectedValueOnce(new Error('first failure'))
			.mockResolvedValue({
				status: 'success',
				data: { token: 'retry-tok', id: 'user-1' },
			});

		renderDialog();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: /retry/i }));

		await waitFor(() => {
			expect(screen.getByText(/retry-tok/)).toBeInTheDocument();
		});
	});

	it('copies the link to clipboard and shows "Copied!" on button click', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockToast = jest.mocked(toast);

		mockGetResetPasswordToken.mockResolvedValue({
			status: 'success',
			data: { token: 'reset-tok-abc', id: 'user-1' },
		});

		renderDialog();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
		});

		await user.click(screen.getByRole('button', { name: /^copy$/i }));

		expect(mockCopyToClipboard).toHaveBeenCalledWith(
			expect.stringContaining('reset-tok-abc'),
		);
		expect(mockToast.success).toHaveBeenCalledWith(
			'Reset link copied to clipboard',
			expect.anything(),
		);
	});
});
