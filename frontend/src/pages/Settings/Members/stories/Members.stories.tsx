import type { Meta, StoryObj } from '@storybook/react-vite';
import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { membersMocks } from './Members.stories.mocks';
import {
	confirmDeleteMember,
	confirmRevokeInvite,
	copyInviteLink,
	copyResetLink,
	deleteMemberToast,
	failResetLink,
	filterDeleted,
	filterPending,
	openEditMember,
	openFilterMenu,
	openInviteForm,
	openPendingMember,
	openRoleDropdown,
	revokeInviteToast,
	saveMemberName,
	searchNoResults,
	sendInvitesToast,
	sendPartialInvitesToast,
} from './__story_mockdata__/members.play';

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
	title: 'Pages/Settings/Members/Overview',
	tags: ['authz', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<MembersArgs>;

export default meta;

type Story = StoryObj<MembersArgs>;

/** One more than the twenty rows a page holds. */
const OVER_ONE_PAGE = 21;

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
	play: openFilterMenu,
};

/** Interaction: the pending-invite filter narrows the real member table. */
export const PendingOnly: Story = {
	play: filterPending,
};

/** Interaction: the deleted-member filter exposes the read-only member rows. */
export const DeletedOnly: Story = {
	play: filterDeleted,
};

/** Empty: searching for a non-member renders the table's supported empty state. */
export const SearchNoResults: Story = {
	play: searchNoResults,
};

/** More members than one page holds, which is where the pager appears. */
export const Paginated: Story = {
	args: { active: OVER_ONE_PAGE },
};

/** A member opened up: the name and roles that can be changed from here. */
export const EditMember: Story = {
	play: openEditMember,
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
	play: confirmDeleteMember,
};

/** Interaction: revoking a pending invite uses its distinct confirmation copy. */
export const RevokeInviteConfirm: Story = {
	play: confirmRevokeInvite,
};

/**
 * The roles a member can be given. The dropdown opens off the inner combobox,
 * not the wrapper the click lands on first.
 */
export const AssignRoles: Story = {
	play: openRoleDropdown,
};

/** The form that mails seats out: an email and a role per row. */
export const InviteMembers: Story = {
	play: openInviteForm,
};

/**
 * Invites sent to every address: the toast confirming it. Set Sending invites
 * to `error` or `loading` to see the form instead.
 */
export const InvitesSentToast: Story = {
	play: sendInvitesToast,
};

/** One address refused out of two: the warning that some invites failed. */
export const InvitesPartiallyFailedToast: Story = {
	// The 409 for the refused address is the state under test.
	parameters: { allowConsoleErrors: true },
	play: sendPartialInvitesToast,
};

/**
 * A member's name changed and saved: the toast confirming it. Set Saving the
 * member to `error` or `loading` to see the drawer instead.
 */
export const MemberUpdatedToast: Story = {
	play: saveMemberName,
};

/**
 * A member deleted from the confirmation: the toast confirming it. Set Deleting
 * the member to `error` or `loading` to see the dialog instead.
 */
export const MemberDeletedToast: Story = {
	play: deleteMemberToast,
};

/**
 * A pending invite revoked from the confirmation: the toast confirming it. Set
 * Deleting the member to `error` or `loading` to see the dialog instead.
 */
export const InviteRevokedToast: Story = {
	play: revokeInviteToast,
};

/**
 * The generated password reset link copied from its dialog: the toast
 * confirming it.
 */
export const ResetLinkCopiedToast: Story = {
	play: copyResetLink,
};

/**
 * The invite link of a pending member copied from its dialog: the toast
 * confirming it.
 */
export const InviteLinkCopiedToast: Story = {
	play: copyInviteLink,
};

/**
 * A reset link request that answers without a token: the toast reporting the
 * failure. Set Generating a link to `success` for the dialog instead.
 */
export const ResetLinkFailedToast: Story = {
	args: { resetLink: 'no-token' },
	play: failResetLink,
};
