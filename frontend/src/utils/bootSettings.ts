import type { WebSettings } from 'types/generated/webSettings';

/**
 * Returns the web settings injected by the backend into index.html at runtime
 * (window.signozBootData.settings), or null when unavailable.
 */
export function getWebSettings(): WebSettings | null {
	return window.signozBootData?.settings ?? null;
}
