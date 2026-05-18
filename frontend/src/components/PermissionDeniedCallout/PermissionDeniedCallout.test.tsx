import { render, screen } from 'tests/test-utils';
import PermissionDeniedCallout from './PermissionDeniedCallout';

describe('PermissionDeniedCallout', () => {
	it('renders the permission name in the callout message', () => {
		render(<PermissionDeniedCallout permissionName="serviceaccount:attach" />);

		expect(screen.getByText(/You don't have/)).toBeInTheDocument();
		expect(screen.getByText(/serviceaccount:attach/)).toBeInTheDocument();
		expect(screen.getByText(/permission/)).toBeInTheDocument();
	});

	it('accepts an optional className', () => {
		const { container } = render(
			<PermissionDeniedCallout
				permissionName="serviceaccount:read"
				className="custom-class"
			/>,
		);
		expect(container.firstChild).toHaveClass('custom-class');
	});
});
