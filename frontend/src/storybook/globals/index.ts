import { composeStoryMocks } from '../controls/composeStoryMocks';
import { appShellMocks } from './appShellMocks';
import { authzMocks } from './authzMocks';
import { nozMocks } from './nozMocks';
import { tooltipMocks } from './tooltipMocks';

/**
 * The mock modules every story carries, page or component, declared at project
 * level in `.storybook/preview.tsx`. Adding one here publishes its controls and
 * widens `PageStoryArgs` in the same edit.
 */
export const globalMocks = composeStoryMocks(
	authzMocks,
	appShellMocks,
	nozMocks,
	tooltipMocks,
);

export type GlobalMockArgs = typeof globalMocks.args;
