import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { mcpServerMocks } from './McpServer.stories.mocks';

import SettingsPage from '../../Settings';

type McpServerArgs = PageStoryArgs<typeof mcpServerMocks>;

const pageStory = storyMocks(mcpServerMocks, { layout: 'app' });

/**
 * The workspace's MCP server: the connection details, and the toggle that enables
 * it.
 *
 * Route: `/settings/mcp-server`.
 */
const meta = {
	title: 'Pages/Settings/MCP Server',
	tags: ['role-gated', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<McpServerArgs>;

export default meta;

type Story = StoryObj<McpServerArgs>;

/** The config fetches before the snippets render, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * How an AI client is pointed at this workspace: the snippet to paste, the
 * instance URL it authorises against, and where the key comes from.
 */
export const Default: Story = {};

/** The same tab where MCP is not served, which sends the reader to the docs. */
export const NoMcpEndpoint: Story = {
	args: { mcpEnabled: false },
};

/** The snippet for a different client, which is the whole of what the tab swaps. */
export const ClaudeCode: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/claude code/i,
				undefined,
				untilLoaded,
			),
		);
		await within(canvasElement).findByText(
			/^claude mcp add/,
			undefined,
			untilLoaded,
		);
	},
};

/**
 * A member who is not an admin, who can read the setup but cannot issue the
 * service account the client authenticates with.
 */
export const NonAdmin: Story = {
	args: { access: 'editor' },
};

/**
 * The copy buttons the tab carries, held open: the one on the client config
 * snippet and the one beside the instance URL, both saying what they copy.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
};
