import getSessionStorageApi from 'api/browser/sessionstorage/get';
import setSessionStorageApi from 'api/browser/sessionstorage/set';
import { SESSIONSTORAGE } from 'constants/sessionStorage';

type ComponentImport = () => Promise<any>;

export const lazyRetry = (componentImport: ComponentImport): Promise<any> =>
	new Promise((resolve, reject) => {
		const hasRefreshed: boolean = JSON.parse(
			getSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED) || 'false',
		);

		componentImport()
			.then((component: any) => {
				setSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'false');
				resolve(component);
			})
			.catch((error: Error) => {
				// A stale chunk reference right after a deploy is expected and self-healing:
				// one reload pulls a fresh index.html with the new hashed asset names. That
				// reload can only be once-only if the flag persists, so a storage write that
				// fails (sessionStorage blocked) has to report rather than reload forever.
				const canReload =
					!hasRefreshed &&
					setSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'true');

				if (!canReload) {
					reject(error);

					return;
				}

				window.location.reload();

				// Deliberately settle nothing here: the Suspense fallback stays on screen
				// until the page unloads, where rejecting would flash the error boundary for a
				// failure that recovers on its own.
			});
	});
