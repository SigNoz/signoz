import { ReactElement } from 'react';
import { render, screen } from 'tests/test-utils';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import type { AuthZObject } from 'lib/authz/hooks/useAuthZ/types';
import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';

import AuthZButton from './AuthZButton';

// AuthZButton is a thin composition over AuthZTooltip + Button. The denial
// tooltip / disabled-on-deny UX is owned and tested by AuthZTooltip; here we
// assert AuthZButton forwards the right props and renders a Button child.
jest.mock('lib/authz/components/AuthZTooltip/AuthZTooltip');
const mockTooltip = AuthZTooltip as unknown as jest.Mock;

const createPerm = buildPermission(
	'create',
	'serviceaccount:*' as AuthZObject<'create'>,
);

describe('AuthZButton', () => {
	beforeEach(() => {
		mockTooltip.mockImplementation(
			({ children }: { children: ReactElement }) => children,
		);
	});

	afterEach(() => {
		mockTooltip.mockReset();
	});

	it('renders a Button child with forwarded props', () => {
		render(
			<AuthZButton checks={[createPerm]} testId="create-btn">
				Create
			</AuthZButton>,
		);

		expect(screen.getByTestId('create-btn')).toBeInTheDocument();
		expect(screen.getByTestId('create-btn').tagName).toBe('BUTTON');
	});

	it('forwards checks and enables the check by default', () => {
		render(
			<AuthZButton checks={[createPerm]} testId="create-btn">
				Create
			</AuthZButton>,
		);

		expect(mockTooltip).toHaveBeenCalledTimes(1);
		expect(mockTooltip.mock.calls[0][0]).toMatchObject({
			checks: [createPerm],
			enabled: true,
		});
	});

	it('forwards a custom tooltipMessage', () => {
		render(
			<AuthZButton
				checks={[createPerm]}
				tooltipMessage="Ask an admin"
				testId="create-btn"
			>
				Create
			</AuthZButton>,
		);

		expect(mockTooltip.mock.calls[0][0]).toMatchObject({
			tooltipMessage: 'Ask an admin',
		});
	});

	it('passes authZEnabled through as the tooltip enabled flag', () => {
		render(
			<AuthZButton checks={[createPerm]} authZEnabled={false} testId="create-btn">
				Create
			</AuthZButton>,
		);

		expect(mockTooltip.mock.calls[0][0]).toMatchObject({ enabled: false });
	});
});
