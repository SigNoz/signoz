import { screen } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

jest.mock('@signozhq/ui/switch', () => ({
	...jest.requireActual('@signozhq/ui/switch'),
	Switch: ({
		value,
		disabled,
	}: {
		value: boolean;
		disabled?: boolean;
	}): JSX.Element => (
		<button
			type="button"
			role="switch"
			aria-checked={value}
			disabled={disabled}
		/>
	),
}));

import SSOEnforcementToggle from '../SSOEnforcementToggle';
import { mockGoogleAuthDomain } from './mocks';

describe('SSOEnforcementToggle — no-auth mode', () => {
	it('renders no-auth guard sentinel when isNoAuthMode is true', () => {
		renderWithNoAuth(
			<SSOEnforcementToggle
				isDefaultChecked={false}
				record={mockGoogleAuthDomain}
			/>,
		);

		expect(screen.getByTestId('no-auth-sso-toggle')).toBeInTheDocument();
	});
});
