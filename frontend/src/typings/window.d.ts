import Cypress from 'cypress';
import { Store } from 'redux';

declare global {
	interface Window {
		store: Store;
		Cypress: typeof Cypress;
	}
}

export {};
