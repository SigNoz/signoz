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
				// the reload pulls a fresh index.html with the new hashed asset names.
				// The promise is deliberately left unsettled so the Suspense fallback stays
				// on screen until the page unloads — settling it would flash the error
				// boundary and report a failure that recovers on its own.
				if (!hasRefreshed) {
					setSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'true');

					window.location.reload();

					return;
				}

				// The reload already happened and the chunk still will not load, so this is
				// a real failure: surface it to the error boundary and report it.
				reject(error);
			});
	});
