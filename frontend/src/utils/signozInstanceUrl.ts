import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { ENVIRONMENT } from 'constants/env';

export function getSigNozInstanceUrl(): string {
	const fromStorage = getLocalStorageApi(
		LOCALSTORAGE.ACTIVE_SIGNOZ_INSTANCE_URL,
	);

	if (typeof fromStorage === 'string' && fromStorage.trim().length > 0) {
		return fromStorage;
	}

	return ENVIRONMENT.baseURL;
}

export function setSigNozInstanceUrl(url: string | null | undefined): void {
	const next = (url ?? '').trim();

	if (!next) {
		return;
	}

	setLocalStorageApi(LOCALSTORAGE.ACTIVE_SIGNOZ_INSTANCE_URL, next);
}
