import { applyMiddleware, compose, createStore } from 'redux';
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

export default store;
