import InviteTeamMembers from 'container/OnboardingQuestionaire/InviteTeamMembers/InviteTeamMembers';
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

describe('OnboardingQuestionaire InviteTeamMembers — no-auth mode', () => {
	it('renders no-auth guard wrapper for the invite button', () => {
		renderWithNoAuth(
			<InviteTeamMembers
				isLoading={false}
				teamMembers={null}
				setTeamMembers={jest.fn()}
				onNext={jest.fn()}
			/>,
		);
		expect(screen.getByTestId('no-auth-onboarding-invite')).toBeInTheDocument();
	});
});
