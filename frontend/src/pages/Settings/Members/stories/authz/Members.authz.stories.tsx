import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	ATTACH_USER,
	CREATE_PASSWORD,
	CREATE_USER,
	DELETE_USER,
	LIST_USER,
	READ_USER,
	UPDATE_USER,
} from '../__story_mockdata__/membersAuthz';
import {
	expectDeleteDenied,
	expectInviteDenied,
	expectInviteLinkDenied,
	expectInviteOpen,
	expectListDenied,
	expectReadDenied,
	expectResetLinkDenied,
	expectUpdateDenied,
} from '../__story_mockdata__/membersAuthz.play';
import { membersMocks } from '../Members.stories.mocks';

import SettingsPage from '../../../Settings';

type MembersArgs = PageStoryArgs<typeof membersMocks>;

const pageStory = storyMocks(membersMocks, { layout: 'app' });

/**
 * The members page with one permission missing at a time. Every story here is
 * an admin denied exactly what its name says. `list` decides whether the table
 * renders, `create` the Invite member button, and the rest are checked in the
 * drawer of a member.
 *
 * Route: `/settings/members`.
 */
const meta = {
	title: 'Pages/Settings/Members/Authz',
	tags: ['authz', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<MembersArgs>;

export default meta;

type Story = StoryObj<MembersArgs>;

/**
 * The denial takes the place of the table. The header stays and its filter and
 * search go inert.
 */
export const NoList: Story = {
	args: { revoked: [LIST_USER] },
	play: expectListDenied,
};

/** The list is intact and Invite member stays in the header, locked. */
export const NoCreate: Story = {
	args: { revoked: [CREATE_USER] },
	play: expectInviteDenied,
};

/** The drawer opens on the denial instead of the member's details. */
export const NoRead: Story = {
	args: { revoked: [READ_USER] },
	play: expectReadDenied,
};

/** The member opens, but the name is locked and there is nothing to save. */
export const NoUpdate: Story = {
	args: { revoked: [UPDATE_USER] },
	play: expectUpdateDenied,
};

/** Delete Member stays in the footer, locked. */
export const NoDelete: Story = {
	args: { revoked: [DELETE_USER] },
	play: expectDeleteDenied,
};

/** Generating a password reset link needs `factor-password` create. */
export const NoResetLink: Story = {
	args: { revoked: [CREATE_PASSWORD] },
	play: expectResetLinkDenied,
};

/** The reset link also needs `attach` on the member. */
export const NoUserAttach: Story = {
	args: { revoked: [ATTACH_USER] },
	play: expectResetLinkDenied,
};

/** A pending member's invite link is the same locked action under another label. */
export const NoInviteLink: Story = {
	args: { revoked: [CREATE_PASSWORD] },
	play: expectInviteLinkDenied,
};

/**
 * The permission check itself failed. The page treats it as granted rather than
 * locking everyone out.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	// The mocked check intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: expectInviteOpen,
};
