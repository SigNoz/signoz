import Cypress from 'cypress';
import { compose, Store } from 'redux';

declare global {
	interface Window {
		store: Store;
		Cypress: typeof Cypress;
		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
	}
}

export {};
