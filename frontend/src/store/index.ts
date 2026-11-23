// eslint-disable-next-line no-restricted-imports
import {
	applyMiddleware,
	compose,
	legacy_createStore as createStore,
} from 'redux';
import type { ThunkMiddleware } from 'redux-thunk';
import thunk from 'redux-thunk';
import type AppActions from 'types/actions';

import type { AppState } from './reducers';
import reducers from './reducers';

const composeEnhancers =
	(window && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

const store = createStore(
	reducers,
	composeEnhancers(
		applyMiddleware(thunk as ThunkMiddleware<AppState, AppActions>),
	),
);

export type AppDispatch = typeof store.dispatch;

if (window !== undefined) {
	window.store = store;
}

export default store;
