import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { shortcutsMocks } from './Shortcuts.stories.mocks';

import SettingsPage from '../Settings';

type ShortcutsArgs = PageStoryArgs<typeof shortcutsMocks>;

const pageStory = storyMocks(shortcutsMocks);

/**
 * The shortcut reference. Static: nothing fetches.
 *
 * Route: `/settings/shortcuts`.
 */
const meta = {
	title: 'Pages/Settings/Keyboard Shortcuts',
	component: SettingsPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ShortcutsArgs>;

export default meta;

type Story = StoryObj<ShortcutsArgs>;

/** Every key binding the console listens for, grouped by the page it works on. */
export const Default: Story = {};
