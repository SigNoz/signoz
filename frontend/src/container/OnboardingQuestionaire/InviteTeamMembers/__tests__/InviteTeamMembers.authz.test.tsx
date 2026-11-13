import { InviteMembersProps } from 'components/InviteMembers/types';
import { UserCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/user.permissions';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import InviteTeamMembers from '../InviteTeamMembers';

jest.mock('api/common/logEvent', () => jest.fn());

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: { success: jest.fn(), warning: jest.fn() },
	}),
}));

jest.mock('components/RolesSelect/RolesSelect', () => ({
	useRoles: (): any => ({
		roles: [],
		isLoading: false,
		isError: false,
		error: undefined,
		refetch: jest.fn(),
	}),
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

describe('InviteTeamMembers authz', () => {
	it('enables Send Invites with create:user', async () => {
		server.use(setupAuthzAdmin());
		render(<InviteTeamMembers isLoading={false} onNext={jest.fn()} />);

		const button = screen.getByTestId('send-invites-button');
		await waitFor(() => expect(button).not.toHaveAttribute('aria-busy', 'true'));
		expect(button).not.toHaveAttribute('aria-disabled', 'true');
	});

	it('disables Send Invites without create:user', async () => {
		server.use(setupAuthzDeny(UserCreatePermission));
		render(<InviteTeamMembers isLoading={false} onNext={jest.fn()} />);

		await waitFor(() =>
			expect(screen.getByTestId('send-invites-button')).toHaveAttribute(
				'data-denied-permissions',
				UserCreatePermission,
			),
		);
		expect(screen.getByTestId('send-invites-button')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});
});
