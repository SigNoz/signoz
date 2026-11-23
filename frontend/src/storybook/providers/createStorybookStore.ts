// eslint-disable-next-line no-restricted-imports
import type { Store } from 'redux';
import { applyMiddleware, legacy_createStore as createStore } from 'redux';
import thunk from 'redux-thunk';
import type { AppState } from 'store/reducers';
import reducers from 'store/reducers';

/**
 * A fresh store per story, seeded with the real reducers so dispatches keep
 * working, unlike the mock store used in jest. Nothing leaks between stories.
 * The modules that read the redux singleton directly are pointed at it too,
 * through `mocks/store.mock.ts`.
 */
export const createStorybookStore = (reduxState?: Partial<AppState>): Store =>
	createStore(
		reducers,
		reduxState as ReturnType<typeof reducers> | undefined,
		applyMiddleware(thunk),
	);
