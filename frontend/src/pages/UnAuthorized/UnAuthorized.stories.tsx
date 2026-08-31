import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import UnAuthorized from './index';
import { unAuthorizedMocks } from './UnAuthorized.stories.mocks';

type UnAuthorizedArgs = PageStoryArgs<typeof unAuthorizedMocks>;

const pageStory = storyMocks(unAuthorizedMocks);

/**
 * What a route the user's role cannot open shows.
 *
 * Route: `/un-authorized`.
 */
const meta = {
	title: 'Pages/System/Unauthorized',
	component: UnAuthorized,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<UnAuthorizedArgs>;

export default meta;

type Story = StoryObj<UnAuthorizedArgs>;

/** Where a route guard sends someone whose grant does not cover the page. */
export const Default: Story = {
	args: { access: 'viewer' },
};

/**
 * The same wall with no role derived at all, which is what a grant covering
 * nothing yields: the page offers support instead of an administrator.
 */
export const Anonymous: Story = {
	args: { access: 'deny-all' },
};
