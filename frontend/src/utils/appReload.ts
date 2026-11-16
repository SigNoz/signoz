import getSessionStorageApi from 'api/browser/sessionstorage/get';
import removeSessionStorageApi from 'api/browser/sessionstorage/remove';
import setSessionStorageApi from 'api/browser/sessionstorage/set';
import { SESSIONSTORAGE } from 'constants/sessionStorage';

export interface AppReload {
	reason: 'refresh-clicked' | 'navigation' | 'chunk-load-failed';
	detail: string;
}

export interface RecordedAppReload extends AppReload {
	fromVersion?: string;
}

export function markAppReload(reload: AppReload): boolean {
	const recorded: RecordedAppReload = {
		...reload,
		fromVersion: process.env.VERSION,
	};
	return setSessionStorageApi(
		SESSIONSTORAGE.APP_RELOAD,
		JSON.stringify(recorded),
	);
}

export function consumeAppReload(): RecordedAppReload | null {
	const stored = getSessionStorageApi(SESSIONSTORAGE.APP_RELOAD);
	if (!stored) {
		return null;
	}
	removeSessionStorageApi(SESSIONSTORAGE.APP_RELOAD);
	try {
		return JSON.parse(stored) as RecordedAppReload;
	} catch {
		return null;
	}
}

export function reloadApp(reload: AppReload, href?: string): void {
	markAppReload(reload);
	if (href) {
		window.location.assign(href);
	} else {
		window.location.reload();
	}
}
