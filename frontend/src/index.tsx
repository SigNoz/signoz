import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware, compose } from "redux";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import thunk from "redux-thunk";
// import { NavLink, BrowserRouter as Router,  Route, Switch  } from 'react-router-dom';

import AppWrapper from "./components/AppWrapper";
import "./assets/index.css";
import { reducers } from "./reducers";
// import Signup from './components/Signup';
// @ts-ignore
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(reducers, composeEnhancers(applyMiddleware(thunk)));

const themes = {
	dark: `${process.env.PUBLIC_URL}/dark-theme.css`,
	light: `${process.env.PUBLIC_URL}/light-theme.css`,
};

ReactDOM.render(
	<Provider store={store}>
		<React.StrictMode>
			<ThemeSwitcherProvider themeMap={themes} defaultTheme="dark">
				<AppWrapper />
				{/* <App /> */}
			</ThemeSwitcherProvider>
		</React.StrictMode>
	</Provider>,
	document.querySelector("#root"),
);
