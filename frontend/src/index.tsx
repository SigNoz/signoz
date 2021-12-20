import './wdyr';
import 'assets/index.css';

import AppRoutes from 'AppRoutes';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import reportWebVitals from 'reportWebVitals';
import store from 'store';
import ErrorBoundary from 'container/ErrorBoundary';

if (process.env.NODE_ENV === 'development') {
	reportWebVitals(console.log);
}

ReactDOM.render(
	<ErrorBoundary>
		<Provider store={store}>
			<React.StrictMode>
				<AppRoutes />
			</React.StrictMode>
		</Provider>
	</ErrorBoundary>,
	document.querySelector('#root'),
);

// setting the Store for the cypress
if (window.Cypress) {
	window.store = store;
}
