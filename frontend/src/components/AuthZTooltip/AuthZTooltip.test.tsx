import { ReactElement } from 'react';
import { render, screen } from 'tests/test-utils';
import { buildPermission } from 'hooks/useAuthZ/utils';
import type { AuthZObject, BrandedPermission } from 'hooks/useAuthZ/types';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import AuthZTooltip from './AuthZTooltip';

jest.mock('hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

const noPermissions = {
	isLoading: false,
	isFetching: false,
	error: null,
	permissions: null,
	refetchPermissions: jest.fn(),
};

const TestButton = (
	props: React.ButtonHTMLAttributes<HTMLButtonElement>,
): ReactElement => (
	<button type="button" {...props}>
		Action
	</button>
);

const createPerm = buildPermission(
	'create',
	'serviceaccount:*' as AuthZObject<'create'>,
);
const attachSAPerm = (id: string): BrandedPermission =>
	buildPermission('attach', `serviceaccount:${id}` as AuthZObject<'attach'>);
const attachRolePerm = buildPermission(
	'attach',
	'role:*' as AuthZObject<'attach'>,
);

describe('AuthZTooltip — single check', () => {
	it('renders child unchanged when permission is granted', () => {
		mockUseAuthZ.mockReturnValue({
			...noPermissions,
			permissions: { [createPerm]: { isGranted: true } },
		});

		render(
			<AuthZTooltip checks={[createPerm]}>
				<TestButton />
			</AuthZTooltip>,
		);

		expect(screen.getByRole('button', { name: 'Action' })).not.toBeDisabled();
	});

	it('disables child when permission is denied', () => {
		mockUseAuthZ.mockReturnValue({
			...noPermissions,
			permissions: { [createPerm]: { isGranted: false } },
		});

		render(
			<AuthZTooltip checks={[createPerm]}>
				<TestButton />
			</AuthZTooltip>,
		);

		expect(screen.getByRole('button', { name: 'Action' })).toBeDisabled();
	});

	it('disables child while loading', () => {
		mockUseAuthZ.mockReturnValue({ ...noPermissions, isLoading: true });

		render(
			<AuthZTooltip checks={[createPerm]}>
				<TestButton />
			</AuthZTooltip>,
		);

		expect(screen.getByRole('button', { name: 'Action' })).toBeDisabled();
	});
});

describe('AuthZTooltip — multi-check (checks array)', () => {
	it('renders child enabled when all checks are granted', () => {
		const sa = attachSAPerm('sa-1');
		mockUseAuthZ.mockReturnValue({
			...noPermissions,
			permissions: {
				[sa]: { isGranted: true },
				[attachRolePerm]: { isGranted: true },
			},
		});

		render(
			<AuthZTooltip checks={[sa, attachRolePerm]}>
				<TestButton />
			</AuthZTooltip>,
		);

		expect(screen.getByRole('button', { name: 'Action' })).not.toBeDisabled();
	});

	it('disables child when first check is denied, second granted', () => {
		const sa = attachSAPerm('sa-1');
		mockUseAuthZ.mockReturnValue({
			...noPermissions,
			permissions: {
				[sa]: { isGranted: false },
				[attachRolePerm]: { isGranted: true },
			},
		});

		render(
			<AuthZTooltip checks={[sa, attachRolePerm]}>
				<TestButton />
			</AuthZTooltip>,
		);

		expect(screen.getByRole('button', { name: 'Action' })).toBeDisabled();
	});

	it('disables child when both checks are denied and lists denied permissions in data attr', () => {
		const sa = attachSAPerm('sa-1');
		mockUseAuthZ.mockReturnValue({
			...noPermissions,
			permissions: {
				[sa]: { isGranted: false },
				[attachRolePerm]: { isGranted: false },
			},
		});

		render(
			<AuthZTooltip checks={[sa, attachRolePerm]}>
				<TestButton />
			</AuthZTooltip>,
		);

		expect(screen.getByRole('button', { name: 'Action' })).toBeDisabled();

		const wrapper = screen.getByRole('button', { name: 'Action' }).parentElement;
		expect(wrapper?.getAttribute('data-denied-permissions')).toContain(sa);
		expect(wrapper?.getAttribute('data-denied-permissions')).toContain(
			attachRolePerm,
		);
	});
});
