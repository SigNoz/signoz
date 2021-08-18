import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import store from "Src/store";
import AppWrapper from "Src/AppRoutes";
import "Src/assets/index.css";
import themes from "Src/themes";

ReactDOM.render(
	<Provider store={store}>
		<React.StrictMode>
			<ThemeSwitcherProvider themeMap={themes} defaultTheme="dark">
				<AppWrapper />
			</ThemeSwitcherProvider>
		</React.StrictMode>
	</Provider>,
	document.querySelector("#root"),
);
