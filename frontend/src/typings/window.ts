// eslint-disable-next-line no-restricted-imports
import { compose, Store } from 'redux';
import type { WebSettings } from 'types/generated/webSettings';

declare global {
	interface Window {
		store: Store;
		pylon: any;
		Appcues: Record<string, any>;
		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
		signozBootData?: { settings: WebSettings | null };
	}
}

export {};
