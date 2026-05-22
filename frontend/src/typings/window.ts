// eslint-disable-next-line no-restricted-imports
import { compose, Store } from 'redux';
import type { SignozBootSettings } from 'utils/bootData';

declare global {
	interface Window {
		store: Store;
		pylon: any;
		Appcues: Record<string, any>;
		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
		signozBootData?: { settings?: Partial<SignozBootSettings> };
	}
}

export {};
