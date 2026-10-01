import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

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
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'custom-domain-menu-trigger',
				{},
				{ timeout: 10000 },
			),
		);
		await screen.findByRole('menu');
	},
};
