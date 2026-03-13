import type { ReactNode } from 'react';
import { toast } from '@signozhq/sonner';
import {
	useCreateServiceAccountKey,
	useListServiceAccountKeys,
	useRevokeServiceAccountKey,
	useUpdateServiceAccount,
	useUpdateServiceAccountKey,
	useUpdateServiceAccountStatus,
} from 'api/generated/services/serviceaccount';
import { useRoles } from 'components/RolesSelect';
import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';
import { managedRoles } from 'mocks-server/__mockdata__/roles';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ServiceAccountDrawer, {
	ServiceAccountDrawerProps,
} from '../ServiceAccountDrawer';

let mockOnToggleGroupChange: ((val: string) => void) | undefined;

jest.mock('@signozhq/toggle-group', () => ({
	ToggleGroup: ({
		children,
		onValueChange,
		className,
	}: {
		children: ReactNode;
		onValueChange?: (val: string) => void;
		value?: string;
		type?: string;
		className?: string;
	}): JSX.Element => {
		mockOnToggleGroupChange = onValueChange;
		return <div className={className}>{children}</div>;
	},
	ToggleGroupItem: ({
		children,
		value,
		className,
	}: {
		children: ReactNode;
		value: string;
		className?: string;
	}): JSX.Element => (
		<button
			type="button"
			className={className}
			onClick={(): void => mockOnToggleGroupChange?.(value)}
		>
			{children}
		</button>
	),
}));

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

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUpdate = jest.fn();
const mockUpdateStatus = jest.fn();
const mockToast = jest.mocked(toast);
const mockUseRoles = jest.mocked(useRoles);

const activeAccount: ServiceAccountRow = {
	id: 'sa-1',
	name: 'CI Bot',
	email: 'ci-bot@signoz.io',
	roles: ['signoz-admin'],
	status: 'ACTIVE',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z',
};

const disabledAccount: ServiceAccountRow = {
	...activeAccount,
	id: 'sa-2',
	status: 'DISABLED',
};

function renderDrawer(
	props: Partial<ServiceAccountDrawerProps> = {},
): ReturnType<typeof render> {
	return render(
		<ServiceAccountDrawer
			account={activeAccount}
			open
			onClose={jest.fn()}
			onSuccess={jest.fn()}
			{...props}
		/>,
	);
}

describe('ServiceAccountDrawer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockOnToggleGroupChange = undefined;

		jest.mocked(useListServiceAccountKeys).mockReturnValue(({
			data: { data: [] },
			isLoading: false,
			refetch: jest.fn(),
		} as unknown) as ReturnType<typeof useListServiceAccountKeys>);

		jest.mocked(useUpdateServiceAccount).mockReturnValue(({
			mutateAsync: mockUpdate,
		} as unknown) as ReturnType<typeof useUpdateServiceAccount>);

		jest.mocked(useUpdateServiceAccountStatus).mockReturnValue(({
			mutateAsync: mockUpdateStatus,
		} as unknown) as ReturnType<typeof useUpdateServiceAccountStatus>);

		jest.mocked(useCreateServiceAccountKey).mockReturnValue(({
			mutateAsync: jest.fn(),
		} as unknown) as ReturnType<typeof useCreateServiceAccountKey>);

		jest.mocked(useRevokeServiceAccountKey).mockReturnValue(({
			mutateAsync: jest.fn(),
		} as unknown) as ReturnType<typeof useRevokeServiceAccountKey>);

		jest.mocked(useUpdateServiceAccountKey).mockReturnValue(({
			mutateAsync: jest.fn(),
		} as unknown) as ReturnType<typeof useUpdateServiceAccountKey>);

		mockUseRoles.mockReturnValue({
			roles: managedRoles,
			isLoading: false,
			isError: false,
			error: undefined,
			refetch: jest.fn(),
		});
	});

	it('renders Overview tab by default: editable name input, locked email, Save disabled when not dirty', () => {
		renderDrawer();

		expect(screen.getByDisplayValue('CI Bot')).toBeInTheDocument();
		expect(screen.getByText('ci-bot@signoz.io')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
	});

	it('editing name enables Save; clicking Save calls updateAccount with correct payload', async () => {
		const onSuccess = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		mockUpdate.mockResolvedValue({});

		renderDrawer({ onSuccess });

		const nameInput = screen.getByDisplayValue('CI Bot');
		await user.clear(nameInput);
		await user.type(nameInput, 'CI Bot Updated');

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockUpdate).toHaveBeenCalledWith({
				pathParams: { id: 'sa-1' },
				data: {
					name: 'CI Bot Updated',
					email: 'ci-bot@signoz.io',
					roles: ['signoz-admin'],
				},
			});
			expect(mockToast.success).toHaveBeenCalled();
			expect(onSuccess).toHaveBeenCalledWith({ closeDrawer: false });
		});
	});

	it('changing roles enables Save; clicking Save calls updateAccount with updated roles', async () => {
		const onSuccess = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		mockUpdate.mockResolvedValue({});

		renderDrawer({ onSuccess });

		const rolesSelect = screen.getByTestId('roles-select');
		await user.selectOptions(rolesSelect, ['signoz-viewer']);

		const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
		await waitFor(() => expect(saveBtn).not.toBeDisabled());
		await user.click(saveBtn);

		await waitFor(() => {
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						roles: expect.arrayContaining(['signoz-admin', 'signoz-viewer']),
					}),
				}),
			);
		});
	});

	it('"Disable Service Account" opens confirm dialog; confirming calls updateStatus and onSuccess({ closeDrawer: true })', async () => {
		const onSuccess = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		mockUpdateStatus.mockResolvedValue({});

		renderDrawer({ onSuccess });

		await user.click(
			screen.getByRole('button', { name: /Disable Service Account/i }),
		);

		const dialog = await screen.findByRole('dialog', {
			name: /Disable service account CI Bot/i,
		});
		expect(dialog).toBeInTheDocument();

		const confirmBtns = screen.getAllByRole('button', { name: /^Disable$/i });
		await user.click(confirmBtns[confirmBtns.length - 1]);

		await waitFor(() => {
			expect(mockUpdateStatus).toHaveBeenCalledWith({
				pathParams: { id: 'sa-1' },
				data: { status: 'DISABLED' },
			});
			expect(onSuccess).toHaveBeenCalledWith({ closeDrawer: true });
		});
	});

	it('disabled account shows read-only name, no Save button, no Disable button', () => {
		renderDrawer({ account: disabledAccount });

		expect(
			screen.queryByRole('button', { name: /Save Changes/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /Disable Service Account/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByDisplayValue('CI Bot')).not.toBeInTheDocument();
		expect(screen.getByText('CI Bot')).toBeInTheDocument();
	});

	it('switching to Keys tab shows "No keys" empty state', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer();

		await user.click(screen.getByRole('button', { name: /Keys/i }));

		await screen.findByText(/No keys/i);
	});
});
