import { recordBlockedNavigation } from './blockedNavigationStore';
import {
	isBlockableHref,
	navigateWithinPage,
	toStoryLocation,
} from './pageScope';

/**
 * Takes over the navigations that never reach the story's history: plain anchors
 * and `window.open` (used by `useSafeNavigate` for `newTab`). An anchor staying
 * on the story's page is applied, because letting the browser follow it would
 * navigate the iframe away and unmount the story. Anything else is reported as
 * blocked. Returns the teardown.
 */
export const interceptExternalNavigation = (): (() => void) => {
	const onClick = (event: MouseEvent): void => {
		const target = event.target as Element | null;
		const anchor = target?.closest?.('a[href]');

		if (!anchor) {
			return;
		}

		const href = anchor.getAttribute('href') ?? '';

		if (!isBlockableHref(href)) {
			return;
		}

		// Ahead of react-router's own `Link` handler, which skips a click that is
		// already handled, so an in-page link is never pushed twice.
		event.preventDefault();

		const to = toStoryLocation(href, window.location.href);

		if (to && navigateWithinPage(to)) {
			return;
		}

		recordBlockedNavigation('link', href);
	};

	document.addEventListener('click', onClick, true);

	const originalOpen = window.open;
	window.open = (url?: string | URL): null => {
		recordBlockedNavigation('window.open', String(url ?? ''));
		return null;
	};

	return (): void => {
		document.removeEventListener('click', onClick, true);
		window.open = originalOpen;
	};
};
