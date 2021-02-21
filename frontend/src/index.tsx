import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware, compose } from "redux";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import thunk from "redux-thunk";
// import { NavLink, BrowserRouter as Router,  Route, Switch  } from 'react-router-dom';
import { Auth0Provider } from "@auth0/auth0-react";

import AppWrapper from "Src/components/AppWrapper";
import "Src/assets/index.css";
import { reducers } from "./reducers";
import {BrowserRouter as Router} from "react-router-dom";
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "./constants/env";
// import Signup from './components/Signup';
// @ts-ignore
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(reducers, composeEnhancers(applyMiddleware(thunk)));

const themes = {
	dark: `/dark-theme.css`,
	light: `/light-theme.css`,
};

ReactDOM.render(
	<Provider store={store}>
		<React.StrictMode>
			<ThemeSwitcherProvider themeMap={themes} defaultTheme="dark">
				<Router basename="/">
					<AppWrapper />
				</Router>
			</ThemeSwitcherProvider>
		</React.StrictMode>
	</Provider>
    ,
	document.querySelector("#root"),
);
