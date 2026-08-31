import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { errorDetailsMocks } from './ErrorDetails.stories.mocks';
import ErrorDetails from './index';

type ErrorDetailsArgs = PageStoryArgs<typeof errorDetailsMocks>;

const pageStory = storyMocks(errorDetailsMocks);

/**
 * One exception: its stack trace rendered for the language it came from, the span
 * it belongs to, and the occurrence before and after it.
 *
 * Route: `/error-detail?...`.
 */
const meta = {
	title: 'Pages/Exceptions/Detail',
	component: ErrorDetails,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ErrorDetailsArgs>;

export default meta;

type Story = StoryObj<ErrorDetailsArgs>;

/**
 * One exception event as the list opens it: the type and message it was grouped
 * under, when it was seen, its stack trace, and the span and trace it came from.
 * Older and Newer walk the group's other events in place.
 */
export const Default: Story = {};

/**
 * A link to an event the backend no longer has, which is what a bookmarked
 * exception past its retention window opens.
 */
export const EventMissing: Story = {
	args: { found: false },
};

/** The page mid-fetch, shell included. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/**
 * The page without a timestamp to look the event up by, which is the link the
 * page refuses and sends back to the exceptions list.
 */
export const IncompleteLink: Story = {
	args: { params: 'no-timestamp' },
};
