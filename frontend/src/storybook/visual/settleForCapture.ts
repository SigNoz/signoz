const STILL_CLASS = 'sb-still';

interface CaptureHooks {
	__signozSnapPinnedScrollers?: () => void;
}

/**
 * A list that keeps itself pinned to the bottom (the Noz thread, every virtuoso
 * list) settles a few pixels short of it, and where it stops depends on the
 * order its items were measured in. Anything already within a row of its end is
 * snapped onto it; a list parked anywhere else is left where the story put it.
 */
const snapPinnedScrollers = (): void => {
	document.querySelectorAll('*').forEach((element) => {
		const slack = element.scrollHeight - element.clientHeight - element.scrollTop;
		if (element.scrollTop > 0 && slack > 0 && slack <= 64) {
			element.scrollTop = element.scrollHeight;
		}
	});
};

/**
 * Runs after the story's `play`, which is where both capture stacks take the
 * picture: Chromatic snapshots there, and `scripts/story-shots.mjs` waits for
 * the same render phase. Only what Chromatic cannot do for itself lives here -
 * it already pauses animations, videos and GIFs, and waits for the network to
 * go quiet.
 */
export const settleForCapture = ({
	globals,
}: {
	globals: Record<string, unknown>;
}): void => {
	document.documentElement.classList.toggle(
		STILL_CLASS,
		globals.motion !== 'live',
	);

	snapPinnedScrollers();

	// The local harness runs this again once the page has gone quiet: a virtuoso
	// list is often still measuring when `afterEach` fires, and there is no event
	// that says it stopped.
	(window as unknown as CaptureHooks).__signozSnapPinnedScrollers =
		snapPinnedScrollers;
};
