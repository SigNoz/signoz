import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type { GlobalMockArgs } from '@/storybook/globals';

import ChangelogModal from '../ChangelogModal';
import { changelog } from './__story_mockdata__/changelog';

type ChangelogModalArgs = ComponentProps<typeof ChangelogModal> &
	GlobalMockArgs;

const meta = {
	title: 'Components/Changelog Modal',
	component: ChangelogModal,
	args: { changelog, onClose: fn() },
} satisfies Meta<ChangelogModalArgs>;

export default meta;

type Story = StoryObj<ChangelogModalArgs>;

/** A cloud workspace: no upgrade actions, since cloud updates itself. */
export const Default: Story = {};

/** A self-hosted workspace, offered Skip for now and Update my workspace. */
export const SelfHosted: Story = {
	args: { license: 'enterprise' },
};
