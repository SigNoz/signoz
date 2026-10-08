import { toggleControl } from '../controls/controls';
import { defineStoryMocks } from '../controls/defineStoryMocks';
import type { StoryMockArgs } from '../controls/types';
import { persistToasts } from '../mocks/toastsPersisted';

const TOASTS = 'Toasts';

/**
 * Keeps every toast the story fires on screen, so a toast is one screenshot
 * rather than a race against sonner's 4s timer. `mocks/sonner.mock.tsx` is what
 * reads it.
 */
export const toastMocks = defineStoryMocks({
	controls: {
		toastsPersist: toggleControl('Keep toasts on screen', {
			group: TOASTS,
			description:
				'Stops toasts from dismissing themselves. A toast that sets its own `duration` is left alone. Toasts behind a click or an async action are not fired until something reaches them, so those still need a `play`.',
			value: true,
		}),
	},
	effect: ({ toastsPersist }) => persistToasts(toastsPersist),
});

export type ToastArgs = StoryMockArgs<typeof toastMocks>;
