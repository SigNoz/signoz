import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import thunk  from 'redux-thunk';


import App from './components/App';
import './assets/index.css';
import { reducers } from './reducers';

const store = createStore(reducers, applyMiddleware(thunk))

const themes = {
  dark: `${process.env.PUBLIC_URL}/dark-theme.css`, 
  light: `${process.env.PUBLIC_URL}/light-theme.css`,
};

ReactDOM.render(
  <Provider store={store}>
    <React.StrictMode>
        <ThemeSwitcherProvider themeMap={themes} defaultTheme="dark">
            <App />
        </ThemeSwitcherProvider>
    </React.StrictMode>
  </Provider>,
  document.querySelector('#root')
);