import { toggleControl } from '../controls/controls';
import { defineStoryMocks } from '../controls/defineStoryMocks';
import { holdTooltipsOpen } from '../mocks/tooltipsHeldOpen';

const TOOLTIPS = 'Tooltips';

/**
 * Holds every tooltip the story renders open, so a page's tooltips are one
 * screenshot rather than one hover each. Hovering opens one at a time;
 * `mocks/tooltip.mock.tsx` holds each popup open with `ForceOpenProvider`.
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
