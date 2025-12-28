import {
	applyMiddleware,
	compose,
	legacy_createStore as createStore,
} from 'redux';
import thunk, { ThunkMiddleware } from 'redux-thunk';
import AppActions from 'types/actions';

import reducers, { AppState } from './reducers';

const composeEnhancers =
	(window && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

const store = createStore(
	reducers,
	composeEnhancers(
		applyMiddleware(thunk as ThunkMiddleware<AppState, AppActions>),
	),
);

export type AppDispatch = typeof store.dispatch;

if (window !== undefined && process.env.NODE_ENV === 'development') {
	window.store = store;
}

export default store;
