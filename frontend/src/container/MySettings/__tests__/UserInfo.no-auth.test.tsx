import UserInfo from 'container/MySettings/UserInfo';
import { screen } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

jest.mock('api/generated/services/users', () => ({
	...jest.requireActual('api/generated/services/users'),
	useUpdateMyUserV2: jest.fn(() => ({
		mutateAsync: jest.fn(),
		isLoading: false,
	})),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			error: jest.fn(),
			success: jest.fn(),
		},
	}),
}));

describe('UserInfo — no-auth mode', () => {
	it('renders no-auth guard wrappers for Update name and Reset password buttons', () => {
		renderWithNoAuth(<UserInfo />);
		expect(screen.getByTestId('no-auth-update-name')).toBeInTheDocument();
		expect(screen.getByTestId('no-auth-reset-password')).toBeInTheDocument();
	});
});
