import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { singleSignOnMocks } from './SingleSignOn.stories.mocks';

import SettingsPage from '../../Settings';

type SingleSignOnArgs = PageStoryArgs<typeof singleSignOnMocks>;

const pageStory = storyMocks(singleSignOnMocks, { layout: 'app' });

/**
 * SAML and OIDC domains for the org, whether SSO is enforced, and the role a new
 * user lands on.
 *
 * Route: `/settings/org-settings`.
 */
const meta = {
	title: 'Pages/Settings/Single Sign-on',
	tags: ['play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<SingleSignOnArgs>;

export default meta;

type Story = StoryObj<SingleSignOnArgs>;

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

/**
 * The org's display name and the email domains that sign in through an identity
 * provider, with whether each one is allowed to fall back to a password.
 */
export const Default: Story = {};

/** An org that has not connected an identity provider yet. */
export const NoDomains: Story = {
	args: { domains: 0 },
};

/** Provider: Google-specific configuration renders the provider's supported row. */
export const GoogleProvider: Story = {
	args: { provider: 'google' },
};

/** Provider: OIDC configuration exposes its issuer-based provider branch. */
export const OidcProvider: Story = {
	args: { provider: 'oidc' },
};

/** Policy: domains that allow password fallback show enforcement switched off. */
export const SsoNotEnforced: Story = {
	args: { enforced: false },
};

/** The form behind a domain's provider: what SigNoz sends the IdP and reads back. */
export const ConfigureDomain: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickFirst(canvasElement, 'auth-domain-configure');
		await screen.findByText(/attribute mapping/i, undefined, untilLoaded);
	},
};

/** Adding a domain: the provider chosen first decides the rest of the form. */
export const AddDomain: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'auth-domain-add',
				undefined,
				untilLoaded,
			),
		);
	},
};

/** Interaction: adding a domain opens the real provider selector. */
export const ProviderSelectorOpen: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'auth-domain-add',
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(
			/configure authentication method/i,
			undefined,
			untilLoaded,
		);
	},
};

/** Interaction: advanced role mappings expand from a configured identity provider. */
export const RoleMappingsExpanded: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickFirst(canvasElement, 'auth-domain-configure');
		await userEvent.click(
			await screen.findByTestId('role-mapping-header', undefined, untilLoaded),
		);
		await screen.findByText(/group to role mappings/i, undefined, untilLoaded);
	},
};

/** Validation: submitting a new provider without required fields leaves form errors visible. */
export const CreateDomainValidation: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'auth-domain-add',
				undefined,
				untilLoaded,
			),
		);
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
	},
};

/** What removing a domain warns about before its members lose SSO. */
export const DeleteDomain: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickFirst(canvasElement, 'auth-domain-delete');
		await screen.findByTestId(
			'auth-domain-delete-confirm',
			undefined,
			untilLoaded,
		);
	},
};

/**
 * The org's display name saved: the toast confirming it. Set Display name
 * update to `error` or `loading` to see the modal instead.
 */
export const DisplayNameUpdatedToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
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
	},
};

/**
 * A domain removed: the toast confirming it. Set Domain delete to `error` or
 * `loading` to see the modal instead.
 */
export const DomainDeletedToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
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
	},
};
