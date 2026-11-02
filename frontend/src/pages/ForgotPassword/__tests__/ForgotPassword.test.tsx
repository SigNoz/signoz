import ROUTES from 'constants/routes';
import { navigate } from 'lib/router/navigation';
import { render, waitFor } from 'tests/test-utils';

import ForgotPassword from '../index';

// Mock dependencies
jest.mock('lib/router/navigation', () => ({
	...jest.requireActual('lib/router/navigation'),
	navigate: jest.fn(),
}));

const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

describe('ForgotPassword Page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Route State Handling', () => {
		it('redirects to login when route state is missing', async () => {
			render(<ForgotPassword />, undefined, {
				initialRoute: '/forgot-password',
			});

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
			});
		});

		it('returns null when route state is missing', () => {
			const { container } = render(<ForgotPassword />, undefined, {
				initialRoute: '/forgot-password',
			});

			expect(container.firstChild).toBeNull();
		});
	});
});
