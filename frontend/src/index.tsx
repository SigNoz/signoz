import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import store from "store";
import AppRoutes from "AppRoutes";
import "assets/index.css";
import themes from "themes";

ReactDOM.render(
	<Provider store={store}>
		<React.StrictMode>
			<ThemeSwitcherProvider themeMap={themes} defaultTheme="dark">
				<AppRoutes />
			</ThemeSwitcherProvider>
		</React.StrictMode>
	</Provider>,
	document.querySelector("#root"),
);
