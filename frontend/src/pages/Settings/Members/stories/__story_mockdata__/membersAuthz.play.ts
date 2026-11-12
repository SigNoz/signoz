/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, waitFor, within } from 'storybook/test';

import {
	expectDenied,
	findInCanvas,
	findInDrawer,
	openMemberDrawer,
} from './membersAuthz';
import { openMember, untilLoaded } from '../Members.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
}

export const expectListDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await within(canvasElement).findByText(
		/is not authorized/,
		undefined,
		untilLoaded,
	);
	await expectDenied(await findInCanvas(canvasElement, 'members-search-input'));
	await expectDenied(
		await findInCanvas(canvasElement, 'members-filter-trigger'),
	);
};

export const expectInviteDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectDenied(await findInCanvas(canvasElement, 'invite-member-btn'));
};

export const expectReadDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMember(canvasElement, /jon snow/i);
	await screen.findByText(/is not authorized/, undefined, untilLoaded);
	await waitFor(() =>
		expect(screen.queryByPlaceholderText(/enter name/i)).not.toBeInTheDocument(),
	);
};

export const expectUpdateDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMemberDrawer(canvasElement);
	await expectDenied(
		await screen.findByPlaceholderText(/enter name/i, undefined, untilLoaded),
	);
	await expectDenied(await findInDrawer('member-save-btn'));
};

export const expectDeleteDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMemberDrawer(canvasElement);
	await expectDenied(await findInDrawer('member-delete-btn'));
};

export const expectResetLinkDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMemberDrawer(canvasElement);
	await expectDenied(await findInDrawer('member-reset-link-btn'));
};

export const expectInviteLinkDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMemberDrawer(canvasElement, /podrick payne/i);
	await expectDenied(await findInDrawer('member-reset-link-btn'));
};

export const expectPasswordListDenied = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openMemberDrawer(canvasElement, /podrick payne/i);
	const button = await findInDrawer('member-reset-link-btn');
	await waitFor(
		() =>
			expect(button.getAttribute('data-denied-permissions')).toContain(
				'list||__||factor-password',
			),
		untilLoaded,
	);
	await expectDenied(button);
};

export const expectInviteOpen = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectDenied(
		await findInCanvas(canvasElement, 'invite-member-btn'),
		false,
	);
};
