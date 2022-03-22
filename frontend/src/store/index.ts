import { applyMiddleware, compose, createStore } from 'redux';
import type { ThunkMiddleware } from 'redux-thunk';
import thunk from 'redux-thunk';

import reducers, { AppState } from './reducers';

const composeEnhancers =
	(window && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

const store = createStore(
	reducers,
	// @TODO Add Type for AppActions also
	composeEnhancers(applyMiddleware(thunk as ThunkMiddleware<AppState>)),
);

export default store;
