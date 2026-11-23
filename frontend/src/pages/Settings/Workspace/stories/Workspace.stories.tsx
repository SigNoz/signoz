import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	copyLicenseKey,
	openAddCreditCardFromConflict,
	openCustomDomainMenu,
	updateCustomDomain,
} from './__story_mockdata__/workspace.play';
import { workspaceMocks } from './Workspace.stories.mocks';

import SettingsPage from '../../Settings';

type WorkspaceArgs = PageStoryArgs<typeof workspaceMocks>;

const pageStory = storyMocks(workspaceMocks, { layout: 'app' });

/**
 * Retention per signal, cold storage, and the workspace's own URL.
 *
 * Route: `/settings`.
 */
const meta = {
	title: 'Pages/Settings/Workspace',
	tags: ['play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<WorkspaceArgs>;

export default meta;

type Story = StoryObj<WorkspaceArgs>;

/**
 * The workspace tab on cloud: the URL the workspace answers on, the license key,
 * and how long each signal is kept before it is dropped.
 */
export const Default: Story = {};

/**
 * The same tab on a self-hosted instance, where retention is the org's to change:
 * every signal gets a save button and a status row under it.
 */
export const SelfHosted: Story = {
	args: { license: 'enterprise', retentionStatus: 'success' },
};

/**
 * A retention change the instance has accepted but not finished applying, which
 * keeps the save button down until it lands.
 */
export const RetentionPending: Story = {
	args: { license: 'enterprise', retentionStatus: 'pending' },
};

/** An instance with no object storage attached: nothing can be moved to S3. */
export const NoColdStorage: Story = {
	args: { license: 'enterprise', coldStorage: false },
};

/**
 * The workspace URL menu, open: the hosts the workspace answers on, and which
 * of them is the active one.
 */
export const CustomDomainMenu: Story = {
	play: openCustomDomainMenu,
};

/**
 * "Edit workspace link" applied: the toast announcing the new URL, raised once
 * the PUT answers. Set Domain update to `error` or `loading` to see the modal
 * instead.
 */
export const CustomDomainUpdatedToast: Story = {
	play: updateCustomDomain,
};

/**
 * A workspace link change the instance refuses with a 409: the edit modal swaps
 * Apply Changes for Contact Support, which on a cloud trial without a card opens
 * the Add Credit Card modal.
 */
export const CustomDomainConflictAddCard: Story = {
	args: { domainUpdate: 'error', support: 'add-card' },
	parameters: { allowConsoleErrors: true },
	play: openAddCreditCardFromConflict,
};

/** The license key copied: the toast confirming it. */
export const LicenseKeyCopiedToast: Story = {
	play: copyLicenseKey,
};
