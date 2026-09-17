import type { RequestHandler } from 'msw';

/**
 * Handlers may be grouped under names, so unrelated overrides in the same story
 * stay readable.
 */
export type StoryMswParameter =
	| RequestHandler[]
	| {
			handlers?: RequestHandler[] | Record<string, RequestHandler[] | undefined>;
	  };

export const collectStoryHandlers = (
	msw: StoryMswParameter | undefined,
): RequestHandler[] => {
	if (!msw) {
		return [];
	}

	if (Array.isArray(msw)) {
		return msw;
	}

	const { handlers } = msw;

	if (!handlers) {
		return [];
	}

	return Array.isArray(handlers)
		? handlers
		: Object.values(handlers)
				.filter((group): group is RequestHandler[] => Boolean(group))
				.flat();
};
