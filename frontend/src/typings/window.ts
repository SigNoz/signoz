import { compose, Store } from 'redux';

declare global {
	interface Window {
		store: Store;
		Intercom: any;
		Appcues: Record<string, any>;
		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
	}
}

export {};
