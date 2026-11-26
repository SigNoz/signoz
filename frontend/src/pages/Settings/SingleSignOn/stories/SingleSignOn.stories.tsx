import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { singleSignOnMocks } from './SingleSignOn.stories.mocks';
import {
	createDomain,
	deleteDomain,
	expandAttributeMapping,
	expandRoleMappings,
	expectViewerAccess,
	openAddDomain,
	openConfigureDomain,
	openDeleteDomain,
	openProviderSelector,
	saveConfiguredDomain,
	submitEmptyProvider,
	toggleEnforcement,
	updateDisplayName,
} from './__story_mockdata__/singleSignOn.play';

import SettingsPage from '../../Settings';

type SingleSignOnArgs = PageStoryArgs<typeof singleSignOnMocks>;

const pageStory = storyMocks(singleSignOnMocks, { layout: 'app' });

/**
 * SAML and OIDC domains for the org, whether SSO is enforced, and the role a new
 * user lands on. Gated on authz permissions: the domain list, delete and the
 * display name; saving a domain is checked by the backend.
 *
 * Route: `/settings/org-settings`.
 */
const meta = {
	title: 'Pages/Settings/Single Sign-on/Overview',
	tags: ['authz', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<SingleSignOnArgs>;

export default meta;

type Story = StoryObj<SingleSignOnArgs>;

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
	play: openConfigureDomain,
};

/** Adding a domain: the provider chosen first decides the rest of the form. */
export const AddDomain: Story = {
	play: openAddDomain,
};

/** Interaction: adding a domain opens the real provider selector. */
export const ProviderSelectorOpen: Story = {
	play: openProviderSelector,
};

/** Interaction: advanced role mappings expand from a configured identity provider. */
export const RoleMappingsExpanded: Story = {
	play: expandRoleMappings,
};

/**
 * Interaction: the SAML attribute mapping open on a configured domain. Set
 * Identity provider to `oidc` for its claim mapping; Google has neither.
 */
export const AttributeMappingExpanded: Story = {
	play: expandAttributeMapping,
};

/** Interaction: the OIDC claim mapping open on a configured domain. */
export const ClaimMappingExpanded: Story = {
	args: { provider: 'oidc' },
	play: expandAttributeMapping,
};

/** Validation: submitting a new provider without required fields leaves form errors visible. */
export const CreateDomainValidation: Story = {
	play: submitEmptyProvider,
};

/** What removing a domain warns about before its members lose SSO. */
export const DeleteDomain: Story = {
	play: openDeleteDomain,
};

/**
 * The org's display name saved: the toast confirming it. Set Display name
 * update to `error` or `loading` to see the modal instead.
 */
export const DisplayNameUpdatedToast: Story = {
	play: updateDisplayName,
};

/**
 * A domain removed: the toast confirming it. Set Domain delete to `error` or
 * `loading` to see the modal instead.
 */
export const DomainDeletedToast: Story = {
	play: deleteDomain,
};

/**
 * A viewer: the tab is listed for every role, but the domain list is denied and
 * the display name is locked.
 */
export const Viewer: Story = {
	args: { access: 'viewer' },
	play: expectViewerAccess,
};

/**
 * Adding a domain whose save the backend rejects: the error modal opens and the
 * filled form stays. Set Domain save to `success` for the created toast.
 */
export const DomainCreateFailed: Story = {
	args: { domainSave: 'error' },
	// The deliberate 500 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: createDomain,
};

/**
 * Saving a configured domain the backend rejects: the error modal opens over the
 * form. Set Domain save to `success` for the updated toast.
 */
export const DomainUpdateFailed: Story = {
	args: { domainSave: 'error' },
	// The deliberate 500 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: saveConfiguredDomain,
};

/**
 * The enforce SSO switch flipped on a domain the backend rejects: the error modal
 * opens and the switch returns to where it was.
 */
export const EnforceSsoFailed: Story = {
	args: { domainSave: 'error' },
	// The deliberate 500 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: toggleEnforcement,
};
