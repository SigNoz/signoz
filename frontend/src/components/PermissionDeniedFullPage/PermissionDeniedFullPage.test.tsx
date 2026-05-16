import { render, screen } from 'tests/test-utils';
import PermissionDeniedFullPage from './PermissionDeniedFullPage';

describe('PermissionDeniedFullPage', () => {
	it('renders the title and subtitle with the permissionName interpolated', () => {
		render(<PermissionDeniedFullPage permissionName="serviceaccount:list" />);

		expect(
			screen.getByText("Uh-oh! You don't have permission to view this page."),
		).toBeInTheDocument();
		expect(screen.getByText(/serviceaccount:list/)).toBeInTheDocument();
		expect(
			screen.getByText(/Please ask your SigNoz administrator to grant access/),
		).toBeInTheDocument();
	});

	it('renders with a different permissionName', () => {
		render(<PermissionDeniedFullPage permissionName="role:read" />);
		expect(screen.getByText(/role:read/)).toBeInTheDocument();
	});
});
