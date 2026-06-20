import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { ENVIRONMENT } from 'constants/env';
import { getBaseUrl } from 'utils/basePath';

/**
 * Resolves the SigNoz instance URL sent to the AI Assistant backend via the
 * `X-SigNoz-URL` header. Resolution order:
 *
 *   1. `ACTIVE_SIGNOZ_INSTANCE_URL` localStorage override (cloud instance switcher).
 *   2. `ENVIRONMENT.baseURL` — the build-time absolute endpoint
 *      (`VITE_FRONTEND_API_ENDPOINT`). Non-empty on SigNoz Cloud builds.
 *   3. `getBaseUrl()` (origin + base path) — fallback for self-hosted builds.
 *
 * Decision (self-hosted fallback to the browser's current URL):
 * Self-hosted builds ship with `VITE_FRONTEND_API_ENDPOINT` unset because the
 * frontend talks to its backend over relative paths, so `ENVIRONMENT.baseURL`
 * is an empty string. That previously caused `X-SigNoz-URL` to be sent empty,
 * which the AI backend rejects (`missing_signoz_url` / `invalid_signoz_url`)
 * rather than treating as "omitted". We deliberately fall back to the URL the
 * user is actually accessing the instance from so the header is always
 * populated. We use `getBaseUrl()` rather than raw `window.location.origin`
 * because a self-hosted instance may be served under a base path (e.g.
 * `https://host/signoz`); the backend needs that full base to reach the API.
 *
 * Known tradeoff: this reflects the *browser's* view of the instance. For
 * deployments where the instance is not reachable from the cloud AI backend at
 * that URL (air-gapped, internal-only DNS, private IPs, behind a reverse proxy
 * on a different external host), it will be unreachable and the AI backend may
 * fail to query the instance. Those deployments must set an explicit,
 * externally reachable URL via the localStorage override. A first-class admin
 * config for the public instance URL is the proper long-term fix; this fallback
 * is the pragmatic default until that exists.
 */
export function getSigNozInstanceUrl(): string {
	const fromStorage = getLocalStorageApi(
		LOCALSTORAGE.ACTIVE_SIGNOZ_INSTANCE_URL,
	);

	if (typeof fromStorage === 'string' && fromStorage.trim().length > 0) {
		return fromStorage;
	}

	if (ENVIRONMENT.baseURL) {
		return ENVIRONMENT.baseURL;
	}

	return getBaseUrl();
}

export function setSigNozInstanceUrl(url: string | null | undefined): void {
	const next = (url ?? '').trim();

	if (!next) {
		return;
	}

	setLocalStorageApi(LOCALSTORAGE.ACTIVE_SIGNOZ_INSTANCE_URL, next);
}
