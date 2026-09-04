import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import LogsSettings from './index';
import { logsSettingsMocks } from './LogsSettings.stories.mocks';

type LogsSettingsArgs = PageStoryArgs<typeof logsSettingsMocks>;

const pageStory = storyMocks(logsSettingsMocks);

/**
 * The logs settings page, which opens on its index fields tab.
 *
 * Route: `/logs-explorer/index-fields`.
 */
const meta = {
	title: 'Pages/Logs/Settings',
	component: LogsSettings,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LogsSettingsArgs>;

export default meta;

type Story = StoryObj<LogsSettingsArgs>;

/**
 * The index-fields tab, which is where the logs settings page opens and the
 * only tab it has. The tab body is still a placeholder in the app.
 */
export const Default: Story = {};
