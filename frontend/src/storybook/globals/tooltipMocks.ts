import { toggleControl } from '../controls/controls';
import { defineStoryMocks } from '../controls/defineStoryMocks';
import type { StoryMockArgs } from '../controls/types';
import { holdTooltipsOpen } from '../mocks/tooltipsHeldOpen';

const TOOLTIPS = 'Tooltips';

/**
 * Holds every tooltip the story renders open, so a page's tooltips are one
 * screenshot rather than one hover each. Radix closes the open tooltip from a
 * `document` event when the next one opens, so hovering can never hold more
 * than one; a controlled `open` ignores that event, and `mocks/tooltip.mock.tsx`
 * is what passes it.
 */
export const tooltipMocks = defineStoryMocks({
	controls: {
		tooltipsOpen: toggleControl('Hold tooltips open', {
			group: TOOLTIPS,
			description:
				'Opens every tooltip on the page at once and keeps it open. A tooltip the page opens itself, and one with an empty title, are left alone. Tooltips behind a hover, a drawer or a modal are not rendered until something reaches them, so those still need a `play`.',
			value: false,
		}),
	},
	effect: ({ tooltipsOpen }) => holdTooltipsOpen(tooltipsOpen),
});

export type TooltipArgs = StoryMockArgs<typeof tooltipMocks>;
