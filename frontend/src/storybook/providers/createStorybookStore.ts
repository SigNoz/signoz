// eslint-disable-next-line no-restricted-imports
import {
	applyMiddleware,
	legacy_createStore as createStore,
	Store,
} from 'redux';
import thunk from 'redux-thunk';
import reducers, { AppState } from 'store/reducers';

/**
 * A fresh store per story, seeded with the real reducers so dispatches keep
 * working, unlike the mock store used in jest. Nothing leaks between stories.
 */
export const createStorybookStore = (reduxState?: Partial<AppState>): Store =>
	createStore(
		reducers,
		reduxState as ReturnType<typeof reducers> | undefined,
		applyMiddleware(thunk),
	);
