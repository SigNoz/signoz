import ROUTES from 'constants/routes';
import history from 'lib/history';
import { render, waitFor } from 'tests/test-utils';

import ForgotPassword from '../index';

// Mock dependencies
jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: {
			search: '',
		},
	},
}));

const mockHistoryPush = history.push as jest.MockedFunction<
	typeof history.push
>;

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
				expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.LOGIN);
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
