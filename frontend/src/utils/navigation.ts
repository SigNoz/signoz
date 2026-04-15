import history from 'lib/history';

/**
 * Opens an internal SigNoz path in a new tab.
 * Automatically prepends the runtime base path via history.createHref so
 * sub-path deployments (e.g. /signoz/) work correctly.
 *
 * For external URLs (http/https), use openExternalLink() instead.
 */
export const openInNewTab = (path: string): void => {
	if (path.startsWith('http') || path.startsWith('//')) {
		window.open(path, '_blank');
		return;
	}
	// Parse the path so query params and hash are passed to createHref
	// separately — passing a full URL string as `pathname` embeds the search
	// string inside the path segment, which is incorrect.
	const parsed = new URL(path, window.location.origin);
	window.open(
		history.createHref({
			pathname: parsed.pathname,
			search: parsed.search,
			hash: parsed.hash,
		}),
		'_blank',
	);
};

/**
 * Opens an external URL in a new tab with noopener,noreferrer.
 * Use this for links to external sites (docs, Slack, marketing pages).
 *
 * For internal SigNoz routes, use openInNewTab() instead.
 */
export const openExternalLink = (url: string): void => {
	window.open(url, '_blank', 'noopener,noreferrer');
};
