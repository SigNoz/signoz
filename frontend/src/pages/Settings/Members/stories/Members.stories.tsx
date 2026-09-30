import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { membersMocks } from './Members.stories.mocks';

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

/** The table fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** One more than the twenty rows a page holds. */
const OVER_ONE_PAGE = 21;

/**
 * The click handler sits on the row rather than the cell, and the header row
 * resolves before the body has one: wait on a cell, then click the row it is in.
 */
const openMember = async (
	canvasElement: HTMLElement,
	name: RegExp,
): Promise<void> => {
	const cell = await within(canvasElement).findByText(
		name,
		undefined,
		untilLoaded,
	);

	await userEvent.click(cell.closest('tr') as HTMLElement);
};

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
