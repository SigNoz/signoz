import { compose, Store } from 'redux';

declare global {
	interface Window {
		store: Store;
		pylon: any;
		analytics: Record<string, any>;
		cioanalytics: Record<string, any>;
		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
	}
}

export {};
