import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import store from "Src/store";
import AppRouter from "Src/AppRoutes";
import "Src/assets/index.css";
import themes from "Src/themes";

ReactDOM.render(
	<Provider store={store}>
		<React.StrictMode>
			<ThemeSwitcherProvider themeMap={themes} defaultTheme="dark">
				<AppRouter />
			</ThemeSwitcherProvider>
		</React.StrictMode>
	</Provider>,
	document.querySelector("#root"),
);
