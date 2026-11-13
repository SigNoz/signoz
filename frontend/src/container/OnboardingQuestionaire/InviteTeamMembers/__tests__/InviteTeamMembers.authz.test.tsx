import { InviteMembersProps } from 'components/InviteMembers/types';
import type { useRoles } from 'components/RolesSelect/RolesSelect';
import type { useNotifications } from 'hooks/useNotifications';
import { UserCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/user.permissions';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import InviteTeamMembers from '../InviteTeamMembers';

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): ReturnType<typeof useNotifications> => ({
		notifications: {
			success: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warning: jest.fn(),
			open: jest.fn(),
			destroy: jest.fn(),
		},
	}),
}));

jest.mock('components/RolesSelect/RolesSelect', () => ({
	useRoles: (): ReturnType<typeof useRoles> => ({
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
