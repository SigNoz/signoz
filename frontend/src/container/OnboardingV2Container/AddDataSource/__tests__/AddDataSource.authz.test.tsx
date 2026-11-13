import { InviteMembersProps } from 'components/InviteMembers/types';
import { UserCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/user.permissions';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import OnboardingAddDataSource from '../AddDataSource';

jest.mock('components/LaunchChatSupport/LaunchChatSupport', () => ({
	__esModule: true,
	default: (): null => null,
}));

jest.mock('components/InviteMembers/InviteMembers', () => {
	return function MockInviteMembers(props: InviteMembersProps): JSX.Element {
		return (
			<div>
				{props.renderFooter?.({
					submit: jest.fn().mockResolvedValue([]),
					reset: jest.fn(),
					canSubmit: true,
					isSubmitting: false,
					touchedCount: 1,
				})}
			</div>
		);
	};
});

async function openInviteModal(): Promise<HTMLElement> {
	const user = userEvent.setup({ pointerEventsCheck: 0 });
	render(<OnboardingAddDataSource />);
	await user.click(screen.getByTestId('invite-teammate-btn'));
	return screen.findByTestId('onboarding-send-invites-btn');
}

describe('OnboardingAddDataSource invite modal authz', () => {
	it('enables Send Invites with create:user', async () => {
		server.use(setupAuthzAdmin());
		const button = await openInviteModal();

		await waitFor(() => expect(button).not.toHaveAttribute('aria-busy', 'true'));
		expect(button).not.toHaveAttribute('aria-disabled', 'true');
	});

	it('disables Send Invites without create:user', async () => {
		server.use(setupAuthzDeny(UserCreatePermission));
		const button = await openInviteModal();

		await waitFor(() =>
			expect(button).toHaveAttribute(
				'data-denied-permissions',
				UserCreatePermission,
			),
		);
		expect(button).toHaveAttribute('aria-disabled', 'true');
	});
});
