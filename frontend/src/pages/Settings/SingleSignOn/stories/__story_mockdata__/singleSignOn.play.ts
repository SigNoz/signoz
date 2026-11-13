/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import type { singleSignOnMocks } from '../SingleSignOn.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof singleSignOnMocks>;
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
}: PlayContext): Promise<void> => {
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
}: PlayContext): Promise<void> => {
	await clickFirst(canvasElement, 'auth-domain-configure');
	await userEvent.click(
		await screen.findByTestId('role-mapping-header', undefined, untilLoaded),
	);
	await screen.findByText(/group to role mappings/i, undefined, untilLoaded);
};

export const expandAttributeMapping = async (
	context: PlayContext,
): Promise<void> => {
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
}: PlayContext): Promise<void> => {
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
	const input = await within(canvasElement).findByLabelText(
		/display name/i,
		undefined,
		untilLoaded,
	);

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
	await clickFirst(canvasElement, 'auth-domain-delete');
	await userEvent.click(
		await screen.findByTestId(
			'auth-domain-delete-confirm',
			undefined,
			untilLoaded,
		),
	);
	if (args.domainDelete === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/domain deleted successfully/i)).toBeVisible(),
		);
	}
};
