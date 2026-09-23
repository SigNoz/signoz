import {
	type BrowserHistory,
	createBrowserHistory,
	createPath,
	type Path,
	type To,
} from 'history';
import type { HistoryRouterProps } from 'react-router';

// No `basename` here: history@5 dropped the option, so the base path lives on
// the router (`AppRoutes/index.tsx`) for component navigation and on
// `lib/router/navigation` for module-level navigation.
const browserHistory = createBrowserHistory();

function createURL(to: To): URL {
	// window.location.origin is the literal string "null" in Firefox when the
	// page is served from a local file.
	// The raw origin, not getBaseUrl(): `to` already carries the base path when
	// it has one, and this URL is only ever read back for its encoding.
	// oxlint-disable-next-line signoz/no-raw-absolute-path
	const origin = window.location.origin;
	const base = origin !== 'null' ? origin : window.location.href;
	const href = typeof to === 'string' ? to : createPath(to);
	// A trailing space would be stripped by the URL parser, and it may be part
	// of the path.
	return new URL(href.replace(/ $/, '%20'), base);
}

/**
 * v6 navigates through whatever history it is handed, and expects two members
 * history@5 does not ship — `@remix-run/router` grew its own fork for them.
 * We stay on history@5 because that fork dropped `block()`, which the
 * unsaved-changes blocker still needs, so the two are added back here with the
 * same implementations react-router would have used.
 */
// The cast covers one remaining difference: v6 declares `listen` with a
// `delta` on the update, which history@5 does not report and the component
// router never reads — it only forwards `action` and `location` into state.
const history = Object.assign(browserHistory, {
	createURL,
	encodeLocation(to: To): Path {
		const url = createURL(to);
		return { pathname: url.pathname, search: url.search, hash: url.hash };
	},
}) as unknown as HistoryRouterProps['history'] & Pick<BrowserHistory, 'block'>;

let inAppPushCount = 0;
history.listen(({ action }) => {
	if (action === 'PUSH') {
		inAppPushCount += 1;
	}
});

export const hasInAppHistory = (): boolean => inAppPushCount > 0;

export default history;
