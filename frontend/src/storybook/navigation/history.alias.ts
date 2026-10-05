import {
	containedHistory,
	hasInAppHistory as containedHasInAppHistory,
} from './containment';

/**
 * Replaces `lib/history` in Storybook (aliased in `.storybook/main.ts`). The
 * containment rule lives in `containment.ts`; this file only has to keep the
 * module's shape, and the annotation is what checks it against the real one.
 * An export added to `lib/history` fails to compile here instead of failing at
 * render in whichever component imports it.
 */
const libHistory: typeof import('lib/history') = {
	default: containedHistory,
	hasInAppHistory: containedHasInAppHistory,
};

export default libHistory.default;

export const { hasInAppHistory } = libHistory;
