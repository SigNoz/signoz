import { render, screen } from 'tests/test-utils';
import PermissionDeniedCallout from './PermissionDeniedCallout';
import {
	buildPermission,
	buildObjectString,
} from 'lib/authz/hooks/useAuthZ/utils';

describe('PermissionDeniedCallout', () => {
	it('renders the permission name in the callout message', () => {
		const deniedPermissions = [
			buildPermission('read', buildObjectString('serviceaccount', '*')),
		];
		render(<PermissionDeniedCallout deniedPermissions={deniedPermissions} />);

		expect(screen.getByText(/is not authorized/)).toBeInTheDocument();
		expect(screen.getByText(/read:serviceaccount:\*/)).toBeInTheDocument();
	});

	it('renders multiple denied permissions', () => {
		const deniedPermissions = [
			buildPermission('read', buildObjectString('serviceaccount', '*')),
			buildPermission('update', buildObjectString<'update'>('role', 'admin')),
		];
		render(<PermissionDeniedCallout deniedPermissions={deniedPermissions} />);

		expect(screen.getByText(/read:serviceaccount:\*/)).toBeInTheDocument();
		expect(screen.getByText(/update:role:admin/)).toBeInTheDocument();
	});

	it('renders the server denial when given one', () => {
		render(
			<PermissionDeniedCallout message="user/u-1 is not authorized to perform metric:read" />,
		);

		expect(
			screen.getByText('user/u-1 is not authorized to perform metric:read'),
		).toBeInTheDocument();
	});

	it('accepts an optional className', () => {
		const deniedPermissions = [
			buildPermission('read', buildObjectString('serviceaccount', '*')),
		];
		render(
			<PermissionDeniedCallout
				deniedPermissions={deniedPermissions}
				className="custom-class"
			/>,
		);
		expect(screen.getByTestId('permission-denied-callout-wrapper')).toHaveClass(
			'custom-class',
		);
	});
});
