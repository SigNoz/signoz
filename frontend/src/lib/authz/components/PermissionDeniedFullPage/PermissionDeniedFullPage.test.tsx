import { render, screen } from 'tests/test-utils';
import PermissionDeniedFullPage from './PermissionDeniedFullPage';
import {
	buildPermission,
	buildObjectString,
} from 'lib/authz/hooks/useAuthZ/utils';

describe('PermissionDeniedFullPage', () => {
	it('renders the title and subtitle with the permissionName interpolated', () => {
		const deniedPermissions = [
			buildPermission('read', buildObjectString('serviceaccount', '*')),
		];
		render(<PermissionDeniedFullPage deniedPermissions={deniedPermissions} />);

		expect(screen.getByText('Uh-oh! You are not authorized')).toBeInTheDocument();
		expect(screen.getByText(/read:serviceaccount:\*/)).toBeInTheDocument();
		expect(screen.getByText(/is not authorized to perform/)).toBeInTheDocument();
	});

	it('renders with multiple denied permissions', () => {
		const deniedPermissions = [
			buildPermission('read', buildObjectString('role', 'admin')),
			buildPermission('update', buildObjectString('role', 'admin')),
		];
		render(<PermissionDeniedFullPage deniedPermissions={deniedPermissions} />);
		expect(screen.getByText(/read:role:admin/)).toBeInTheDocument();
		expect(screen.getByText(/update:role:admin/)).toBeInTheDocument();
	});
});
