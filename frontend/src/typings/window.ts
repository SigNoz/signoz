import { compose, Store } from 'redux';

type ClarityType<T> = (...args: string[]) => T;

declare global {
	interface Window {
		store: Store;
		clarity: ClarityType<string>;
		analytics: Record<string, any>;
		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
	}
}

export {};
