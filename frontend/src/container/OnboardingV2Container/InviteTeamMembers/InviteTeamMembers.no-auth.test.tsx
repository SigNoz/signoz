import InviteTeamMembers from 'container/OnboardingV2Container/InviteTeamMembers/InviteTeamMembers';
import { screen } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

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

describe('OnboardingV2Container InviteTeamMembers — no-auth mode', () => {
	it('renders no-auth guard wrapper for the invite button', () => {
		renderWithNoAuth(
			<InviteTeamMembers
				isLoading={false}
				teamMembers={null}
				setTeamMembers={jest.fn()}
				onNext={jest.fn()}
				onClose={jest.fn()}
			/>,
		);
		expect(screen.getByTestId('no-auth-v2-invite')).toBeInTheDocument();
	});
});
