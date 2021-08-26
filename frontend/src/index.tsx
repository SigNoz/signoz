import 'assets/index.css';

import AppRoutes from 'AppRoutes';
import React from 'react';
import { ThemeSwitcherProvider } from 'react-css-theme-switcher';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import store from 'store';
import themes from 'themes';

ReactDOM.render(
	<Provider store={store}>
		<React.StrictMode>
			<ThemeSwitcherProvider themeMap={themes} defaultTheme="dark">
				<AppRoutes />
			</ThemeSwitcherProvider>
		</React.StrictMode>
	</Provider>,
	document.querySelector('#root'),
);
