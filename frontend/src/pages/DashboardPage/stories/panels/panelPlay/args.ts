import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import type { panelsMocks } from '../Panels.stories.mocks';

/** The dashboard document loads before the panel queries, then the chart sizes itself. */
export const PANEL_LOAD = { timeout: 15000 };

export type PanelPlayArgs = PageStoryArgs<typeof panelsMocks>;

/** Whether a queried panel was answered with something to draw. */
export const hasData = (args: PanelPlayArgs): boolean => {
	if (args.dataState !== 'loaded' || args.result === 'empty') {
		return false;
	}
	if (args.kind === 'List') {
		return args.listRows > 0;
	}

	return args.kind === 'Number' || args.series > 0;
};
