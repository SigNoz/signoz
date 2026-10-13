import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	membersMocks,
	openMember,
	openResetLink,
	sendInvites,
	untilLoaded,
} from './Members.stories.mocks';

import SettingsPage from '../../Settings';

type MembersArgs = PageStoryArgs<typeof membersMocks>;

const pageStory = storyMocks(membersMocks, { layout: 'app' });

/**
 * Members, pending invites and deleted users, the role each holds, and the invite
 * link flow.
 *
 * Route: `/settings/members`.
 */
const meta = {
	title: 'Pages/Settings/Members',
	tags: ['play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<MembersArgs>;

export default meta;

type Story = StoryObj<MembersArgs>;

/** One more than the twenty rows a page holds. */
const OVER_ONE_PAGE = 21;

const openPendingMember = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}): Promise<void> => {
	await openMember(canvasElement, /podrick payne/i);
	await screen.findByText(/invited on/i, undefined, untilLoaded);
};

/**
 * Everyone with a seat in the workspace: who they are, whether they have taken
 * up their invite, and when they joined.
 */
export const Default: Story = {};

/** A workspace where everyone invited is still to sign in for the first time. */
export const AllPending: Story = {
	args: { active: 0, invited: 5, deleted: 0 },
};

/** Interaction: the status menu is open with the real member counts. */
export const FilterMenuOpen: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/all members/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/pending invites/i, undefined, untilLoaded);
	},
};

/** Interaction: the pending-invite filter narrows the real member table. */
export const PendingOnly: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/all members/i,
				undefined,
				untilLoaded,
			),
		);
		await userEvent.click(
			await screen.findByText(/^pending invites/i, undefined, untilLoaded),
		);
		// One badge per pending row.
		await screen.findAllByText('INVITED', undefined, untilLoaded);
	},
};

/** Interaction: the deleted-member filter exposes the read-only member rows. */
export const DeletedOnly: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/all members/i,
				undefined,
				untilLoaded,
			),
		);
		await userEvent.click(
			// The unfiltered table already shows a DELETED badge, so the menu option
			// is matched on its own count suffix.
			await screen.findByText(/^deleted ⎯/i, undefined, untilLoaded),
		);
		await screen.findAllByText('DELETED', undefined, untilLoaded);
	},
};

/** Empty: searching for a non-member renders the table's supported empty state. */
export const SearchNoResults: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.type(
			await within(canvasElement).findByPlaceholderText(
				/search by name or email/i,
				undefined,
				untilLoaded,
			),
			'no-such-member',
		);
		await screen.findByText(/no results for/i, undefined, untilLoaded);
	},
};

/** More members than one page holds, which is where the pager appears. */
export const Paginated: Story = {
	args: { active: OVER_ONE_PAGE },
};

/** A member opened up: the name and roles that can be changed from here. */
export const EditMember: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openMember(canvasElement, /jon snow/i);
		await screen.findByPlaceholderText(/enter name/i, undefined, untilLoaded);
	},
};

/**
 * A member who has not accepted yet, whose drawer carries the invite link and
 * the date it runs out.
 */
export const PendingInvite: Story = {
	play: openPendingMember,
};

/** The same member after the link that was mailed to them has run out. */
export const ExpiredInvite: Story = {
	args: { inviteToken: 'expired' },
	play: openPendingMember,
};

/** Interaction: deleting an active member is guarded by its confirmation dialog. */
export const DeleteMemberConfirm: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openMember(canvasElement, /jon snow/i);
		await userEvent.click(
			await screen.findByRole('button', { name: 'Delete Member' }),
		);
		await screen.findByRole('dialog', { name: 'Delete Member' });
	},
};

/** Interaction: revoking a pending invite uses its distinct confirmation copy. */
export const RevokeInviteConfirm: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openPendingMember({ canvasElement });
		await userEvent.click(
			await screen.findByRole('button', { name: 'Revoke Invite' }),
		);
		await screen.findByRole('dialog', { name: 'Revoke Invite' });
	},
};

/**
 * The roles a member can be given. The dropdown opens off the inner combobox,
 * not the wrapper the click lands on first.
 */
export const AssignRoles: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openMember(canvasElement, /jon snow/i);
		await userEvent.click(await screen.findByRole('combobox'));
		await screen.findByText('oncall-responder', undefined, untilLoaded);
	},
};

