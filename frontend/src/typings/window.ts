import { compose, Store } from 'redux';

declare global {
	interface Window {
		store: Store;

		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
	}
}

export {};
