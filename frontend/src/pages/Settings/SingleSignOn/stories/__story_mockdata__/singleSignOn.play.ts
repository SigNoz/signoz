/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { expectDenied } from './singleSignOnAuthz';
import {
	canDeleteDomain,
	canEditDisplayName,
	canReadDisplayName,
	canListDomains,
	listsDomains,
	type SingleSignOnArgs,
} from '../SingleSignOn.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: SingleSignOnArgs;
}

/** The table fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** Row actions repeat per domain, so a story that opens one takes the first. */
const clickFirst = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	const [action] = await within(canvasElement).findAllByTestId(
		testId,
		undefined,
		untilLoaded,
	);

	await userEvent.click(action);
};

/** Google maps no IdP attributes, so only SAML and OIDC have this section. */
const MAPPING_SECTION = {
	saml: { header: /attribute mapping \(advanced\)/i, field: 'email-attribute' },
	oidc: { header: /claim mapping \(advanced\)/i, field: 'email-claim' },
	google: null,
} as const;

export const openConfigureDomain = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsDomains(args)) {
		return;
	}
	await clickFirst(canvasElement, 'auth-domain-configure');
	await screen.findByText(/role mapping \(advanced\)/i, undefined, untilLoaded);
};

export const openAddDomain = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'auth-domain-add',
			undefined,
			untilLoaded,
		),
	);
};

export const openProviderSelector = async (
	context: PlayContext,
): Promise<void> => {
	await openAddDomain(context);
	await screen.findByText(
		/configure authentication method/i,
		undefined,
		untilLoaded,
	);
};

export const expandRoleMappings = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsDomains(args)) {
		return;
	}
	await clickFirst(canvasElement, 'auth-domain-configure');
	await userEvent.click(
		await screen.findByTestId('role-mapping-header', undefined, untilLoaded),
	);
	await screen.findByText(/group to role mappings/i, undefined, untilLoaded);
};

export const expandAttributeMapping = async (
	context: PlayContext,
): Promise<void> => {
	if (!listsDomains(context.args)) {
		return;
	}
	await openConfigureDomain(context);
	const section = MAPPING_SECTION[context.args.provider];
	if (!section) {
		return;
	}

	await userEvent.click(screen.getByText(section.header));
	await waitFor(() =>
		expect(document.getElementById(section.field)).toBeVisible(),
	);
};

export const expandWorkspaceGroups = async (
	context: PlayContext,
): Promise<void> => {
	if (!listsDomains(context.args)) {
		return;
	}
	await openConfigureDomain(context);
	if (context.args.provider !== 'google') {
		return;
	}

	await userEvent.click(
		screen.getByTestId('google-auth-workspace-groups-header'),
	);
	await waitFor(() =>
		expect(screen.getByTestId('google-auth-allowed-groups')).toBeVisible(),
	);
};

export const submitEmptyProvider = async (
	context: PlayContext,
): Promise<void> => {
	await openAddDomain(context);
	await userEvent.click(
		await screen.findByTestId(
			'authn-provider-configure-google',
			undefined,
			untilLoaded,
		),
	);
	await userEvent.click(
		await screen.findByTestId('auth-domain-save', undefined, untilLoaded),
	);
	await screen.findByText(/domain is required/i, undefined, untilLoaded);
};

export const openDeleteDomain = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsDomains(args)) {
		return;
	}
	await clickFirst(canvasElement, 'auth-domain-delete');
	await screen.findByTestId(
		'auth-domain-delete-confirm',
		undefined,
		untilLoaded,
	);
};

export const updateDisplayName = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canEditDisplayName(args)) {
		return;
	}
	const input = await within(canvasElement).findByTestId(
		'org-display-name-input-field',
		undefined,
		untilLoaded,
	);
	await waitFor(() => expect(input).toBeEnabled(), untilLoaded);

	await userEvent.clear(input);
	await userEvent.type(input, 'Night Watch');
	await userEvent.click(
		await within(canvasElement).findByRole('button', { name: /^submit$/i }),
	);
	if (args.displayNameUpdate === 'success') {
		await waitFor(() => expect(screen.getByText(/^success$/i)).toBeVisible());
	}
};

export const deleteDomain = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsDomains(args)) {
		return;
	}
	await clickFirst(canvasElement, 'auth-domain-delete');
	const confirm = await screen.findByTestId(
		'auth-domain-delete-confirm',
		undefined,
		untilLoaded,
	);
	await expectDenied(confirm, !canDeleteDomain(args));
	if (!canDeleteDomain(args)) {
		return;
	}
	await userEvent.click(confirm);
	if (args.domainDelete === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/domain deleted successfully/i)).toBeVisible(),
		);
	}
};

const waitForSaveOutcome = async (
	outcome: SingleSignOnArgs['domainSave'],
	successToast: RegExp,
): Promise<void> => {
	if (outcome === 'error') {
		await screen.findAllByText(/the request failed/i, undefined, untilLoaded);
	}
	if (outcome === 'success') {
		await waitFor(() => expect(screen.getByText(successToast)).toBeVisible(), {
			timeout: 15_000,
		});
	}
};

export const createDomain = async (context: PlayContext): Promise<void> => {
	await openAddDomain(context);
	await userEvent.click(
		await screen.findByTestId(
			'authn-provider-configure-google',
			undefined,
			untilLoaded,
		),
	);
	await userEvent.type(
		await screen.findByLabelText(/^domain/i, undefined, untilLoaded),
		'acme.io',
	);
	await userEvent.type(screen.getByLabelText(/client id/i), 'client-id');
	await userEvent.type(screen.getByLabelText(/client secret/i), 'secret');
	await userEvent.click(screen.getByTestId('auth-domain-save'));
	await waitForSaveOutcome(
		context.args.domainSave,
		/domain created successfully/i,
	);
};

export const saveConfiguredDomain = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsDomains(args)) {
		return;
	}
	await clickFirst(canvasElement, 'auth-domain-configure');
	await userEvent.click(
		await screen.findByTestId('auth-domain-save', undefined, untilLoaded),
	);
	await waitForSaveOutcome(args.domainSave, /domain updated successfully/i);
};

export const toggleEnforcement = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsDomains(args)) {
		return;
	}
	await clickFirst(canvasElement, 'auth-domain-enforce-sso');
	if (args.domainSave === 'error') {
		await screen.findAllByText(/the request failed/i, undefined, untilLoaded);
	}
};

export const expectViewerAccess = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.authzState !== 'loaded') {
		return;
	}
	if (!canListDomains(args)) {
		await within(canvasElement).findAllByText(
			/is not authorized/i,
			undefined,
			untilLoaded,
		);
	}
	if (!canReadDisplayName(args)) {
		await waitFor(
			() =>
				expect(
					within(canvasElement).queryByTestId('org-display-name-input-field'),
				).toBeNull(),
			untilLoaded,
		);
		return;
	}
	const input = await within(canvasElement).findByTestId(
		'org-display-name-input-field',
		undefined,
		untilLoaded,
	);
	await waitFor(
		() =>
			canEditDisplayName(args)
				? expect(input).toBeEnabled()
				: expect(input).toBeDisabled(),
		untilLoaded,
	);
};
