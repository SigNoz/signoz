/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { getToastText } from '@/storybook/play/toastText';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	closeRoles,
	findInviteRoleTriggers,
	membersMocks,
	openInviteForm,
	openMember,
	openResetLink,
	roleItemTestId,
	sendInvites,
	untilLoaded,
} from '../Members.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof membersMocks>;
}

const openStatusFilter = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(
			/all members/i,
			undefined,
			untilLoaded,
		),
	);
};

export const openFilterMenu = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openStatusFilter(canvasElement);
	await screen.findByText(/pending invites/i, undefined, untilLoaded);
};

export const filterPendingOnly = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openStatusFilter(canvasElement);
	await userEvent.click(
		await screen.findByText(/^pending invites/i, undefined, untilLoaded),
	);
	// One badge per pending row.
	await screen.findAllByText('INVITED', undefined, untilLoaded);
};

export const filterDeletedOnly = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openStatusFilter(canvasElement);
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
	await userEvent.type(
		await within(canvasElement).findByPlaceholderText(
			/search by name or email/i,
			undefined,
			untilLoaded,
		),
		'no-such-member',
	);
	await screen.findByText(/no results for/i, undefined, untilLoaded);
};

export const openEditMember = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	await screen.findByPlaceholderText(/enter name/i, undefined, untilLoaded);
};

export const openPendingMember = async ({
	canvasElement,
}: Pick<PlayContext, 'canvasElement'>): Promise<void> => {
	await openMember(canvasElement, /podrick payne/i);
	await screen.findByText(/invited on/i, undefined, untilLoaded);
};

export const openDeleteMemberConfirm = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	await userEvent.click(
		await screen.findByRole('button', { name: 'Delete Member' }),
	);
	await screen.findByRole('alertdialog', { name: 'Delete Member' });
};

export const openRevokeInviteConfirm = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openPendingMember({ canvasElement });
	await userEvent.click(
		await screen.findByRole('button', { name: 'Revoke Invite' }),
	);
	await screen.findByRole('alertdialog', { name: 'Revoke Invite' });
};

export const openAssignRoles = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	await userEvent.click(
		await screen.findByTestId('member-roles-select', undefined, untilLoaded),
	);
	await screen.findByTestId(
		roleItemTestId('member-roles-select', 'oncall-responder'),
		undefined,
		untilLoaded,
	);
};

export const openInviteMembers = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openInviteForm(canvasElement);
};

export const openInviteRoles = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openInviteForm(canvasElement);
	const [trigger] = await findInviteRoleTriggers();

	await userEvent.click(trigger);
	await screen.findByTestId(
		roleItemTestId(trigger.dataset.testid ?? '', 'viewer'),
		undefined,
		untilLoaded,
	);
};

export const selectInviteRoles = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openInviteForm(canvasElement);
	const [trigger] = await findInviteRoleTriggers();
	const triggerTestId = trigger.dataset.testid ?? '';

	await userEvent.click(trigger);
	for (const role of ['viewer', 'editor', 'oncall-responder']) {
		await userEvent.click(
			await screen.findByTestId(
				roleItemTestId(triggerTestId, role),
				undefined,
				untilLoaded,
			),
		);
	}
	await closeRoles();
	await screen.findByTestId(
		`${triggerTestId}-chip-role-oncall-responder`,
		undefined,
		untilLoaded,
	);
};

export const sendInvitesToAll = async ({
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

export const sendInvitesPartiallyRefused = async ({
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
};

export const deleteMember = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	await userEvent.click(
		await screen.findByRole('button', { name: 'Delete Member' }),
	);
	const dialog = await screen.findByRole('alertdialog', {
		name: 'Delete Member',
	});

	await userEvent.click(
		within(dialog).getByRole('button', { name: 'Delete Member' }),
	);
	if (args.memberDelete === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/member deleted successfully/i)).toBeVisible(),
		);
	}
};

export const revokeInvite = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await openPendingMember({ canvasElement });
	await userEvent.click(
		await screen.findByRole('button', { name: 'Revoke Invite' }),
	);
	const dialog = await screen.findByRole('alertdialog', {
		name: 'Revoke Invite',
	});

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

export const copyInviteLink = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openPendingMember({ canvasElement });
	await userEvent.click(
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
				getToastText(/failed to generate password reset link/i),
			).toBeVisible(),
		);
	}
};
