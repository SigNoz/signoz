import type { ReactNode } from 'react';
import { toast } from '@signozhq/sonner';
import { useCreateServiceAccount } from 'api/generated/services/serviceaccount';
import { useRoles } from 'components/RolesSelect';
import { managedRoles } from 'mocks-server/__mockdata__/roles';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import CreateServiceAccountModal from '../CreateServiceAccountModal';

jest.mock('api/generated/services/serviceaccount');

jest.mock('components/RolesSelect', () => {
	function MockRolesSelect({
		value = [],
		onChange,
		roles = [],
	}: {
		value?: string[];
		onChange?: (val: string[]) => void;
		roles?: Array<{ id: string; name: string }>;
		loading?: boolean;
		isError?: boolean;
		error?: unknown;
		onRefetch?: () => void;
		mode?: string;
		placeholder?: string;
		className?: string;
		getPopupContainer?: (el: HTMLElement) => HTMLElement;
	}): JSX.Element {
		return (
			<select
				multiple
				data-testid="roles-select"
				value={value}
				onChange={(e): void => {
					const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
					onChange?.(selected);
				}}
			>
				{roles.map((r: { id: string; name: string }) => (
					<option key={r.id} value={r.name}>
						{r.name}
					</option>
				))}
			</select>
		);
	}
	return {
		__esModule: true,
		default: MockRolesSelect,
		useRoles: jest.fn(),
	};
});

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

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockCreateServiceAccount = jest.fn();
const mockUseRoles = jest.mocked(useRoles);
const mockToast = jest.mocked(toast);

describe('CreateServiceAccountModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(useCreateServiceAccount).mockReturnValue(({
			mutateAsync: mockCreateServiceAccount,
		} as unknown) as ReturnType<typeof useCreateServiceAccount>);
		mockUseRoles.mockReturnValue({
			roles: managedRoles,
			isLoading: false,
			isError: false,
			error: undefined,
			refetch: jest.fn(),
		});
	});

	it('submit button is disabled when form is empty', () => {
		render(
			<CreateServiceAccountModal open onClose={jest.fn()} onSuccess={jest.fn()} />,
		);

		expect(
			screen.getByRole('button', { name: /Create Service Account/i }),
		).toBeDisabled();
	});

	it('submit button remains disabled when email is invalid', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<CreateServiceAccountModal open onClose={jest.fn()} onSuccess={jest.fn()} />,
		);

		await user.type(screen.getByPlaceholderText('Enter a name'), 'My Bot');
		await user.type(
			screen.getByPlaceholderText('email@example.com'),
			'not-an-email',
		);
		await user.selectOptions(screen.getByTestId('roles-select'), [
			'signoz-admin',
		]);

		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: /Create Service Account/i }),
			).toBeDisabled(),
		);
	});

	it('successful submit calls mutation, shows toast.success, and calls onSuccess + onClose', async () => {
		const onSuccess = jest.fn();
		const onClose = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		mockCreateServiceAccount.mockResolvedValue({});

		render(
			<CreateServiceAccountModal open onClose={onClose} onSuccess={onSuccess} />,
		);

		await user.type(screen.getByPlaceholderText('Enter a name'), 'Deploy Bot');
		await user.type(
			screen.getByPlaceholderText('email@example.com'),
			'deploy@acme.io',
		);
		await user.selectOptions(screen.getByTestId('roles-select'), [
			'signoz-admin',
		]);

		const submitBtn = screen.getByRole('button', {
			name: /Create Service Account/i,
		});
		await waitFor(() => expect(submitBtn).not.toBeDisabled());
		await user.click(submitBtn);

		await waitFor(() => {
			expect(mockCreateServiceAccount).toHaveBeenCalledWith({
				data: {
					name: 'Deploy Bot',
					email: 'deploy@acme.io',
					roles: ['signoz-admin'],
				},
			});
			expect(mockToast.success).toHaveBeenCalled();
			expect(onSuccess).toHaveBeenCalled();
			expect(onClose).toHaveBeenCalled();
		});
	});

	it('shows toast.error and does not call onSuccess on API error', async () => {
		const onSuccess = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		mockCreateServiceAccount.mockRejectedValue(new Error('Already exists'));

		render(
			<CreateServiceAccountModal open onClose={jest.fn()} onSuccess={onSuccess} />,
		);

		await user.type(screen.getByPlaceholderText('Enter a name'), 'Dupe Bot');
		await user.type(
			screen.getByPlaceholderText('email@example.com'),
			'dupe@acme.io',
		);
		await user.selectOptions(screen.getByTestId('roles-select'), [
			'signoz-admin',
		]);

		const submitBtn = screen.getByRole('button', {
			name: /Create Service Account/i,
		});
		await waitFor(() => expect(submitBtn).not.toBeDisabled());
		await user.click(submitBtn);

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith(
				expect.stringMatching(/Failed to create service account/i),
				expect.anything(),
			);
			expect(onSuccess).not.toHaveBeenCalled();
		});
	});

	it('Cancel button calls onClose without submitting', async () => {
		const onClose = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<CreateServiceAccountModal open onClose={onClose} onSuccess={jest.fn()} />,
		);

		await user.click(screen.getByRole('button', { name: /Cancel/i }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(mockCreateServiceAccount).not.toHaveBeenCalled();
	});

	it('shows "Name is required" after clearing the name field', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<CreateServiceAccountModal open onClose={jest.fn()} onSuccess={jest.fn()} />,
		);

		const nameInput = screen.getByPlaceholderText('Enter a name');
		await user.type(nameInput, 'Bot');
		await user.clear(nameInput);

		await screen.findByText('Name is required');
	});

	it('shows "Please enter a valid email address" for a malformed email', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<CreateServiceAccountModal open onClose={jest.fn()} onSuccess={jest.fn()} />,
		);

		await user.type(
			screen.getByPlaceholderText('email@example.com'),
			'not-an-email',
		);

		await screen.findByText('Please enter a valid email address');
	});
});
