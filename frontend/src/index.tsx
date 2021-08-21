import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import store from "store";
import AppWrapper from "modules/AppWrapper";
import "assets/index.css";
import { BrowserRouter as Router } from "react-router-dom";
import themes from "themes";

ReactDOM.render(
	<Provider store={store}>
		<React.StrictMode>
			<ThemeSwitcherProvider themeMap={themes} defaultTheme="dark">
				<Router basename="/">
					<AppWrapper />
				</Router>
			</ThemeSwitcherProvider>
		</React.StrictMode>
	</Provider>,
	document.querySelector("#root"),
);
