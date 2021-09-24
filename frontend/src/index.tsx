import 'assets/index.css';

import AppRoutes from 'AppRoutes';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import store from 'store';

ReactDOM.render(
	<Provider store={store}>
		<React.StrictMode>
			<AppRoutes />
		</React.StrictMode>
	</Provider>,
	document.querySelector('#root'),
);
