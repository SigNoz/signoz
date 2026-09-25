import {
	createMemoryHistory,
	LocationDescriptor,
	MemoryHistory,
	parsePath,
} from 'history';

/**
 * Query keys the Storybook preview owns. They live in the iframe's URL, which
 * the app has no business reading or rewriting.
 */
const PREVIEW_PARAMS = [
	'id',
	'viewMode',
	'args',
	'globals',
	'path',
	'singleStory',
];

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

const withoutPreviewParams = (search: string): URLSearchParams => {
	const params = new URLSearchParams(search);
	PREVIEW_PARAMS.forEach((param) => params.delete(param));
	return params;
};

/**
 * Copies the story's search onto the iframe's URL, keeping the preview's own
 * params. A lot of the app reads `window.location.search` directly rather than
 * through the router, which is how every writer that rebuilds a target on top
 * of the current params reads them. In a story that read would otherwise answer
 * with the preview's query and nothing the page put there, so two writers
 * publish over each other forever: the query builder drops the time range, the
 * time range drops the query builder, and the page never settles.
 */
const mirrorSearchToBrowser = (): void => {
	const mirrored = new URLSearchParams();

	const previewParams = new URLSearchParams(window.location.search);
	PREVIEW_PARAMS.forEach((param) => {
		const value = previewParams.get(param);
		if (value !== null) {
			mirrored.set(param, value);
		}
	});

	withoutPreviewParams(storyHistory.location.search).forEach((value, key) => {
		mirrored.set(key, value);
	});

	window.history.replaceState(
		window.history.state,
		'',
		`${window.location.pathname}?${mirrored}${window.location.hash}`,
	);
};

storyHistory.listen(mirrorSearchToBrowser);

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

	// The preview's params ride along in whatever the app read out of
	// `window.location.search`, so they are dropped on the way back in and the
	// story's history stays the page's own URL.
	storyHistory[replace ? 'replace' : 'push']({
		...target,
		search: `?${withoutPreviewParams(target.search ?? '')}`,
		pathname: storyHistory.location.pathname,
	});

	return true;
};

/** Places the story at a route without going through the block. */
export const setStoryLocation = (to: LocationDescriptor): void => {
	storyHistory.replace(to);
	mirrorSearchToBrowser();
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
