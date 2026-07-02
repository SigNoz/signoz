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
			buildPermission('update', buildObjectString('role', 'admin')),
		];
		render(<PermissionDeniedCallout deniedPermissions={deniedPermissions} />);

		expect(screen.getByText(/read:serviceaccount:\*/)).toBeInTheDocument();
		expect(screen.getByText(/update:role:admin/)).toBeInTheDocument();
	});

	it('accepts an optional className', () => {
		const deniedPermissions = [
			buildPermission('read', buildObjectString('serviceaccount', '*')),
		];
		const { container } = render(
			<PermissionDeniedCallout
				deniedPermissions={deniedPermissions}
				className="custom-class"
			/>,
		);
		expect(container.firstChild).toHaveClass('custom-class');
	});
});
