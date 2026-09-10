import {
	createMemoryHistory,
	LocationDescriptor,
	MemoryHistory,
	parsePath,
} from 'history';

/**
 * The story's own history. A story renders one page, so this never leaves it:
 * `pageScope` decides what counts as staying, and `containment.ts` is what the
 * app sees in place of `lib/history`.
 */
export const storyHistory: MemoryHistory = createMemoryHistory({
	initialEntries: ['/'],
});

export const toHref = (to: LocationDescriptor): string =>
	typeof to === 'string' ? to : storyHistory.createHref(to);

/** `/home/` and `/home` are the same page as far as a story is concerned. */
const normalizePathname = (pathname: string): string =>
	pathname.length > 1 && pathname.endsWith('/')
		? pathname.slice(0, -1)
		: pathname;

export const isSamePagePathname = (pathname: string | undefined): boolean =>
	!pathname ||
	normalizePathname(pathname) ===
		normalizePathname(storyHistory.location.pathname);

/**
 * Applies a navigation that stays on the story's page: a query-param or hash
 * change, which is how tabs, filters and pagination are driven. Returns false
 * when the target is another page, leaving the caller to report it as blocked.
 */
export const navigateWithinPage = (
	to: LocationDescriptor,
	{ replace = false }: { replace?: boolean } = {},
): boolean => {
	const target = typeof to === 'string' ? parsePath(to) : to;

	if (!isSamePagePathname(target.pathname)) {
		return false;
	}

	storyHistory[replace ? 'replace' : 'push']({
		...target,
		pathname: storyHistory.location.pathname,
	});

	return true;
};

/** Places the story at a route without going through the block. */
export const setStoryLocation = (to: LocationDescriptor): void => {
	storyHistory.replace(to);
};

/**
 * An in-page anchor or a `javascript:` href is the browser's business, not the
 * story's: it is left alone rather than applied or reported.
 */
export const isBlockableHref = (href: string): boolean =>
	href.length > 0 && !href.startsWith('#') && !href.startsWith('javascript:');

/**
 * An anchor href as a location the story's history understands, or `undefined`
 * when it leads off the page. Relative hrefs (`?tab=logs`) carry no pathname and
 * stay on the page; app links do, and are resolved against the iframe so an
 * off-site href fails the host check before its path is compared.
 */
export const toStoryLocation = (
	href: string,
	base: string,
): string | undefined => {
	if (href.startsWith('?')) {
		return href;
	}

	const url = new URL(href, base);

	return url.host === new URL(base).host
		? `${url.pathname}${url.search}${url.hash}`
		: undefined;
};
