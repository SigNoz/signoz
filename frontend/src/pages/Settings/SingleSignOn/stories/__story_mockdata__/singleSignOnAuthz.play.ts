/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, within } from 'storybook/test';

import { expectDenied } from './singleSignOnAuthz';
import {
	canDeleteDomain,
	canEditDisplayName,
	canListDomains,
	canReadDisplayName,
	listsDomains,
	type SingleSignOnArgs,
} from '../SingleSignOn.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: SingleSignOnArgs;
}

const untilLoaded = { timeout: 15_000 };

export const expectListDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (canListDomains(args) || args.authzState !== 'loaded') {
		return;
	}
	await within(canvasElement).findByText(
		/is not authorized/i,
		undefined,
		untilLoaded,
	);
};

export const expectDeleteDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsDomains(args)) {
		return;
	}
	const [remove] = await within(canvasElement).findAllByTestId(
		'auth-domain-delete',
		undefined,
		untilLoaded,
	);
	await userEvent.click(remove);
	const confirm = await screen.findByTestId(
		'auth-domain-delete-confirm',
		undefined,
		untilLoaded,
	);
	await expectDenied(confirm, !canDeleteDomain(args));
};

export const expectDisplayNameDenied = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.authzState !== 'loaded') {
		return;
	}
	if (!canReadDisplayName(args)) {
		await within(canvasElement).findByText(
			/read:organization/i,
			undefined,
			untilLoaded,
		);
		await expect(
			within(canvasElement).queryByTestId('org-display-name-input-field'),
		).toBeNull();
		return;
	}
	const denied = !canEditDisplayName(args);
	await expectDenied(
		await within(canvasElement).findByTestId(
			'org-display-name-input-field',
			undefined,
			untilLoaded,
		),
		denied,
	);
	if (!denied) {
		const input = await within(canvasElement).findByTestId(
			'org-display-name-input-field',
			undefined,
			untilLoaded,
		);
		await userEvent.type(input, ' edited');
	}
	await expectDenied(
		await within(canvasElement).findByTestId(
			'org-display-name-submit',
			undefined,
			untilLoaded,
		),
		denied,
	);
};
