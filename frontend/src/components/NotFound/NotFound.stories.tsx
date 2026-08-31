import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import NotFound from './index';
import { notFoundMocks } from './NotFound.stories.mocks';

type NotFoundArgs = PageStoryArgs<typeof notFoundMocks>;

/**
 * The catch-all route mounts it with no props, and its `defaultProps` is what
 * keeps the component itself from typing as one that takes the story's args.
 */
function CatchAllPage(): JSX.Element {
	return <NotFound />;
}

const pageStory = storyMocks(notFoundMocks);

/**
 * The shell around a pathname no route matched: the side nav stays, the content
 * area carries the 404.
 *
 * Route: any unmatched path.
 */
const meta = {
	title: 'Pages/System/Not Found',
	component: CatchAllPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<NotFoundArgs>;

export default meta;

type Story = StoryObj<NotFoundArgs>;

/**
 * What the app shows for a pathname no route matched, inside the shell: the
 * side nav is still there, and the way back is the home button.
 */
export const Default: Story = {};
