import { screen } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import OnboardingAddDataSource from '../AddDataSource';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('api/generated/services/global', () => ({
	useGetGlobalConfig: jest.fn(() => ({ data: undefined })),
}));

jest.mock('components/LaunchChatSupport/LaunchChatSupport', () => ({
	__esModule: true,
	default: (): JSX.Element => <button type="button">Contact Support</button>,
}));

describe('OnboardingAddDataSource — no-auth mode', () => {
	it('renders no-auth guard wrapper for the invite teammate button', () => {
		renderWithNoAuth(<OnboardingAddDataSource />);
		expect(screen.getByTestId('no-auth-invite-teammate')).toBeInTheDocument();
	});
});
