import type { Decorator } from '@storybook/react-vite';

import StorybookProviders from '../providers/StorybookProviders';
import {
	resolveStory,
	type StoryRuntimeContext,
} from '../runtime/resolveStory';

/**
 * Global decorator: every story renders inside the mocked provider tree the
 * story runtime resolved. Everything the tree needs in place first (handlers,
 * module-level state, theme) is applied by the preview loader, which runs
 * ahead of this.
 */
export const withProviders: Decorator = (Story, context) => {
	const world = resolveStory(context as unknown as StoryRuntimeContext);

	return (
		<StorybookProviders key={world.key} {...world.config}>
			<Story />
		</StorybookProviders>
	);
};
