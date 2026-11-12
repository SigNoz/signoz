import { useLayoutEffect } from 'react';
import { theme } from 'antd';

import { getAntdThemeCssVariables } from './antdTokenVariables';

/**
 * Publishes the antd theme tokens periscope components read as CSS variables
 * on `<html>`, so they follow the theme as antd's own components do. Must sit
 * inside `ConfigProvider`; renders nothing.
 */
function AntdThemeCssVariables(): null {
	const { token } = theme.useToken();

	useLayoutEffect(() => {
		const { style } = document.documentElement;
		const variables = Object.entries(getAntdThemeCssVariables(token));
		variables.forEach(([name, value]) => style.setProperty(name, value));
		return (): void => {
			variables.forEach(([name]) => style.removeProperty(name));
		};
	}, [token]);

	return null;
}

export default AntdThemeCssVariables;
