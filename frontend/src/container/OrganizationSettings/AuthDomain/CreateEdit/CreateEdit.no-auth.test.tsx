import { fireEvent, screen } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import CreateEdit from './CreateEdit';
import { mockGoogleAuthDomain } from '../__tests__/mocks';

describe('CreateEdit — no-auth mode', () => {
	it('renders no-auth guard sentinel for Save Changes button', () => {
		renderWithNoAuth(
			<CreateEdit
				isCreate={false}
				record={mockGoogleAuthDomain}
				onClose={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('no-auth-save-auth-domain')).toBeInTheDocument();
	});

	it('renders no-auth guard sentinel for Save Changes button in create mode after selecting provider', async () => {
		renderWithNoAuth(<CreateEdit isCreate onClose={jest.fn()} />);

		const configureButtons = await screen.findAllByRole('button', {
			name: /configure/i,
		});
		fireEvent.click(configureButtons[0]);

		await expect(
			screen.findByTestId('no-auth-save-auth-domain'),
		).resolves.toBeInTheDocument();
	});
});
