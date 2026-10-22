import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import ErrorBoundaryFallback from '../ErrorBoundaryFallback';
import { errorBoundaryFallbackMocks } from './ErrorBoundaryFallback.stories.mocks';

type ErrorBoundaryFallbackArgs = PageStoryArgs<
	typeof errorBoundaryFallbackMocks
>;

const pageStory = storyMocks(errorBoundaryFallbackMocks, { layout: 'app' });

/**
 * What a render error leaves on screen: the error boundary's own page, with
 * nothing fetching behind it.
 *
 * Route: `/something-went-wrong`.
 */
const meta = {
	title: 'Pages/System/Error Fallback',
	component: ErrorBoundaryFallback,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ErrorBoundaryFallbackArgs>;

export default meta;

type Story = StoryObj<ErrorBoundaryFallbackArgs>;

/** What a page that threw is replaced with, anywhere in the app. */
export const Default: Story = {};

/** The self-hosted spelling, where support is the community rather than chat. */
export const SelfHosted: Story = {
	args: { license: 'enterprise' },
};
