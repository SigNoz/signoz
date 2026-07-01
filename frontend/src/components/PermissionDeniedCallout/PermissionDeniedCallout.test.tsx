import { render, screen } from 'tests/test-utils';
import PermissionDeniedCallout from './PermissionDeniedCallout';

describe('PermissionDeniedCallout', () => {
	it('renders the permission name in the callout message', () => {
		render(<PermissionDeniedCallout permissionName="serviceaccount:attach" />);

		expect(screen.getByText(/is not authorized/)).toBeInTheDocument();
		expect(screen.getByText(/serviceaccount:attach/)).toBeInTheDocument();
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
