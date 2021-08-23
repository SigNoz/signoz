import { applyMiddleware, compose,createStore } from 'redux';
import thunk from 'redux-thunk';

import reducers from './reducers';

const composeEnhancers =
	(window && (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;
const store = createStore(reducers, composeEnhancers(applyMiddleware(thunk)));

export default store;
