/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	clickWhenEnabled,
	MEMBERS_PAGE_SIZE,
	membersMocks,
	openMember,
	openResetLink,
	sendInvites,
	untilLoaded,
} from '../Members.stories.mocks';
import { memberName } from './members';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof membersMocks>;
}

/**
 * The first pending member is named after the active count and sits on the first
 * page only while the active members leave room for it.
 */
const openFirstPendingMember = async ({
	canvasElement,
	args,
}: PlayContext): Promise<boolean> => {
	if (args.invited === 0 || args.active >= MEMBERS_PAGE_SIZE) {
		return false;
	}
	await openMember(canvasElement, new RegExp(memberName(args.active), 'i'));
	await screen.findByText(/invited on/i, undefined, untilLoaded);
	return true;
};

export const openPendingMember = async (
	context: PlayContext,
): Promise<void> => {
	await openFirstPendingMember(context);
};

export const openFilterMenu = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await clickWhenEnabled(
		await within(canvasElement).findByText(
			/all members/i,
			undefined,
			untilLoaded,
		),
	);
	await screen.findByText(/pending invites/i, undefined, untilLoaded);
};

export const filterPending = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await clickWhenEnabled(
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
};

export const filterDeleted = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await clickWhenEnabled(
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
};

export const searchNoResults = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const search = await within(canvasElement).findByPlaceholderText(
		/search by name or email/i,
		undefined,
		untilLoaded,
	);

	await waitFor(() => expect(search).not.toBeDisabled(), untilLoaded);
	await userEvent.type(search, 'no-such-member');
	await screen.findByText(/no results for/i, undefined, untilLoaded);
};

export const openEditMember = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.active === 0) {
		return;
	}
	await openMember(canvasElement, /jon snow/i);
	await screen.findByPlaceholderText(/enter name/i, undefined, untilLoaded);
};

export const confirmDeleteMember = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	await clickWhenEnabled(
		await screen.findByRole('button', { name: 'Delete Member' }, untilLoaded),
	);
	await screen.findByRole('dialog', { name: 'Delete Member' });
};

export const confirmRevokeInvite = async (
	context: PlayContext,
): Promise<void> => {
	if (!(await openFirstPendingMember(context))) {
		return;
	}
	await clickWhenEnabled(
		await screen.findByRole('button', { name: 'Revoke Invite' }, untilLoaded),
	);
	await screen.findByRole('dialog', { name: 'Revoke Invite' });
};

export const openRoleDropdown = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	await userEvent.click(await screen.findByRole('combobox'));
	await screen.findByText('oncall-responder', undefined, untilLoaded);
};

export const openInviteForm = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await clickWhenEnabled(
		await within(canvasElement).findByText(
			/invite member/i,
			undefined,
			untilLoaded,
		),
	);
	// The form opens with a row per seat, each carrying its own email field.
	await screen.findAllByTestId(/^invite-email-/, undefined, untilLoaded);
};

export const sendInvitesToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await sendInvites(canvasElement, [
		'bran@nightswatch.io',
		'hodor@nightswatch.io',
	]);
	if (args.invite === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/invites sent successfully/i)).toBeVisible(),
		);
	}
};

export const sendPartialInvitesToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await sendInvites(canvasElement, [
		'bran@nightswatch.io',
		'hodor@blocked.example',
	]);
	if (args.invite === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/some invites failed/i)).toBeVisible(),
		);
	}
};

export const saveMemberName = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	const name = await screen.findByPlaceholderText(
		/enter name/i,
		undefined,
		untilLoaded,
	);

	await waitFor(() => expect(name).toHaveValue('Jon Snow'), untilLoaded);
	await waitFor(() => expect(name).not.toBeDisabled(), untilLoaded);
	await userEvent.type(name, ' Targaryen');
	await clickWhenEnabled(
		await screen.findByRole(
			'button',
			{ name: 'Save Member Details' },
			untilLoaded,
		),
	);
	if (args.memberUpdate === 'success') {
		await waitFor(() =>
			expect(
				screen.getByText(/member details updated successfully/i),
			).toBeVisible(),
		);
	}
};

export const deleteMemberToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	await clickWhenEnabled(
		await screen.findByRole('button', { name: 'Delete Member' }, untilLoaded),
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
};

export const revokeInviteToast = async (
	context: PlayContext,
): Promise<void> => {
	const { args } = context;

	if (!(await openFirstPendingMember(context))) {
		return;
	}
	await clickWhenEnabled(
		await screen.findByRole('button', { name: 'Revoke Invite' }, untilLoaded),
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
};

export const copyResetLink = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openResetLink(canvasElement);
	await userEvent.click(
		await screen.findByRole('button', { name: /^copy$/i }, untilLoaded),
	);
	await screen.findByText(/reset link copied to clipboard/i);
};

export const copyInviteLink = async (context: PlayContext): Promise<void> => {
	if (!(await openFirstPendingMember(context))) {
		return;
	}
	await clickWhenEnabled(
		await screen.findByRole('button', { name: /invite link/i }, untilLoaded),
	);
	await userEvent.click(
		await screen.findByRole('button', { name: /^copy$/i }, untilLoaded),
	);
	await screen.findByText(/invite link copied to clipboard/i);
};

export const failResetLink = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openResetLink(canvasElement);
	if (args.resetLink === 'no-token') {
		await waitFor(() =>
			expect(
				screen.getByText(/failed to generate password reset link/i),
			).toBeVisible(),
		);
	}
};
