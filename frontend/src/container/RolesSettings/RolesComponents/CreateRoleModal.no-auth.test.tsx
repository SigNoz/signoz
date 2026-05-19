import { screen } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import CreateRoleModal from './CreateRoleModal';

describe('CreateRoleModal — no-auth mode', () => {
	it('renders no-auth guard sentinel for Create Role button', () => {
		renderWithNoAuth(<CreateRoleModal isOpen onClose={jest.fn()} />);

		expect(screen.getByTestId('no-auth-save-role')).toBeInTheDocument();
	});
});