/** The form that mails seats out: an email and a role per row. */
export const InviteMembers: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/invite member/i,
				undefined,
				untilLoaded,
			),
		);
		// The form opens with a row per seat, each carrying its own email field.
		await screen.findAllByTestId(/^invite-email-/, undefined, untilLoaded);
	},
};

/**
 * Invites sent to every address: the toast confirming it. Set Sending invites
 * to `error` or `loading` to see the form instead.
 */
export const InvitesSentToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await sendInvites(canvasElement, [
			'bran@nightswatch.io',
			'hodor@nightswatch.io',
		]);
		if (args.invite === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/invites sent successfully/i)).toBeVisible(),
			);
		}
	},
};

/** One address refused out of two: the warning that some invites failed. */
export const InvitesPartiallyFailedToast: Story = {
	// The 409 for the refused address is the state under test.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement, args }): Promise<void> => {
		await sendInvites(canvasElement, [
			'bran@nightswatch.io',
			'hodor@blocked.example',
		]);
		if (args.invite === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/some invites failed/i)).toBeVisible(),
			);
		}
	},
};

/**
 * A member's name changed and saved: the toast confirming it. Set Saving the
 * member to `error` or `loading` to see the drawer instead.
 */
export const MemberUpdatedToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await openMember(canvasElement, /jon snow/i);
		const name = await screen.findByPlaceholderText(
			/enter name/i,
			undefined,
			untilLoaded,
		);

		await waitFor(() => expect(name).toHaveValue('Jon Snow'), untilLoaded);
		await userEvent.type(name, ' Targaryen');
		await userEvent.click(
			await screen.findByRole('button', { name: 'Save Member Details' }),
		);
		if (args.memberUpdate === 'success') {
			await waitFor(() =>
				expect(
					screen.getByText(/member details updated successfully/i),
				).toBeVisible(),
			);
		}
	},
};

/**
 * A member deleted from the confirmation: the toast confirming it. Set Deleting
 * the member to `error` or `loading` to see the dialog instead.
 */
export const MemberDeletedToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await openMember(canvasElement, /jon snow/i);
		await userEvent.click(
			await screen.findByRole('button', { name: 'Delete Member' }),
		);
		const dialog = await screen.findByRole('dialog', { name: 'Delete Member' });

		await userEvent.click(
			within(dialog).getByRole('button', { name: 'Delete Member' }),
		);
		if (args.memberDelete === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/member deleted successfully/i)).toBeVisible(),
			);
		}
	},
};

/**
 * A pending invite revoked from the confirmation: the toast confirming it. Set
 * Deleting the member to `error` or `loading` to see the dialog instead.
 */
export const InviteRevokedToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await openPendingMember({ canvasElement });
		await userEvent.click(
			await screen.findByRole('button', { name: 'Revoke Invite' }),
		);
		const dialog = await screen.findByRole('dialog', { name: 'Revoke Invite' });

		await userEvent.click(
			within(dialog).getByRole('button', { name: 'Revoke Invite' }),
		);
		if (args.memberDelete === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/invite revoked successfully/i)).toBeVisible(),
			);
		}
	},
};

/**
 * The generated password reset link copied from its dialog: the toast
 * confirming it.
 */
export const ResetLinkCopiedToast: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openResetLink(canvasElement);
		await userEvent.click(
			await screen.findByRole('button', { name: /^copy$/i }, untilLoaded),
		);
		await screen.findByText(/reset link copied to clipboard/i);
	},
};

/**
 * The invite link of a pending member copied from its dialog: the toast
 * confirming it.
 */
export const InviteLinkCopiedToast: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openPendingMember({ canvasElement });
		await userEvent.click(
			await screen.findByRole('button', { name: /invite link/i }, untilLoaded),
		);
		await userEvent.click(
			await screen.findByRole('button', { name: /^copy$/i }, untilLoaded),
		);
		await screen.findByText(/invite link copied to clipboard/i);
	},
};

/**
 * A reset link request that answers without a token: the toast reporting the
 * failure. Set Generating a link to `success` for the dialog instead.
 */
export const ResetLinkFailedToast: Story = {
	args: { resetLink: 'no-token' },
	play: async ({ canvasElement, args }): Promise<void> => {
		await openResetLink(canvasElement);
		if (args.resetLink === 'no-token') {
			await waitFor(() =>
				expect(
					screen.getByText(/failed to generate password reset link/i),
				).toBeVisible(),
			);
		}
	},
};
